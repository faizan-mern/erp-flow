# ERP Platform

Enterprise multi-tenant SaaS ERP platform built for the Cyberify hiring assessment.

## Current Status

Phase 1 is complete: project setup, PostgreSQL/Redis infrastructure, Prisma schema, Express auth API, Next.js auth screens, protected dashboard shell, and production build fixes.

Phase 2 is next: Employee module backend first, then employee UI.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Zustand, TanStack Query
- Backend: Node.js, Express, TypeScript, Prisma
- Database/cache: PostgreSQL, Redis
- Auth: JWT access tokens plus refresh tokens in httpOnly cookies
- Deployment target: Vercel for web, Railway for API/database/cache

## Repository Structure

```text
apps/
  web/       Next.js frontend
  server/    Express backend
nginx/       reverse proxy config for full-stack Docker demo
```

Backend modules follow the route -> controller -> service -> repository -> validator pattern. Controllers handle HTTP, services hold business rules, repositories are the only layer that talks to Prisma, and validators define Zod request schemas.

## Local Development

Start PostgreSQL and Redis:

```bash
npm run infra:up
```

Start the backend:

```bash
npm install --prefix apps/server
npm run db:migrate
npm run dev:server
```

Start the frontend:

```bash
npm install --prefix apps/web
npm run dev:web
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health

## Full Stack Docker Demo

Create a root `.env` from `.env.example`, then run:

```bash
docker-compose -f docker-compose.prod.yml up --build
```
