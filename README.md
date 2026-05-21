# ERPFlow — Enterprise ERP Platform

Multi-tenant SaaS ERP platform built for the Cyberify Senior Full Stack Developer assessment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, Zustand, TanStack Query, Framer Motion |
| Backend | Node.js, Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL (shared DB, `companyId` row-level isolation) |
| Cache | Redis |
| Real-time | Socket.IO (company-scoped rooms) |
| Auth | JWT access tokens (15 min) + refresh tokens (7 days, httpOnly cookie) |
| AI | OpenRouter — real integration, configurable model, live DB tool-calling |
| File uploads | Cloudinary (expense invoices) |
| Infrastructure | Docker Compose, Nginx reverse proxy, GitHub Actions CI |

---

## Running the Project

### Option A — Full Stack (single command)

Starts everything: PostgreSQL, Redis, Express backend, Next.js frontend, and Nginx.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API Docs (Swagger) | http://localhost:5000/api/docs |
| Health check | http://localhost:5000/health |

> **First run** pulls Docker images and compiles both apps — allow 3–5 minutes.
>
> The stack works with no `.env` file — safe defaults are baked into `docker-compose.yml`.
> Copy `.env.example` → `.env` to supply your own secrets (required for AI and file uploads).

> **Note on migrations** — the server runs `prisma migrate deploy` automatically on startup.
> If you see DB connection errors on first start, wait for the postgres healthcheck to pass
> then the server container will retry automatically.

---

### Option B — Developer Mode (hot reload)

Docker is used only for PostgreSQL and Redis. Both apps run directly on your machine.

**Step 1 — Install dependencies**

```bash
npm install
```

**Step 2 — Start infrastructure (postgres + redis)**

```bash
npm run infra:up
```

**Step 3 — Run migrations (first time only)**

```bash
npm run db:migrate
```

**Step 4 — Start both apps in two terminals**

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
| `OPENROUTER_API_KEY` | Yes (AI module) | — | Free key at openrouter.ai |
| `OPENROUTER_MODEL` | No | `qwen/qwen3-coder:free` | Any OpenRouter model slug |
| `CLOUDINARY_CLOUD_NAME` | Yes (uploads) | — | From cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | Yes (uploads) | — | From cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | Yes (uploads) | — | From cloudinary.com dashboard |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000` | Backend URL seen by the browser |

> JWT secrets have safe dev defaults in `docker-compose.yml`. Always set unique values in production.

---

## Creating a Super Admin

A platform-level Super Admin can view all companies, suspend tenants, and see platform-wide stats.

**Option A — Docker stack (recommended after `docker compose up --build`)**

```bash
docker exec erp_server node dist/scripts/seed-superadmin.js admin@platform.com YourPassword123
```

**Option B — Developer mode (after `npm run infra:up`)**

```bash
npm run create-super-admin -w apps/server -- admin@platform.com YourPassword123
```

Then log in at `http://localhost:3000/login` using the **Platform Admin** tab.

---

## Architecture

### Multi-Tenancy

Shared PostgreSQL database. Every tenant-scoped table has a `companyId` column. Every repository
query includes `WHERE companyId = ?` extracted from the verified JWT. Company A cannot access
Company B data — enforced at the query layer, not just middleware.

### Backend Module Structure

```
server/src/modules/<feature>/
  <feature>.routes.ts      → URL mapping + middleware
  <feature>.controller.ts  → reads request, calls service, sends response
  <feature>.service.ts     → business rules, orchestration
  <feature>.repository.ts  → only layer that calls Prisma
  <feature>.validator.ts   → Zod schemas for request validation
```

### Roles

Four roles are implemented:

| Role | Scope | How created |
|---|---|---|
| `SUPER_ADMIN` | Platform-wide | Seed script (`npm run create-super-admin`) |
| `COMPANY_ADMIN` | Own company — full access | Auto-assigned on registration |
| `MANAGER` | Own company — approve expenses, manage stock | Invited by admin from Team page |
| `EMPLOYEE` | Own company — own data only | Invited by admin from Team page |

See [docs/ROLES.md](docs/ROLES.md) for the full permission breakdown.

### Authentication Flow

```
Login  → access token (15 min, stored in memory) + refresh token (7 days, httpOnly cookie)
Refresh → old refresh token deleted, new pair issued (rotation prevents replay attacks)
Logout → refresh token deleted from DB, cookie cleared
```

### AI Integration

Real OpenRouter integration — no mocked responses.

1. User sends a natural language question
2. Backend builds a system prompt with live company context (role, date, company name)
3. Model calls whitelisted read-only tool functions (`getLowStockProducts`, `getExpenseTotals`, etc.)
4. Backend validates tool call, executes against tenant-scoped repository, feeds result back to model
5. Model generates a plain-English answer
6. Conversation saved to `ai_messages` table

The AI never writes SQL. It only calls a closed set of parameterized repository functions scoped by `companyId`.

---

## Repository Structure

```
erp-platform/
├── apps/
│   ├── web/          Next.js frontend
│   └── server/       Express backend
├── docs/             Architecture docs, database schema, role reference
├── nginx/            Reverse proxy config
├── docker-compose.yml        Full stack (evaluator workflow)
├── docker-compose.dev.yml    Infra only (postgres + redis for local dev)
└── .env.example      All variables documented with defaults
```

---

## npm Scripts

| Script | What it does |
|---|---|
| `npm run dev:web` | Start Next.js frontend with hot reload |
| `npm run dev:server` | Start Express backend with hot reload |
| `npm run build:web` | Production Next.js build |
| `npm run build:server` | Compile TypeScript backend |
| `npm run lint:web` | ESLint on frontend |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed default data |
| `npm run infra:up` | Start postgres + redis (dev mode) |
| `npm run infra:down` | Stop postgres + redis |
| `npm test -w apps/server` | Run Jest unit tests |

---

## Documentation

| Document | Description |
|---|---|
| [docs/SUBMISSION_ARCHITECTURE.md](docs/SUBMISSION_ARCHITECTURE.md) | Full system design, data flows, security |
| [docs/SCHEMA_DIAGRAM.md](docs/SCHEMA_DIAGRAM.md) | Database ERD (renders on GitHub) |
| [docs/ROLES.md](docs/ROLES.md) | Role permissions and enforcement |
| [docs/DATABASE.md](docs/DATABASE.md) | Table-by-table schema reference |
| `http://localhost:5000/api/docs` | Swagger UI (requires stack running) |

---

## Deployment Note

A cloud deployment was attempted on Railway (backend) + Vercel (frontend). Railway's free-tier
credit was exhausted during the deployment process — the platform no longer offers a persistent
free tier for always-on services. Vercel deployment of the frontend was successful but requires
the Railway backend URL to be set as a build argument, which could not be completed without a
live backend.

The full stack runs locally from a single command with no manual configuration required:

```bash
docker compose up --build
```

All five services (PostgreSQL, Redis, Express backend, Next.js frontend, Nginx) start from
this one command. The Docker setup was specifically designed so evaluators do not need any
cloud accounts or paid services to run the application.
