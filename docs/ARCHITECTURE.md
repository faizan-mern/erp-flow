# ERPFlow — System Architecture

---

## 1. System Overview

ERPFlow is a multi-tenant SaaS ERP platform where multiple companies register and manage their operations through a single shared platform. Each company's data is fully isolated at the database row level. The system supports four roles, three core ERP modules (HR, Expenses, Inventory), an AI assistant with live data tool-calling, real-time Socket.IO notifications, and an analytics dashboard backed by Redis-cached aggregation queries.

**Run the full stack with one command:**
```bash
docker compose up --build
# Frontend:  http://localhost:3000
# Backend:   http://localhost:5000
# API Docs:  http://localhost:5000/api/docs
```

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    docker compose up --build                     │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────┐                         │
│  │  Next.js 16  │   │  Express.js API  │                         │
│  │  port 3000   │   │  port 5000       │                         │
│  │  (web)       │   │  (server)        │                         │
│  └──────┬───────┘   └────────┬────────┘                         │
│         │                    │  ┌──────────┐  ┌────────────┐    │
│         │                    ├─▶│PostgreSQL│  │   Redis    │    │
│  ┌──────▼────────────────────▼┐ │ port5432 │  │  port6379  │    │
│  │   Nginx  (port 80)         │ └──────────┘  └────────────┘    │
│  │   Reverse Proxy            │                                  │
│  └────────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

**External services used at runtime:**
| Service | Purpose | Free Tier |
|---|---|---|
| Cloudinary | Invoice PDF/image upload | 25 GB free |
| OpenRouter | AI model routing (OpenAI-compatible API) | Free models available |

---

## 3. Multi-Tenancy Design

**Strategy: Shared database with row-level tenant isolation**

Every tenant-scoped table has a `companyId` foreign key. The auth middleware injects `companyId` from the JWT into `req.user` on every request. No controller or service ever trusts a `companyId` from the request body — it always comes from the verified token.

```
Registration:
  Company registers → Company row created → User row created (role: COMPANY_ADMIN)
  → JWT payload: { userId, companyId, role }

Every authenticated request:
  JWT verified → req.user = { userId, companyId, role }
  → Repository: WHERE id = ? AND companyId = req.user.companyId
  → Company A user physically cannot read Company B data
```

**Why shared DB over separate DB per tenant:**
- Industry standard at this scale (Notion, Linear, Vercel all use this approach)
- Zero operational overhead — no per-tenant migrations
- Row-level isolation is the interview-relevant architecture decision

**Enforcement points (defense in depth):**
1. Auth middleware — extracts and verifies `companyId` from JWT
2. Repository layer — every Prisma query includes `companyId` in the `where` clause
3. Route middleware — `requireRole()` rejects mismatched roles before service code runs

---

## 4. Authentication & Authorization Flow

```
REGISTER:
  POST /api/v1/auth/register
  → Zod validates input
  → Check slug uniqueness
  → Create Company row
  → Hash password (bcrypt, 12 rounds)
  → Create User row (role: COMPANY_ADMIN)
  → Seed 7 default expense categories
  → Issue accessToken (JWT, 2 hr) + refreshToken (JWT, 7 days, httpOnly cookie)
  → logActivity(REGISTER)

AUTHENTICATED REQUEST:
  Authorization: Bearer <accessToken>
  → auth.middleware.ts verifies token, attaches req.user
  → role.middleware.ts (optional) checks req.user.role

TOKEN REFRESH:
  accessToken expires → POST /api/v1/auth/refresh
  → Server reads refreshToken from httpOnly cookie
  → Verifies token exists in DB and is not expired
  → Issues new accessToken + rotates refreshToken (old one deleted)
  → Rotation: a stolen refresh token can only be used once

LOGOUT:
  → Looks up user from token before deleting (for activity log attribution)
  → Deletes refresh token from DB
  → Clears cookie
  → logActivity(LOGOUT)
```

**Role hierarchy:**
```
SUPER_ADMIN     → platform-level: view all tenants, suspend/activate companies, platform stats
COMPANY_ADMIN   → full access within their company
MANAGER         → can approve expenses, record stock movements, view all employees
EMPLOYEE        → can submit expenses, view own attendance, own profile only
```

---

## 5. Module Breakdown (Backend)

Each module follows the same 5-layer pattern. No layer is skipped.

```
Request → routes.ts → validator.ts → controller.ts → service.ts → repository.ts → DB
```

| Layer | Responsibility |
|---|---|
| `routes.ts` | Maps HTTP verbs + paths to controller handlers, applies middleware |
| `validator.ts` | Zod schemas — request rejected here before any business logic |
| `controller.ts` | Reads `req`, calls service, sends `res`. Zero business logic. |
| `service.ts` | Business rules, decisions, orchestration. Calls repositories. |
| `repository.ts` | Only layer that touches Prisma. If DB changes, only this file changes. |

**All modules:**
```
modules/
├── auth/           register · login · logout · refresh · verify-email · forgot/reset password
├── employee/       CRUD · attendance check-in/out · history · soft delete
├── expense/        CRUD · approve/reject state machine · AI categorization · PDF invoice · analytics
├── user/           invite user · list team · change role (COMPANY_ADMIN only)
├── product/        CRUD · stock movements (IN/OUT/ADJUSTMENT) · low-stock count · deactivate
├── ai/             chat CRUD · message send · tool-call orchestration · title auto-update
├── dashboard/      8-query aggregation · Redis cached stats · recent activity feed
├── notification/   list · mark-all-read · unread count
└── super-admin/    list all companies · platform stats · suspend/activate tenants
```

---

## 6. Data Flow — Key ERP Workflows

### 6A. Expense Submit → AI Categorize → Manager Approve → Notification

```
[EMPLOYEE]
  POST /api/v1/expenses
  Body: { amount, title, date, notes, invoiceUrl? }
  │
  ├─ Zod validates input
  ├─ expense.repository.createExpense() → DB row (status: PENDING)
  ├─ logActivity(CREATE_EXPENSE)
  │
  ├─ [Parallel] Promise.race(
  │     openRouterClient.categorize(title, amount),  ← 4s timeout
  │     delay(4000)
  │  )
  │  If AI responds in time → update expense.categoryId inline
  │  If timeout → AI continues in background, category updates asynchronously
  │
  └─ Response: 201 Created

[MANAGER]
  POST /api/v1/expenses/:id/approve
  │
  ├─ requireRole(COMPANY_ADMIN, MANAGER)
  ├─ Segregation of duties: expense.employeeId !== req.user.employeeId
  ├─ expense.repository.updateStatus(id, APPROVED, companyId)
  ├─ notification.repository.create({ userId: expense.employee.userId, ... })
  ├─ getIO().to(`user:${userId}`).emit('notification:new', payload)   ← Socket.IO
  └─ getIO().to(`company:${companyId}`).emit('dashboard:refresh')
```

### 6B. Stock Movement → Live Inventory Sync

```
[MANAGER/ADMIN]
  POST /api/v1/products/:id/movements
  Body: { type: 'OUT', quantity: 10, reason: 'Shipped to client' }
  │
  ├─ requireRole(COMPANY_ADMIN, MANAGER)
  ├─ product.repository.recordMovement() — Prisma transaction with row lock:
  │     BEGIN
  │       SELECT product WHERE id=? AND companyId=? FOR UPDATE   ← row lock
  │       IF type=OUT AND product.quantity < qty → throw 409
  │       UPDATE product.quantity
  │       CREATE stock_movement row (immutable ledger)
  │     COMMIT
  ├─ logActivity(STOCK_MOVEMENT)
  ├─ getIO().to(`company:${companyId}`).emit('inventory:updated', { productId })
  └─ getIO().to(`company:${companyId}`).emit('dashboard:refresh')

[ALL USERS in same company]
  Socket event → queryClient.invalidateQueries(['products', productId])
  → TanStack Query refetches → UI updates without page reload
```

### 6C. AI Assistant — Tool Call Pattern

```
[ANY USER]
  POST /api/v1/ai/chats/:chatId/messages
  Body: { content: "Which products are low on stock?" }
  │
  ├─ Load chat history (last 20 messages for context)
  ├─ Build system prompt:
  │     Company: Karachi Textile Works | Date: 2026-05-19 | Role: MANAGER
  │     Available tools:
  │       - getEmployeeCount()         ← total active employees
  │       - getLowStockCount()         ← products below threshold
  │       - getPendingExpenseTotals()  ← count + sum of PENDING expenses
  │
  ├─ Send to OpenRouter (openai/gpt-oss-120b:free)
  │
  ├─ Model responds with tool call:
  │     { tool_calls: [{ name: "getLowStockProducts", arguments: {} }] }
  │
  ├─ Backend:
  │     1. Validates tool name against whitelist
  │     2. Validates arguments with Zod
  │     3. Calls product.repository.getLowStockProducts(companyId)   ← tenant-scoped
  │     4. Feeds tool result back to model
  │
  ├─ Model generates plain-English answer using tool data
  ├─ Save user message + AI response to ai_messages table
  ├─ If first message → auto-update chat title (first 50 chars of user message)
  └─ Response: { message: { role: 'assistant', content: '...' } }

Security: AI never writes SQL. It only calls a closed whitelist of read-only
          repository functions. Every function is scoped by companyId from the JWT.
```

---

## 7. Real-Time Architecture (Socket.IO)

```
CONNECTION:
  Client connects with auth: { token: accessToken }
  → Handshake middleware verifies JWT
  → socket.join(`company:${companyId}`)   ← broadcast room
  → socket.join(`user:${userId}`)         ← personal notifications

ROOMS:
  company:${companyId}  → inventory updates, dashboard refresh (all company users)
  user:${userId}        → personal notifications (expense approved/rejected)

EVENTS (server → client):
  notification:new    → Zustand: addNotification + incrementUnread
  inventory:updated   → TanStack: invalidate ['products', productId]
  dashboard:refresh   → TanStack: invalidate ['dashboard-stats']
```

---

## 8. Database Design

**14 tables across 5 domains:**

```
IDENTITY DOMAIN
  Company       id · name · slug · plan · isActive
  User          id · companyId · email · passwordHash · role · isVerified
  RefreshToken  id · userId · tokenHash · expiresAt · deviceInfo

EMPLOYEE DOMAIN
  Employee      id · companyId · userId? · firstName · lastName · position · department
                salary · hireDate · isActive
  Attendance    id · employeeId · companyId · date · checkIn · checkOut · status

ERP DOMAIN
  Expense       id · companyId · employeeId · categoryId · amount · currency
                status · rejectReason · invoiceUrl · approvedById
  ExpenseCategory  id · companyId · name · color
  Product       id · companyId · name · sku · quantity · unitPrice
                lowStockThreshold · warehouseLocation · isActive
  StockMovement id · productId · companyId · type · quantity
                previousQuantity · newQuantity · reason · performedById

AI DOMAIN
  AiChat        id · companyId · userId · title
  AiMessage     id · chatId · role · content · metadata

SYSTEM DOMAIN
  Notification  id · userId · companyId · title · message · type · isRead
  ActivityLog   id · userId · companyId · action · resourceType · resourceId
                details · ipAddress
  Report        id · companyId · generatedById · type · title · data
```

**Key design decisions:**
- Every tenant table has `companyId` (NOT NULL) — enforced at DB level, not just app level
- Soft deletes everywhere (`isActive = false`) — never hard-delete business records
- `StockMovement` is an immutable append-only ledger — `previousQuantity` + `newQuantity` stored so no replay needed
- `Expense.status` state machine: `PENDING → APPROVED | REJECTED` — no reverse transitions
- `ActivityLog.ipAddress` covers the "device tracking" requirement
- `Decimal` for all money fields — Float has rounding errors (`0.1 + 0.2 ≠ 0.3`)

**Indexes (critical for multi-tenant performance):**
```sql
@@index([companyId])                        -- Employee, Expense, Product, Notification, ActivityLog
@@index([companyId, status])                -- Expense (filter pending/approved/rejected)
@@index([employeeId, date])                 -- Attendance (history queries)
@@index([companyId, createdAt])             -- ActivityLog (recent activity feed)
@@index([companyId, userId, isRead])        -- Notification (unread count)
@@unique([email, companyId])                -- User (same email allowed across companies)
@@unique([companyId, sku])                  -- Product (SKU unique within a company)
```

Full visual ERD: [`docs/SCHEMA_DIAGRAM.md`](SCHEMA_DIAGRAM.md)

---

## 9. Frontend Architecture

```
apps/web/src/
├── app/
│   ├── (auth)/              ← no sidebar layout
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   └── (dashboard)/         ← sidebar + header layout
│       ├── layout.tsx        ← useSocket() + NotificationBell + auth guard
│       ├── dashboard/        ← stat cards + Recharts charts + activity feed
│       ├── employees/        ← CRUD + attendance tab
│       ├── expenses/         ← CRUD + approve/reject + analytics charts
│       ├── inventory/        ← CRUD + stock movements + low-stock banner
│       ├── ai-assistant/     ← chat sidebar + message thread + tool results
│       ├── team/             ← user invite + role management (COMPANY_ADMIN)
│       └── profile/          ← employee self-view
│
├── components/ui/           ← design system primitives
│   Button · Input · Field · Badge · Card · Select
│   PageHeader · EmptyState · PageTransition · Skeleton
│   NotificationBell · Toast · PasswordInput
│
├── store/                   ← Zustand (global, persists across navigations)
│   auth.store.ts            — user session, accessToken, companySlug
│   notification.store.ts    — unreadCount, notifications[]
│   toast.store.ts           — toast queue
│
├── hooks/
│   use-socket.ts            — connects on login, disconnects on logout, 3 event handlers
│
└── lib/                     ← typed API clients (one file per module)
    api.ts                   — base axios client with JWT interceptor + auto-refresh
    employees · expenses · products · ai · dashboard · notifications · users
```

**State management split:**
- `Zustand` — auth session, notifications, toasts (global, persists across navigations)
- `TanStack Query` — all server data (cached, stale-while-revalidate, auto-refetch on socket events)

**Design system (Tailwind v4 `@theme {}`):**
```css
--color-primary      #0f766e   → bg-primary, text-primary, border-primary
--color-canvas       #f8fafc   → page backgrounds
--color-surface      #ffffff   → cards
--color-muted        #64748b   → secondary text
--color-border       #e2e8f0   → dividers
--color-strong       #0f172a   → headings
--color-danger-soft  #fef2f2   → destructive action backgrounds
```
All color tokens auto-generate `bg-*`, `text-*`, `border-*`, `ring-*` utility classes. No hardcoded hex values in the codebase.

---

## 10. Performance Optimizations

| Optimization | Where Applied |
|---|---|
| Redis cache (60s TTL) | Dashboard stats — avoids 8 parallel DB queries on every load |
| Redis cache (30s TTL) | AI tool results — repeat company queries within 30s hit cache |
| `Promise.all()` parallel queries | Dashboard (8 queries), expense analytics, low-stock filter |
| Pagination everywhere | All list endpoints — `skip/take` with total count returned |
| Debounced search (300ms) | All search inputs — no query on every keystroke |
| TanStack Query cache | Server state cached client-side, stale-while-revalidate |
| Row locking (`SELECT FOR UPDATE`) | Stock movement transaction — prevents negative inventory race condition |
| API rate limiting | `express-rate-limit`: 100 req/15min global, 20 msg/10min on AI endpoint |

---

## 11. Security Implementation

| Requirement | Implementation |
|---|---|
| XSS protection | Access token in memory only (Zustand, not localStorage). Refresh token in `httpOnly` cookie. |
| CSRF protection | `sameSite: 'strict'` (dev) / `sameSite: 'none' + secure` (prod cross-origin) |
| SQL injection | Prisma ORM with parameterized queries. Raw SQL uses `Prisma.sql` tagged templates only. |
| Helmet.js | `helmet()` middleware on all Express routes |
| Rate limiting | Global 100 req/15min + per-endpoint AI limit (20 msg/10min) |
| Audit trail | `ActivityLog` table: every CRUD + auth action recorded with `userId + ipAddress` |
| Tenant isolation | `companyId` enforced at middleware + repository — never trusted from request body |
| Role protection | `requireRole()` middleware on all write/delete routes |
| Refresh token rotation | Each use issues a new token and deletes the old — stolen token usable once only |
| Input validation | Zod schemas at controller boundary — all inputs parsed before service layer |
| Segregation of duties | Expense submitter cannot approve/reject their own expense (enforced at service layer) |

---

## 12. DevOps

### Docker Compose (one command)
```bash
docker compose up --build
# nginx · next.js web · express server · postgresql · redis
# Server on startup: prisma migrate deploy → node dist/app.js
```

### GitHub Actions CI
```yaml
on: push to main
jobs:
  web:    eslint + next build
  server: tsc --noEmit
```

### Environment
```
docker-compose.yml       ← full stack (all services)
docker-compose.dev.yml   ← infra only (postgres + redis for local dev with hot reload)
.env.example             ← all variables documented with safe defaults
```

---

## 13. ERP Module Workflows

### Expense Lifecycle (State Machine)
```
                    ┌─────────┐
     Employee       │ PENDING │
     submits ──────▶│         │
                    └────┬────┘
                         │  Manager reviews
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ APPROVED │         │ REJECTED │
        │          │         │(+ reason)│
        └──────────┘         └──────────┘
         Terminal                Terminal

Rules:
  - Submitter cannot approve/reject their own expense (segregation of duties)
  - Only MANAGER / COMPANY_ADMIN can approve or reject
  - Once APPROVED or REJECTED, status cannot revert to PENDING
  - Rejection requires a written reason (persisted to expense.rejectReason)
  - Approval triggers a real-time Socket.IO notification to the submitter
```

### Inventory Stock Movement
```
Product created (quantity = initial stock)
  │
  ▼
Stock IN  (+qty)  → Restocking, purchase, return
Stock OUT (-qty)  → Sale, shipment, usage
ADJUSTMENT (±qty) → Audit correction, write-off

Rules:
  - OUT that would result in quantity < 0 → blocked (409, row-locked transaction)
  - Movement on deactivated product → blocked (409)
  - Every movement creates an immutable StockMovement row (full audit ledger)
  - Low stock: quantity ≤ lowStockThreshold → banner on inventory page
  - Real-time: all company users see quantity update live via Socket.IO
```

### Employee Attendance
```
Check-in  → Attendance row created (status: PRESENT, checkIn: now)
Check-out → Attendance row updated (checkOut: now)
If check-in > 09:30 → status: LATE
Date key uses Asia/Karachi timezone — prevents UTC midnight rollover
  from creating wrong-date records
```

---

## 14. Module Dependency Map

```
                    ┌─────────────────┐
                    │      Auth        │
                    │  Company + User  │
                    └────────┬────────┘
                             │ companyId flows into every module
          ┌──────────────────┼──────────────────────┐
          │                  │                       │
   ┌──────▼──────┐   ┌───────▼──────┐   ┌───────────▼──────┐
   │  Employee   │   │   Expense    │   │    Inventory      │
   │  Module     │   │   Module     │   │    Module         │
   └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘
          │                  │                    │
          │           ┌──────▼───────────────────▼──────┐
          │           │         AI Assistant             │
          │           │  queries Employee + Expense +    │
          └──────────▶│  Inventory repository functions  │
                      └──────────────┬──────────────────┘
                                     │
                      ┌──────────────▼──────────────────┐
                      │           Dashboard              │
                      │  aggregates all 3 modules +      │
                      │  activity logs in one endpoint   │
                      └──────────────┬──────────────────┘
                                     │
                      ┌──────────────▼──────────────────┐
                      │        Real-Time Layer           │
                      │  Socket.IO broadcasts changes    │
                      │  from Expense + Inventory        │
                      │  → Notification + Dashboard      │
                      └─────────────────────────────────┘
```
