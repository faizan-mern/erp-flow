# System Architecture

## Big Picture

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                          │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Nginx (VPS)   │  ← reverse proxy
              └────────┬────────┘
              ┌────────┴────────┐
              │                 │
    ┌─────────▼──────┐  ┌───────▼────────┐
    │  Next.js (web) │  │ Express (server)│
    │   Port 3000    │  │   Port 5000    │
    │   Vercel       │  │   Railway      │
    └────────────────┘  └───────┬────────┘
                                │
              ┌─────────────────┼──────────────┐
              │                 │              │
    ┌─────────▼──────┐  ┌──────▼──────┐  ┌───▼────┐
    │  PostgreSQL    │  │    Redis     │  │Socket.IO│
    │  (Railway)     │  │  (Upstash)   │  │(on server)│
    └────────────────┘  └─────────────┘  └─────────┘
```

---

## Decision 1: Separate Backend vs Next.js API Routes

**Decision: Separate Express.js server**

Why not Next.js API routes:
- Socket.IO needs a persistent server connection — Vercel serverless kills connections after ~10 seconds
- Redis pub/sub needs a long-lived process
- Express gives us more control over middleware, rate limiting, and module structure
- Easier to understand and explain — clear separation of concerns

What this means practically:
- Frontend lives at `apps/web/` — deployed to Vercel
- Backend lives at `apps/server/` — deployed to Railway
- They communicate via HTTP (REST) and WebSocket

---

## Decision 2: Multi-Tenancy Strategy

**Decision: Shared database with companyId on every table**

Two common approaches in SaaS:

| Approach | What It Means | Tradeoff |
|---|---|---|
| Separate DB per tenant | Each company gets its own PostgreSQL database | Strongest isolation, expensive to manage |
| Shared DB + tenant ID | One DB, every row has a `companyId` column | Cost-effective, simpler — industry standard for most SaaS |

We use **Shared DB + companyId** because:
- It's what 90% of SaaS companies do at early/mid stage (Notion, Linear, etc.)
- Easier to demo, easier to maintain
- We enforce isolation in middleware — every request extracts `companyId` from JWT and injects it into every DB query automatically

**How the middleware works:**
```
Request comes in
  → Auth middleware verifies JWT
  → Extracts { userId, companyId, role } from token payload
  → Attaches to req.user
  → Every controller/service uses req.user.companyId in every DB query
  → A user from Company A literally cannot query Company B's data
```

---

## Decision 3: Authentication Flow

**JWT Access Token + Refresh Token rotation**

```
LOGIN:
  User submits email + password
  → Server verifies password hash (bcrypt)
  → Issues: accessToken (15 min, in response body)
             refreshToken (7 days, in httpOnly cookie)
  → Saves refreshToken hash to DB with deviceInfo + expiry

AUTHENTICATED REQUEST:
  Client sends accessToken in Authorization header
  → Server verifies token, extracts user payload
  → Proceeds with request

TOKEN REFRESH:
  accessToken expires
  → Client calls /auth/refresh
  → Server reads refreshToken from cookie
  → Verifies it exists in DB and not expired
  → Issues new accessToken + rotates refreshToken
  → Old refreshToken deleted from DB

LOGOUT:
  → Delete refreshToken from DB
  → Clear cookie
```

Why httpOnly cookie for refresh token:
- JavaScript on the page cannot read it (XSS protection)
- Automatically sent with requests to the same domain
- The access token lives in memory only (not localStorage) — also XSS safe

---

## Decision 4: Real-Time Architecture

**Socket.IO with company-scoped rooms**

```
User connects → authenticates via socket handshake (sends accessToken)
→ Server verifies token
→ Server joins socket to room: `company:${companyId}`
→ All events for that company broadcast to that room only

Events emitted:
  'notification:new'   → to user:${userId}        — expense approved/rejected (personal)
  'inventory:updated'  → to company:${companyId}  — any stock movement
  'dashboard:refresh'  → to company:${companyId}  — after expense status change or stock movement

Frontend response to each event:
  notification:new    → Zustand store: addNotification + incrementUnread
  inventory:updated   → queryClient.invalidateQueries(['products', 'product', productId])
  dashboard:refresh   → queryClient.invalidateQueries(['dashboard-stats'])
```

Why rooms per company: Company A's inventory updates should never appear in Company B's dashboard.

---

## Decision 5: AI Integration

**Real OpenRouter integration — not mocked, not hardcoded responses**

OpenRouter (openrouter.ai) provides an OpenAI-compatible API that routes requests to many
models through one key. The backend uses the standard OpenAI Node.js SDK — the only
difference from calling OpenAI directly is the `baseURL` and the model name. No OpenAI
billing account is required.

Model is configurable via environment variable:
```
OPENROUTER_MODEL=openai/gpt-oss-120b:free   # current default — switched in Session 14
# Fallback: meta-llama/llama-3.1-8b-instruct:free
# Avoid: mistralai/* — free-tier models deprecated without warning
```

Flow (tool/repository-based — the AI never writes SQL):
```
User types: "Show me top 5 expenses this month"
  → Frontend sends message to POST /api/v1/ai/chat
  → Backend builds a system prompt with:
      • company context (name, current date, user role)
      • a small whitelist of "tools" the AI can call — each tool is a
        normal repository function, e.g. getExpenseTotals(period),
        getLowStockProducts(), getEmployeeAttendance(employeeId, range)
      • each tool description spells out its arguments and what it returns
  → Backend sends prompt + user message to OpenRouter → model
  → Model responds with EITHER a plain-English answer
      OR a structured tool call: { name: "getExpenseTotals", args: {...} }
  → Backend validates the tool name against the whitelist, validates args
    with Zod, then calls the matching repository function.
    Every repository call is scoped by companyId from the JWT.
  → Tool result fed back to the model so it can phrase the answer in plain English
  → Final answer + raw data persisted to ai_messages
```

Key safety rules:
- The AI never generates SQL. It only chooses from a closed list of backend functions.
- Every tool is a `repository.ts` function — already tenant-isolated by `companyId`.
- No write tools exposed to the model — read-only by design. Approvals/edits stay
  behind the normal authenticated REST endpoints.
- Tool arguments are validated with Zod before execution, so a malformed model
  response can never reach the database.

Get your key at openrouter.ai → Keys → Create Key. Free tier works for the full assessment.

**To study:** [OpenRouter Docs](https://openrouter.ai/docs) | [OpenAI Node.js SDK](https://github.com/openai/openai-node)

---

## Module Structure (Backend)

Each feature is a self-contained module:

```
server/src/modules/auth/
├── auth.routes.ts       ← defines the Express routes
├── auth.controller.ts   ← handles HTTP request/response
├── auth.service.ts      ← business logic lives here
├── auth.repository.ts   ← all database queries live here
└── auth.validator.ts    ← Zod schemas for request validation
```

**Complete module list as of Phase 7:**
```
modules/
├── auth/           — register, login, logout, refresh, verify-email, forgot/reset password
├── employee/       — CRUD + attendance (check-in/out + history)
├── expense/        — CRUD + approve/reject state machine + AI categorization + analytics
├── user/           — invite user, list team, change role
├── product/        — CRUD + stock movements (IN/OUT/ADJUSTMENT) + low-stock count
├── ai/             — chat CRUD + message send + tool call orchestration
├── dashboard/      — aggregation stats endpoint + recent activity feed
└── notification/   — list notifications + mark-all-read

server/src/lib/
├── redis.ts        — ioredis singleton + cacheGet/cacheSet/cacheDel helpers
├── socket.ts       — Socket.IO server init + JWT handshake + getIO() accessor
├── cloudinary.ts   — invoice PDF/image upload helper
└── openrouter.ts   — OpenAI-SDK-compatible OpenRouter client + AI categorizer
```

**Shared utilities:**
```
server/src/utils/
├── jwt.ts          — signAccessToken / signRefreshToken / verifyAccessToken / verifyRefreshToken
├── response.ts     — sendSuccess / sendError response helpers
├── activity.ts     — logActivity() fire-and-forget audit logger
└── time.ts         — todayInAppTz() for Asia/Karachi attendance date keys
```

**Why this structure (layered architecture):**
- `routes` — just maps URLs to controllers
- `controller` — reads request, calls service, sends response. No business logic here.
- `service` — the brain. Business rules, decisions, calling repositories.
- `repository` — the only place that talks to Prisma/DB. If you ever swap the DB, only this file changes.
- `validator` — Zod schemas. Request body validated here before reaching controller.

---

## Frontend Structure (Next.js App Router)

```
web/app/
├── (auth)/               ← route group, no dashboard layout
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/          ← route group, has sidebar layout
│   ├── layout.tsx        ← sidebar + header
│   ├── page.tsx          ← main dashboard
│   ├── employees/
│   ├── expenses/
│   ├── inventory/
│   └── ai-assistant/
```

Route groups (the parentheses) are a Next.js feature — they let you share layouts without adding a URL segment. The `(dashboard)` folder is invisible in the URL. However, pages still live under `dashboard/` subfolders, so URLs ARE `/dashboard/employees`, `/dashboard/expenses`, etc. The route group only controls which layout wraps them.

---

## Deployment Architecture

| Service | Platform | Free Tier |
|---|---|---|
| Frontend (Next.js) | Vercel | Yes |
| Backend (Express) | Railway | $5 credit/month |
| PostgreSQL | Railway | 1GB free |
| Redis | Upstash | 10k requests/day free |
| File Storage (PDFs) | Cloudinary | 25GB free |

Local development uses `docker-compose` which spins up PostgreSQL + Redis locally, so you never need to touch the cloud services during development.
