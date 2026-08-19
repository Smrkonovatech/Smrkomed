# SmrkoMed Admin Portal

Internal platform administration at **http://localhost:3001**. Open that origin (or `/login`) — not `localhost:3000/dashboard` and not `/admin`. The clinic app has no `/dashboard` route, so landing there shows **Page not found**.

`npm run dev:admin` copies the root `.env` then rewrites `AUTH_URL` / `NEXT_PUBLIC_APP_URL` to `http://localhost:3001` so Auth.js does not send you to the clinic app on port 3000.

Clinic dashboard remains `apps/web` on port 3000. This app talks only to the Hono API (`/api/v1/admin/*`). Prisma is used on the server solely for Auth.js (same User table as the clinic app). Client components never import Prisma.

## Authentication

Same Auth.js credentials + JWT cookie as `apps/web` (`AUTH_SECRET`, cookie `authjs.session-token`). There is no second password store.

On localhost, browsers treat `localhost:3000` and `localhost:3001` as the same host, so the session cookie is shared. Access still requires `PLATFORM_ADMIN` server-side.

Production hosts `app.smrkomed.com` and `admin.smrkomed.com` will **not** share host-only cookies. Use a parent-domain cookie (`Domain=.smrkomed.com`, `Secure`, `HttpOnly`, `SameSite=Lax`) or sign in separately on each host against the same identity store. Do not weaken cookie security.

## Demo login

`platform@smrkomed.demo` / `Demo@12345`

## Integrations

`/integrations` lists stored connections (masked account, status, last sync/error). `/integrations/health` is stored state only. `/integrations/events` lists webhook receipts without raw payloads or secrets.

Connect/disconnect of Meta, WhatsApp, and Google is **not implemented**. Admin disconnect still returns `501 PROVIDER_DISCONNECT_NOT_IMPLEMENTED`.
