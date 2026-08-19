# SmrkoMed

Fertility clinic operating platform with Care Loop — AI-powered patient follow-through.

> Doctors create the care plan. Care Loop makes sure patients follow it.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL + Prisma
- Auth.js (NextAuth v5)

See [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md) for the full backend plan.

## Repository layout

npm workspaces. The clinic Next.js app lives in `apps/web`. Prisma lives in `packages/database`.

```text
apps/web              clinic application (Auth.js + existing Next.js API routes)
apps/api              Hono API on http://localhost:4000 (`/api/v1`)
apps/admin            platform admin portal on http://localhost:3001
packages/database     shared Prisma client, schema, migrations, seed
```

Root scripts: `npm run dev` and `npm run dev:web` start the clinic app. `npm run dev:api` starts the Hono API. `npm run dev:admin` starts the Admin Portal. Database commands (`npm run db:generate`, `npm run db:seed`) delegate to `packages/database`. You can also run workspaces directly:

```sh
npm run dev -w @smrkomed/web
```

## Phase 1 — local setup

### 1. Start PostgreSQL

```sh
npm run db:up
```

Requires Docker. Default connection:

`postgresql://smrkomed:smrkomed@localhost:5432/smrkomed`

### 2. Environment

Copy `.env.example` to `.env` (a local `.env` is already ignored by git).

Ensure `DATABASE_URL` and `AUTH_SECRET` are set.

### 3. Schema + seed

```sh
npm run db:setup
```

### 4. Run the app

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → login screen.

### Deploy on Vercel

Auth.js shows **“There is a problem with the server configuration”** when `AUTH_SECRET` is missing. Vercel also cannot use `localhost` Postgres.

1. Create a hosted Postgres database (Neon, Supabase, or Vercel Postgres).
2. In the Vercel project: **Settings → Environment Variables**, add for Production + Preview:

| Name | Value |
|---|---|
| `AUTH_SECRET` | output of `npx auth secret` (or any 32+ character random string) |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `DATABASE_URL` | your hosted Postgres URL (`sslmode=require`) |
| `DIRECT_URL` | same as `DATABASE_URL` unless your host gives a separate direct URL |

3. From this repo, push schema and demo users to the hosted database:

```sh
npm run db:push
npm run db:seed
```

Use the hosted `DATABASE_URL` (set it in `.env` or the shell before those commands).

On Vercel, set the project **Root Directory** to `apps/web`. Env vars still belong in the Vercel dashboard (`AUTH_SECRET`, `DATABASE_URL`, …). Prisma schema lives in `packages/database/prisma/`.

### Demo accounts

Password for all: `Demo@12345`

| Email | Role |
|---|---|
| meera@abcfertility.demo | Care Coordinator |
| ananya@abcfertility.demo | Doctor |
| admin@abcfertility.demo | Clinic Admin |
| ravi@abcfertility.demo | Doctor |
| nisha@abcfertility.demo | Receptionist |
| platform@abcfertility.demo | Organization Admin (ABC Fertility only) |
| platform@smrkomed.demo | SmrkoMed Platform Admin (Admin Portal) |

### Useful scripts

| Command | Description |
|---|---|
| `npm run db:up` | Start Postgres (Docker) |
| `npm run db:setup` | Generate client, push schema, seed |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run dev` | Next.js clinic app (`apps/web`) |
| `npm run dev:web` | Same as `npm run dev` |
| `npm run dev:api` | Hono API on http://localhost:4000 |
| `npm run dev:admin` | Admin Portal on http://localhost:3001 |

Existing Next.js routes in `apps/web/src/app/api/` stay in place (`/api/auth/*`, `/api/health`, `/api/clinics/current`, `/api/onboarding`, `/api/integrations`, `/api/leads/ingest`). The Hono service is additive. See `apps/api/README.md` and `apps/admin/README.md`.

## Current status

**Phase 1–3:** Auth.js, shared Prisma package, multi-tenant RBAC, tenant isolation tests.

**Phase 4:** Dedicated Hono API at `apps/api` (`/api/v1`). Clinic UI still uses the existing Next.js routes; dashboard migration is later.

**Phase 5:** Internal Admin Portal at `apps/admin` (`http://localhost:3001`) with platform-admin APIs under `/api/v1/admin`.
