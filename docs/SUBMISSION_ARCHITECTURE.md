# ERPFlow — Architecture Submission Document

> Candidate: Faizan Shahid | Assessment: Senior Full Stack Developer (MERN + Next.js + SaaS) | Cyberify

---

## 1. System Overview

ERPFlow is a multi-tenant SaaS ERP platform where multiple companies register and manage their operations through a single shared platform. Each company's data is fully isolated. The system supports four roles, three core ERP modules, an AI assistant, real-time notifications, and an analytics dashboard.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          INTERNET                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        Nginx (Reverse Proxy) │  ← SSL termination
              │         docker container     │    rate limiting
              └──────┬───────────────┬───────┘
                     │               │
         ┌───────────▼───┐     ┌─────▼──────────────┐
         │  Next.js 16   │     │   Express.js API    │
         │  (Frontend)   │     │   (Backend)         │
         │  Vercel       │     │   Railway · port 5000│
         │  port 3000    │     │                     │
         └───────────────┘     └──────┬──────────────┘
                                      │
              ┌───────────────────────┼────────────────┐
              │                       │                │
    ┌─────────▼──────┐     ┌──────────▼──────┐  ┌──────▼──────┐
    │  PostgreSQL     │     │     Redis        │  │  Socket.IO  │
    │  Railway        │     │   Railway/Upstash│  │  (on server)│
    │  (primary DB)   │     │  cache + queues  │  │  WS upgrade │
    └─────────────────┘     └─────────────────┘  └─────────────┘
                                      │
                             ┌────────▼────────┐
                             │   BullMQ Workers │
                             │  email · notif   │
                             │  ai-categorize   │
                             └─────────────────┘
```

**External services:**
| Service | Purpose | Free Tier |
|---|---|---|
| Vercel | Next.js hosting | Yes |
| Railway | Express + PostgreSQL + Redis | $5 credit/month |
| Cloudinary | Invoice PDF/image upload | 25 GB free |
| OpenRouter | AI model routing (OpenAI-compatible) | Free models available |

---

## 3. Multi-Tenancy Design

**Strategy: Shared database with row-level tenant isolation**

Every tenant-scoped table has a `companyId` foreign key. The auth middleware injects `companyId` from the JWT into `req.user` on every request. No controller or service ever trusts a `companyId` from the request body — it always comes from the verified token.

```
Registration:
  Company registers → Company row created → User row created (role: COMPANY_ADMIN)
  → JWT payload contains: { userId, companyId, role }

Every authenticated request:
  JWT verified → req.user = { userId, companyId, role }
  → Repository layer always: WHERE id = ? AND companyId = req.user.companyId
  → Company A user physically cannot read Company B data
```

**Why shared DB over separate DB per tenant:**
- 90% of SaaS platforms at this stage use shared DB (Notion, Linear, Vercel)
- Zero operational overhead — no per-tenant migrations
- Demonstrated isolation via `companyId` is the interview-relevant architecture decision

**Tenant isolation enforcement points:**
1. Auth middleware — extracts companyId from JWT
2. Repository layer — every Prisma query includes `companyId` in the `where` clause
3. Route middleware — `requireRole()` rejects mismatched roles before service code runs

---

## 4. Authentication & Authorization Flow

```
REGISTER:
  POST /api/v1/auth/register
  Body: { companyName, slug, name, email, password }
  → Zod validates input
  → Check slug uniqueness
  → Create Company row
  → Hash password (bcrypt, 12 rounds)
  → Create User row (role: COMPANY_ADMIN)
  → Seed 7 default expense categories for the company
  → Issue accessToken (JWT, 15 min) + refreshToken (JWT, 7 days, httpOnly cookie)
  → logActivity(REGISTER)

AUTHENTICATED REQUEST:
  Header: Authorization: Bearer <accessToken>
  → auth.middleware.ts verifies token, attaches req.user
  → role.middleware.ts (optional) checks req.user.role

TOKEN REFRESH:
  accessToken expires → client calls POST /api/v1/auth/refresh
  → Server reads refreshToken from httpOnly cookie
  → Verifies token exists in DB and is not expired
  → Issues new accessToken + rotates refreshToken (old one deleted)
  → This rotation means a stolen refresh token can only be used once

LOGOUT:
  → Looks up user from token before deleting (for activity log attribution)
  → Deletes refresh token from DB
  → Clears cookie
  → logActivity(LOGOUT)
```

**Role hierarchy:**
```
SUPER_ADMIN     → platform-level (sees all companies, no row-level data)
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
├── user/           invite user · list team · change role
├── product/        CRUD · stock movements (IN/OUT/ADJUSTMENT) · low-stock count · deactivate
├── ai/             chat CRUD · message send · tool-call orchestration · title auto-update
├── dashboard/      8-query aggregation · Redis cached stats · recent activity feed
├── notification/   list · mark-all-read · unread count
└── super-admin/    list all companies · platform stats · suspend/activate tenant
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
  │     openRouterClient.categorize(title, amount),   ← 4s timeout
  │     delay(4000)
  │  )
  │  If AI responds in time → update expense.categoryId inline
  │  If timeout → BullMQ ai-categorization.queue adds job
  │              Worker runs after response, updates category in background
  │
  └─ Response: 201 Created (with or without categoryId)

[MANAGER]
  PATCH /api/v1/expenses/:id/approve
  │
  ├─ requireRole(COMPANY_ADMIN, MANAGER)
  ├─ Segregation of duties: expense.employeeId !== req.user.employeeId (can't approve own)
  ├─ expense.repository.updateStatus(id, APPROVED, companyId)
  ├─ notification.repository.create({ userId: expense.employee.userId, ... })
  ├─ getIO().to(`user:${userId}`).emit('notification:new', payload)   ← Socket.IO
  └─ getIO().to(`company:${companyId}`).emit('dashboard:refresh')     ← all tabs refresh
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
  │       UPDATE product.quantity (increment or decrement)
  │       CREATE stock_movement row
  │     COMMIT
  ├─ logActivity(STOCK_MOVEMENT)
  ├─ getIO().to(`company:${companyId}`).emit('inventory:updated', { productId })
  └─ getIO().to(`company:${companyId}`).emit('dashboard:refresh')

[ALL USERS in same company — other browser tabs]
  Socket event received → queryClient.invalidateQueries(['products', productId])
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
  │       - getExpenseTotals(period: 'month'|'week'|'year')
  │       - getLowStockProducts()
  │       - getEmployeeAttendance(range: number)
  │       - getTopExpenses(limit: number, period: string)
  │
  ├─ Send to OpenRouter (openai/gpt-oss-120b:free)
  │
  ├─ Model responds with tool call:
  │     { tool_calls: [{ name: "getLowStockProducts", arguments: {} }] }
  │
  ├─ Backend:
  │     1. Validates tool name against whitelist
  │     2. Validates arguments with Zod
  │     3. Calls product.repository.getLowStockProducts(companyId)   ← always tenant-scoped
  │     4. Feeds tool result back to model
  │
  ├─ Model generates plain-English answer using tool data
  ├─ Save user message + AI response to ai_messages table
  ├─ If first message in chat → auto-update chat title (first 50 chars)
  └─ Response: { message: { role: 'assistant', content: '...' } }

Security: The AI never writes SQL. It only calls a closed whitelist of read-only
          repository functions. Every function is scoped by companyId from the JWT.
```

---

## 7. Real-Time Architecture (Socket.IO)

```
CONNECTION:
  Client connects to ws://api-url with auth: { token: accessToken }
  → Socket.IO handshake middleware verifies JWT
  → socket.join(`company:${companyId}`)   ← company broadcast room
  → socket.join(`user:${userId}`)         ← personal notification room
  → On disconnect: Socket.IO auto-cleans room membership

ROOMS:
  company:${companyId}  — all users in a company (inventory updates, dashboard refresh)
  user:${userId}        — personal notifications (expense approved/rejected)

EVENTS (server → client):
  notification:new    → { id, title, body, type }   → Zustand: addNotification + incrementUnread
  inventory:updated   → { productId }               → TanStack: invalidate ['products', productId]
  dashboard:refresh   → {}                          → TanStack: invalidate ['dashboard-stats']
```

---

## 8. BullMQ Queue Architecture (Bonus)

```
Redis (shared with cache)
    │
    ├── email.queue
    │     Jobs: { type: 'PASSWORD_RESET'|'INVITE'|'VERIFY', to, payload }
    │     Worker: calls nodemailer with SMTP credentials
    │     Retry: 3 attempts, exponential backoff
    │
    ├── notification.queue
    │     Jobs: { userId, companyId, title, body, type }
    │     Worker: prisma.notification.create() + Socket.IO emit
    │     Upgrade from fire-and-forget to durable delivery
    │
    └── ai-categorization.queue
          Jobs: { expenseId, companyId, title, amount }
          Worker: calls OpenRouter, updates expense.categoryId if match found
          Replaces the Promise.race timeout hack in expense.service.ts
```

**Why BullMQ over simple async/await:**
- Jobs survive server restarts (persisted in Redis)
- Built-in retry with backoff — email delivery doesn't silently fail
- Decouples slow operations (email, AI) from the HTTP response cycle
- Redis is already deployed — zero extra infrastructure cost

---

## 9. Database Design

**14 tables across 3 domains:**

```
IDENTITY DOMAIN
  Company       id · name · slug · isActive · createdAt
  User          id · companyId · employeeId? · email · passwordHash · role · isVerified
  RefreshToken  id · userId · tokenHash · expiresAt · deviceInfo · ipAddress

EMPLOYEE DOMAIN
  Employee      id · companyId · userId? · firstName · lastName · position · department
                salary · hireDate · isActive
  Attendance    id · employeeId · companyId · date · checkIn · checkOut · status

ERP DOMAIN
  Expense       id · companyId · employeeId · categoryId · amount · currency
                status · rejectReason · invoiceUrl · approvedById
  ExpenseCategory  id · companyId · name · color · isDefault
  Product       id · companyId · name · sku · description · quantity · unitPrice
                lowStockThreshold · warehouse · isActive
  StockMovement id · productId · companyId · type · quantity · reason · createdById

AI DOMAIN
  AiChat        id · companyId · userId · title · createdAt
  AiMessage     id · chatId · role · content · toolCalls? · toolResults?

SYSTEM DOMAIN
  Notification  id · userId · companyId · title · body · type · read
  ActivityLog   id · userId · companyId · action · resourceType · resourceId
                details · ipAddress
```

**Key design decisions:**
- Every tenant table has `companyId` (NOT NULL) — enforced at DB level, not just app level
- Soft deletes everywhere (`isActive = false`) — never hard-delete business records
- `StockMovement` is an immutable append-only ledger — quantity on `Product` is the cached derived value
- `Expense.status` is a state machine: `PENDING → APPROVED | REJECTED` — no reverse transitions
- `ActivityLog.ipAddress` enables the "device tracking" requirement from section 3.2

**Indexes (critical for multi-tenant performance):**
```sql
-- Every list query filters by companyId first
@@index([companyId])                   -- on Employee, Expense, Product, Notification, ActivityLog
@@index([companyId, status])           -- on Expense (filter by status within company)
@@index([companyId, isActive])         -- on Employee, Product (soft-delete filter)
@@index([employeeId, date])            -- on Attendance (history queries)
@@index([companyId, createdAt(sort: Desc)])  -- on ActivityLog (recent activity feed)
```

---

## 10. Frontend Architecture

```
apps/web/src/
├── app/
│   ├── (auth)/              ← no sidebar layout
│   │   ├── login/
│   │   └── register/
│   └── (dashboard)/         ← sidebar + header layout
│       ├── layout.tsx        ← useSocket() + NotificationBell
│       ├── dashboard/        ← role-aware: AdminDashboard | EmployeeDashboard
│       ├── employees/
│       ├── expenses/
│       ├── inventory/
│       ├── ai-assistant/
│       └── settings/team/
│
├── components/ui/           ← design system primitives
│   Button · Input · Field · Badge · Card · Select
│   PageHeader · EmptyState · PageTransition · StatCardSkeleton
│   NotificationBell · Toast · PasswordInput
│
├── store/                   ← Zustand global state
│   auth.store.ts            — user session, accessToken, companySlug
│   notification.store.ts    — unreadCount, notifications[]
│   toast.store.ts           — toast queue (Zustand imperative API)
│
├── hooks/
│   use-socket.ts            — connects Socket.IO on login, handles 3 events
│
├── lib/                     ← typed API clients (one per module)
│   axios.ts                 — base client with JWT interceptor + refresh logic
│   employees.ts · expenses.ts · products.ts · ai.ts
│   dashboard.ts · notifications.ts · super-admin.ts
│
└── proxy.ts                 ← Next.js middleware — redirects unauthenticated users
```

**State management split:**
- `Zustand` — auth session, notifications, toasts (global, persisted across navigations)
- `TanStack Query` — all server data (employees, expenses, products, etc.) — cached, auto-refetch

**Design system tokens (Tailwind v4 `@theme {}`):**
```css
--color-primary      #0f766e   → bg-primary, text-primary, border-primary
--color-canvas       #f8fafc   → page backgrounds
--color-surface      #ffffff   → cards
--color-muted        #64748b   → secondary text
--color-border       #e2e8f0   → dividers
--color-strong       #0f172a   → headings
--color-danger-soft  #fef2f2   → destructive action backgrounds
```
Every color token auto-generates `bg-*`, `text-*`, `border-*`, `ring-*` utility classes.
No hardcoded hex values anywhere in the codebase.

---

## 11. Performance Optimizations

| Optimization | Where Applied |
|---|---|
| Redis cache (60s TTL) | Dashboard stats — avoids 8 parallel DB queries on every page load |
| Redis cache (30s TTL) | AI tool results — same company query within 30s hits cache not DB |
| Parallel queries | `Promise.all()` used in dashboard (8 queries), expense analytics, low-stock filter |
| Pagination | All list endpoints (employees, expenses, products) — `skip/take` with total count |
| Debounced search | 300ms debounce on all search inputs — no query on every keystroke |
| TanStack Query cache | Server state cached client-side, stale-while-revalidate pattern |
| Row locking | `SELECT FOR UPDATE` in stock movement transaction — prevents negative inventory race condition |
| Soft deletes | No FK constraint violations on deactivated records |
| API rate limiting | `express-rate-limit` — 100 req/15min globally, 20 msg/10min on AI endpoint |

---

## 12. Security Implementation

| Requirement | Implementation |
|---|---|
| XSS protection | Access token in memory only (not localStorage). Refresh token in `httpOnly` cookie. |
| CSRF protection | `sameSite: 'strict'` (dev) / `sameSite: 'none' + secure` (prod cross-origin) |
| SQL injection | Prisma ORM with parameterized queries. Raw SQL uses `Prisma.sql` tagged templates. |
| Helmet.js | `helmet()` middleware on all Express routes |
| Rate limiting | `express-rate-limit` — global + per-endpoint (AI) |
| Audit logs | `ActivityLog` table records every CRUD + auth action with `userId + ipAddress` |
| Tenant isolation | `companyId` enforced at middleware + repository layers — never trusted from request body |
| Role protection | `requireRole()` middleware on all write/delete routes |
| Refresh token rotation | Each use issues a new token and deletes the old one — stolen token usable once only |
| Input validation | Zod schemas at controller boundary — all inputs parsed before service layer |

---

## 13. DevOps & Deployment

### Docker Compose (evaluator runs one command)
```bash
docker compose up --build
# Starts: nginx · next.js web · express server · postgresql · redis
# Server auto-runs: prisma migrate deploy → node dist/app.js
```

### CI/CD Pipeline (GitHub Actions)
```yaml
on: push to main
jobs:
  - lint:  eslint + tsc --noEmit (both apps)
  - build: next build (web) + tsc (server)
```

### Environment Split
```
docker-compose.yml      ← full stack (evaluator workflow)
docker-compose.dev.yml  ← infra only (postgres + redis for local dev)
apps/server/.env.example
apps/web/.env.example
```

### Deployment Platforms
```
Frontend: Vercel
  - Import GitHub repo → set Root Directory: apps/web
  - Build arg: NEXT_PUBLIC_API_URL=https://<railway-backend-url>
  - Auto-deploys on every push to main

Backend: Railway
  - New project → Deploy from GitHub → select apps/server
  - Add PostgreSQL service → DATABASE_URL auto-injected
  - Add Redis service → REDIS_URL auto-injected
  - Set env vars: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, OPENROUTER_API_KEY, CLOUDINARY_*
  - Auto-deploys on every push to main
```

**Updating after deploy:** Both platforms watch the `main` branch. Push to GitHub → Railway redeploys backend in ~2–3 min, Vercel redeploys frontend in ~1–2 min. Zero downtime for Vercel (atomic swap). Railway does a rolling restart.

---

## 14. ERP Module Workflows

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
  - Approval triggers a Socket.IO notification to the submitter
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
  - OUT that would result in quantity < 0 → blocked with 409 (row-locked transaction)
  - Movement on deactivated product → blocked with 409
  - Every movement creates an immutable StockMovement row (audit ledger)
  - Low stock alert: quantity ≤ lowStockThreshold → banner on inventory page
  - Real-time: all company users see quantity update live via Socket.IO
```

### Employee Attendance
```
Employee check-in  → Attendance row created (status: PRESENT, checkIn: now)
Employee check-out → Attendance row updated (checkOut: now)
If check-in time > 09:30 (company-configurable) → status: LATE
If no check-in for today → not shown (not created as ABSENT automatically)

Date key uses Asia/Karachi timezone (configurable via APP_TIMEZONE env var)
— prevents midnight UTC rollover from creating wrong-date attendance records
```

---

## 15. Module Dependency Map

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
