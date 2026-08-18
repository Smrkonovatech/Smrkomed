# SmrkoMed

Fertility clinic operating platform with Care Loop — AI-powered patient follow-through.

> Doctors create the care plan. Care Loop makes sure patients follow it.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL + Prisma
- Auth.js (NextAuth v5)

See [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md) for the full backend plan.

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
npx prisma db push
npx tsx prisma/seed.ts
```

Use the hosted `DATABASE_URL` (set it in `.env` or the shell before those commands).

4. Redeploy the Vercel project after saving env vars.

### Demo accounts

Password for all: `Demo@12345`

| Email | Role |
|---|---|
| meera@abcfertility.demo | Care Coordinator |
| ananya@abcfertility.demo | Doctor |
| admin@abcfertility.demo | Clinic Admin |
| ravi@abcfertility.demo | Doctor |
| nisha@abcfertility.demo | Receptionist |

### Useful scripts

| Command | Description |
|---|---|
| `npm run db:up` | Start Postgres (Docker) |
| `npm run db:setup` | Generate client, push schema, seed |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run dev` | Next.js dev server |

## Current status

**Phase 1:** Auth + PostgreSQL schema + seed + clinic/user/role foundation.

UI screens still use in-memory demo state for most content. Phase 2 wires patients, couples, care plans, and tasks to real APIs.
