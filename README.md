# ERPFlow — Enterprise ERP Platform

Multi-tenant SaaS ERP platform built for the Cyberify hiring assessment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, Zustand, TanStack Query |
| Backend | Node.js, Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL (shared DB, `companyId` row-level isolation) |
| Cache | Redis |
| Real-time | Socket.IO (company-scoped rooms) |
| Auth | JWT access tokens (15 min) + refresh tokens (7 days, httpOnly cookie) |
| AI | OpenRouter — real integration, configurable model, live DB data in prompt |
| File uploads | Cloudinary (expense invoices) |
| Deployment | Vercel (frontend) + Railway (backend + DB + Redis) |

---

## Running the Project

### Option A — Evaluator / Full Stack (single command)

This starts everything: PostgreSQL, Redis, Express backend, Next.js frontend, and Nginx.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

> **First run** pulls Docker images and compiles both apps — allow ~3 minutes.
>
> **Credentials** — the stack has safe defaults baked in and works without a `.env` file.
> Copy `.env.example` → `.env` to use your own secrets or set `OPENROUTER_API_KEY` for the AI module.

> **Note on migrations** — the server runs `prisma migrate deploy` in production mode.
> If you see DB connection errors on first start, wait for the postgres healthcheck to pass
> (Docker depends_on is set to `service_healthy`) then the server container will start.

---

### Option B — Developer Mode (hot reload)

Docker is used only for PostgreSQL and Redis. Apps run directly on your machine with `ts-node-dev` so you get instant hot reload.

**Step 1 — Install all packages from the repo root**

```bash
npm install
```

**Step 2 — Start infrastructure (postgres + redis only)**

```bash
npm run infra:up
```

**Step 3 — Run migrations (first time only)**

```bash
npm run db:migrate
```

**Step 4 — Start the apps (two terminals)**

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:web
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000/health |
| Prisma Studio | `npm run db:studio` |

> Developer mode does not use `docker compose up --build`. Docker is intentionally
> separated from `npm run dev` so that infra startup is independent of app startup.

---

## Environment Variables

Copy `.env.example` to `.env` in the repo root.

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | No | `erp_user` | Database username |
| `POSTGRES_PASSWORD` | No | `erp_password` | Database password |
| `POSTGRES_DB` | No | `erp_db` | Database name |
| `JWT_ACCESS_SECRET` | Yes | dev default | Sign access tokens |
| `JWT_REFRESH_SECRET` | Yes | dev default | Sign refresh tokens |
| `OPENROUTER_API_KEY` | Yes (AI) | — | Get free key at openrouter.ai |
| `OPENROUTER_MODEL` | No | `qwen/qwen3-coder:free` | Any OpenRouter model slug |
| `CLOUDINARY_CLOUD_NAME` | Yes (uploads) | — | From cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | Yes (uploads) | — | From cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | Yes (uploads) | — | From cloudinary.com dashboard |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000` | Backend URL seen by browser |

> JWT secrets have safe dev defaults in `docker-compose.yml`. Change them for production.

---

## Architecture

### Multi-Tenancy
Shared PostgreSQL database. Every table has `companyId`. Every repository query includes
`WHERE companyId = ?` extracted from the JWT. Company A cannot read Company B's data —
enforced at the query layer, not just middleware.

### Backend Module Structure
```
server/src/modules/<feature>/
  <feature>.routes.ts      → URL mapping
  <feature>.controller.ts  → reads request, calls service, sends response
  <feature>.service.ts     → business rules, state machine, AI calls
  <feature>.repository.ts  → only layer that calls Prisma
  <feature>.validator.ts   → Zod schemas for request validation
```

### Module Priority (as clarified by Cyberify)
Employee → Expense → Inventory

### Roles
Three roles per company: `COMPANY_ADMIN`, `MANAGER`, `EMPLOYEE`. See [docs/ROLES.md](docs/ROLES.md) for the exact permissions and how they are enforced on backend + frontend.

### Real-Time Priority
Live notifications → inventory updates → dashboard sync → activity tracking → team messaging

### AI Integration
Real OpenRouter integration. The AI service:
1. Fetches live data from DB via repositories (employees, expenses, inventory)
2. Injects it into a structured system prompt with company context
3. Sends to the configured model (default: `qwen/qwen3-coder:free`, free tier)
4. If the model returns SQL — executes it safely (SELECT only, no writes)
5. Returns data table + plain-English explanation to the frontend
6. Persists the conversation to `ai_messages` table

No OpenAI billing required. No mocked responses.

### Authentication Flow
```
Login  → access token (15 min, memory only) + refresh token (7 days, httpOnly cookie)
Refresh → old refresh token deleted, new pair issued (rotation)
Logout → refresh token deleted from DB, cookie cleared
```

---

## Repository Structure

```
erp-platform/
├── apps/
│   ├── web/          Next.js frontend
│   └── server/       Express backend
├── docs/             Architecture, database schema, progress tracker
├── nginx/            Reverse proxy config (Docker full-stack mode)
├── docker-compose.yml        Full stack — evaluator command
├── docker-compose.dev.yml    Infra only — developer command
├── docker-compose.prod.yml   Explicit production reference
└── .env.example      All required env vars documented
```

---

## npm Scripts (from repo root)

| Script | What it does |
|---|---|
| `npm run dev:web` | Start Next.js frontend (hot reload) |
| `npm run dev:server` | Start Express backend (ts-node-dev) |
| `npm run build:web` | Production build of frontend |
| `npm run build:server` | Compile TypeScript backend |
| `npm run lint:web` | ESLint on frontend |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed default data |
| `npm run infra:up` | Start postgres + redis (dev only) |
| `npm run infra:down` | Stop postgres + redis |

---

## Submission Checklist

- [ ] GitHub repo (public)
- [ ] Live deployment URL (Vercel frontend + Railway backend)
- [ ] `docker compose up --build` starts full stack
- [ ] Swagger API docs at `/api/docs`
- [ ] DB schema diagram (generated with `prisma-erd-generator`)
- [ ] 5-minute architecture explanation video (preferred)
