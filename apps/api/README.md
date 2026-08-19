# SmrkoMed API (`apps/api`)

Hono + TypeScript service on **http://localhost:4000**. All public routes use `/api/v1/`.

## Authentication

Login stays in `apps/web` (Auth.js). This API does **not** accept passwords.

It decrypts the Auth.js session JWT from:

- cookie `authjs.session-token` (local HTTP)
- cookie `__Secure-authjs.session-token` (HTTPS)
- `Authorization: Bearer <token>` (same JWT, for tests/tools)

`AUTH_SECRET` must match the web app. Cookie encryption salt is the cookie name.

Identity taken from the verified token: `userId`, `organizationId`, `clinicId`, `role`.
Request bodies and query strings are never trusted for those fields. Tokens do not include clinical data.

## Tenant authorization

Handlers call Phase 3 helpers from `@smrkomed/database`:

`assertClinicAccess`, `assertOrganizationAccess`, `resolveAuthorizedClinic`, plus API wrappers
`requireClinicAccess`, `requireOrganizationAccess`, `requireRole`, `requirePermission`.

## Rate limiting

In-memory per IP, 120 requests/minute. Webhook paths use a stricter 30/minute bucket. Not distributed. Disable with `RATE_LIMIT_DISABLED=1`.
Redis-backed limiting belongs to a later phase.

## Integrations (Phase 6)

Provider adapters, credential encryption, and webhooks live in `src/integrations/`. See [src/integrations/README.md](./src/integrations/README.md).

Clinic:

- `GET /api/v1/integrations`
- `GET /api/v1/integrations/:provider`
- `GET /api/v1/integrations/:provider/status`
- `POST /api/v1/integrations/:provider/connect` → 501 until a real provider exists
- `POST /api/v1/integrations/:provider/disconnect` → 501
- `GET /api/v1/integrations/:provider/oauth/start` → 501

Public:

- `POST /api/v1/webhooks/:provider`
- `GET /api/v1/integrations/:provider/oauth/callback` → 501

Admin (platform only):

- `GET /api/v1/admin/integrations`
- `GET /api/v1/admin/integrations/health`
- `GET /api/v1/admin/integration-events`

`INTEGRATION_ENCRYPTION_KEY` is required to start the API. Generate 32 bytes as hex:

`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Existing Next.js routes (kept)

These remain in `apps/web/src/app/api/` until a later migration:

- `/api/auth/[...nextauth]` — Auth.js login/session
- `/api/auth/me`
- `/api/health`
- `/api/clinics/current`
- `/api/onboarding`
- `/api/integrations`
- `/api/leads/ingest` — public lead capture by clinic slug only

## CRM (Phase 8)

See [docs/crm.md](../../docs/crm.md).

Authenticated (cookie JWT, tenant from session):

- `GET/POST /api/v1/leads` — list is paginated `{ items, page, pageSize, total, totalPages }`
- `GET/PATCH /api/v1/leads/:id`
- `POST /api/v1/leads/:id/assign` — `{ assignedToId }` or `{ roundRobin: true }`
- `POST /api/v1/leads/:id/stage`
- `POST /api/v1/leads/:id/convert`
- `POST /api/v1/leads/:id/lost` — `{ reason }` required
- `POST /api/v1/leads/:id/reopen`
- `GET/POST /api/v1/leads/:id/activities`
- `GET/POST /api/v1/leads/:id/tasks`
- `POST /api/v1/leads/:id/whatsapp` — approved template via WhatsAppMessagingService
- `POST /api/v1/leads/import/preview` — CSV-like JSON preview; `confirm: true` inserts valid rows only
- `GET/POST /api/v1/campaigns`
- `GET/PATCH /api/v1/campaigns/:id`
- `GET /api/v1/crm/summary`
- `GET /api/v1/crm/pipeline`
- `GET /api/v1/crm/sources`
- `GET /api/v1/crm/follow-ups`

Public:

- `POST /api/v1/public/leads` — clinic slug, rate limited, no `organizationId`
- `POST /api/v1/public/leads/adapters/:provider` — Meta/Google return 501
- `POST /api/leads/ingest` (Next.js) remains compatible

Permissions: `leads:read|create|update|assign|archive|export`, `campaigns:read|manage`. Clinic admin still holds all keys. List/create also accept the older `patients:read` / `patients:write` keys so Phase 4 clients keep working.

Tenant IDs in bodies are ignored or rejected (`strict` schemas). Assignment target must belong to the same organization/clinic.

