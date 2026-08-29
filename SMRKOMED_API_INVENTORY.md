# SMRKOMED API Inventory

**Date:** 2026-08-28  
**Base path:** `/api/v1` (Hono API) · Web also hosts Next routes under `/api/*`  
**Auth:** Protected routes use Auth.js session cookie → `authMiddleware` + `tenantMiddleware`. `clinicId` from JWT claims only.

**Status:** CODE VERIFIED from route mounts and module handlers. Live smoke tests: RUNTIME NOT VERIFIED in this audit environment.

---

## Mount map (`apps/api/src/routes/v1.ts`)

| Prefix | Auth | Module |
|--------|------|--------|
| `/health` | Public | health |
| `/public` | Public | public leads |
| `/payments/webhooks` | Public | payment webhooks |
| `/` public integrations | Public | WhatsApp challenge/webhooks |
| `/admin` | Protected + platform admin | admin |
| `/organizations` | Protected | orgs |
| `/clinics` | Protected | clinics |
| `/users` | Protected | users |
| `/patients` | Protected | patients |
| `/couples` | Protected | couples |
| `/leads` | Protected | leads |
| `/campaigns` | Protected | campaigns |
| `/crm` | Protected | CRM aggregates |
| `/appointments` | Protected | appointments |
| `/care-plans` | Protected | care plans |
| `/care-tasks` | Protected | care tasks |
| `/documents` | Protected | documents |
| `/activity` | Protected | activity/audit feed |
| `/analytics` | Protected | analytics |
| `/pharmacy` | Protected | pharmacy |
| `/insurance` | Protected | insurance |
| `/payments` | Protected | billing/payments |
| `/integrations` | Protected | integrations |

Web proxy: `apps/web/src/app/api/v1/[...path]/route.ts` → `API_URL`.

---

## Core

| Method | Route | Purpose | Auth / Role | Clinic scoped | Entities | Frontend | Status |
|--------|-------|---------|-------------|---------------|----------|----------|--------|
| GET | `/health` | Liveness | Public | No | — | Ops | ✅ |
| GET | `/organizations/current` | Current org | Session | Org | Organization | Settings | ✅ |
| GET | `/clinics/current` | Current clinic | Session | Yes | Clinic | Settings | ✅ |
| GET | `/clinics` | List clinics | Session | Org/admin | Clinic | Admin/settings | 🟡 |
| GET | `/users/me` | Current user | Session | Yes | User | App shell | ✅ |
| GET | `/users/staff` | Clinic staff | patients:read | Yes | User, Membership | Add Couple | ✅ |
| GET | `/users` | Manage users | users:manage | Yes | User | 🔵 limited UI | 🟡 |

---

## Patients / couples

| Method | Route | Purpose | Auth | Clinic | Entities | Frontend | Status |
|--------|-------|---------|------|--------|----------|----------|--------|
| GET | `/patients` | List | patients:read | Yes | Patient | Partial | ✅ |
| GET | `/patients/:id` | Get | patients:read | Yes | Patient | Profile | ✅ |
| POST | `/patients` | Create | patients:write | Yes | Patient | Rarely used | ✅ |
| PATCH | `/patients/:id` | Update | patients:write | Yes | Patient | Profile | ✅ |
| GET | `/couples` | List | patients:read | Yes | Couple | `/patients` | ✅ |
| GET | `/couples/:id` | Get by id/slug | patients:read | Yes | Couple | Profile | ✅ |
| POST | `/couples` | Create couple flow | patients:write | Yes | Patient,Couple,Treatment,CarePlan,CareTask,Consent | Add Couple | ✅ `CREATE_COUPLE_FAILED`+requestId |
| PATCH | `/couples/:id` | Update | patients:write | Yes | Couple | Profile | ✅ |

---

## Care Loop

| Method | Route | Purpose | Auth | Clinic | Entities | Frontend | Status |
|--------|-------|---------|------|--------|----------|----------|--------|
| GET/POST | `/care-plans` | List/create | care_plans:write / read | Yes | CarePlan | `/care-plans` | ✅ |
| GET/PATCH | `/care-plans/:id` | Get/update | same | Yes | CarePlan | Profile/journey | ✅ |
| GET/POST | `/care-tasks` | List/create | care_tasks:write | Yes | CareTask | `/tasks`, Care Loop | ✅ |
| GET/PATCH | `/care-tasks/:id` | Get/update | same | Yes | CareTask | Tasks | ✅ |
| — | Escalation worker | Automations | — | — | Escalation, TaskReminder | Care Loop board | ⛔ / ⚪ UI seed |

---

## Appointments / documents / activity / analytics

| Method | Route | Purpose | Status | Notes |
|--------|-------|---------|--------|-------|
| GET/POST/PATCH | `/appointments`, `/:id` | CRUD-ish | 🟡 | Remind not API |
| GET/POST | `/documents`, `/:id` | Metadata | 🟡 | No multipart/S3 |
| GET | `/activity` | Audit feed | ✅ | |
| GET | `/analytics/summary` | Counts | 🔵 | UI unused |

---

## CRM

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| * | `/leads/*` | Lead CRUD, tasks, WhatsApp | ✅ CODE VERIFIED |
| * | `/campaigns/*` | Campaigns | ✅ |
| GET | `/crm/summary`, `/pipeline`, `/sources`, `/follow-ups` | Aggregates | ✅ |
| POST | `/public/...` | Public lead ingest | ✅ |

---

## Pharmacy (`/pharmacy`)

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| GET | `/dashboard` | KPIs | ✅ |
| GET/POST/PATCH | `/products`, `/products/:id` | Catalogue | ✅ |
| GET/POST | `/inventory`, adjust, movements | Stock | ✅ |
| GET/POST/PATCH | `/suppliers` | Suppliers | ✅ |
| GET/POST | `/purchase-orders`, receive/order/cancel | POs | ✅ |
| GET/POST | `/sales` | POS sales | ✅ |
| GET/POST | `/prescriptions`, dispense/cancel | Rx | ✅ |
| GET/POST | `/reminders`, `/:id/simulate` | Demo reminders | ⚪ demoMode |
| GET | `/alerts`, `/reports` | Ops | ✅ |
| GET | `/patients/:id/history`, `/couples/:id/history` | History | ✅ |

Permissions: `pharmacy:*`

---

## Insurance (`/insurance`)

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| GET | `/dashboard`, `/integration-status`, `/analytics` | Ops | ✅ Manual/Demo |
| * | `/providers`, `/tpas`, `/policies`, `/claims` | CRUD | ✅ |
| POST | `/claims/:id/preauth`, queries, documents, payments | Workflow | ✅ |
| GET | `/patients/:id/overview`, `/couples/:id/overview` | Profile | ✅ |

NHCX: ⛔ not connected.

---

## Payments (`/payments`)

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| GET/POST/PATCH | `/gateways*` | Connect/test/disconnect/default | ✅ encrypted |
| GET/POST | `/invoices`, `/:id`, `/:id/payments` | Billing | ✅ |
| POST | `/payments/:id/verify`, `/link`, refunds | Collect/refund | ✅ |
| GET | `/payments`, `/:id`, `/dashboard` | History | ✅ |
| GET | `/patients|couples/.../financials` | Profile | ✅ |
| POST | `/pharmacy-sales/:saleId/invoice` | Promote sale | ✅ |
| GET | `/receipts/:paymentId` | Receipt text | ✅ |
| POST | `/payments/webhooks/razorpay\|cashfree\|payu` | Public webhooks | 🟣 needs provider |

Permissions: `payments:*`

---

## Integrations

| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| * | `/integrations/whatsapp/*` | Connect, templates, send, sync | 🟣 Meta |
| GET/POST | Public WhatsApp webhooks | Meta verify/receive | 🟣 |
| Admin | Google list | Stub note | ⛔ |

---

## Next.js App Router APIs (web)

| Method | Route | Purpose | Auth | Status |
|--------|-------|---------|------|--------|
| * | `/api/auth/[...nextauth]` | Login/session | Public challenge | ✅ |
| GET | `/api/auth/me` | Session user | Session | ✅ |
| POST | `/api/ai/chat` | Smrko AI | Session | 🟣 OpenAI |
| POST | `/api/ai/action` | Confirmed mutations | Session | ✅ createTask |
| POST | `/api/voice/transcribe` | Whisper | Session | 🟣 OpenAI; no audio store |
| POST | `/api/voice/summarize` | Summary | Session | 🟣 |
| * | `/api/voice/notes` | ConsultationNote CRUD | Session | ✅ |
| POST | `/api/demo/setup` | Demo workspace | Public/dev | ✅ |
| * | `/api/v1/[...path]` | Proxy to Hono | Cookie forward | ✅ |

---

## Known API gaps

| Gap | Status |
|-----|--------|
| Escalation / TaskReminder CRUD APIs for Care Loop board | ⛔ |
| Document multipart upload | ⛔ |
| Clinic branch CRUD for clinic admins | ⛔ |
| Analytics UI → `/analytics/summary` | Frontend gap |
| Google Calendar OAuth API | ⛔ |
| ABDM APIs | ⛔ |

---

## Error contract (couples)

Failed couple create returns safe message + `requestId` + step; logs `CREATE_COUPLE_FAILED` without secrets.  
Evidence: `apps/api/src/lib/errors.ts`, `modules/couples/service.ts`.
