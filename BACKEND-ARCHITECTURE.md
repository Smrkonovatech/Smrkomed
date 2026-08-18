# SmrkoMed Backend Architecture

> Doctors create the care plan. Care Loop makes sure the patient follows it.

This document describes how we turn the existing **frontend-only demo** into a production multi-tenant fertility SaaS without rebuilding the UI.

---

## 1. Current repository assessment

### Stack already in place

| Area | Status |
|---|---|
| Next.js | **16.3.1** App Router |
| React | **19.2** |
| TypeScript | Strict (`exactOptionalPropertyTypes`, etc.) |
| Styling | Tailwind CSS **4** + shadcn/ui (new-york) |
| Forms | React Hook Form + Zod **3.24** |
| Package manager | **npm** (`package-lock.json`) |
| Backend | **None** — no `src/app/api`, no Prisma, no auth |
| Persistence | In-memory only |

### Frontend routes (keep as-is)

| Route | Purpose |
|---|---|
| `/` | Clinic dashboard |
| `/patients`, `/patients/[slug]` | Couples / profiles |
| `/ivf-cycles` | Treatment cycles |
| `/appointments` | Scheduling |
| `/care-plans` | Templates / plans |
| `/care-loop` | Exception inbox (flagship) |
| `/tasks` | Task list |
| `/documents` | Document library |
| `/billing`, `/enquiries`, `/reports`, `/analytics` | Supporting modules |
| `/settings`, `/notifications`, `/help`, `/communication` | Admin / misc |

### Demo state (to be replaced gradually)

| File | Role |
|---|---|
| `src/lib/demo-data.ts` | Seed-shaped mock entities |
| `src/lib/app-state.tsx` | Client `AppStateProvider` (mutations lost on refresh) |
| `src/components/actions/*` | Create couple / appointment / cycle / document / enquiry |
| `src/components/create-task-drawer.tsx` | Create task |
| `src/components/care-loop/*` | Exception UI + resolve/message/assign |

### UI actions that need real APIs

| UI action | Target API (Phase 2+) |
|---|---|
| Add Couple | `POST /api/couples` (+ patients) |
| Create Task | `POST /api/care-tasks` |
| New Appointment | `POST /api/appointments` |
| Start Cycle | `POST /api/treatments` / cycles |
| Upload Document | `POST /api/documents/upload` |
| Resolve / escalate exception | Care Loop + Escalation APIs |
| Message patient | Conversations / WhatsApp send |
| Assign owner | Task assignment / escalation assign |
| Login / logout | Auth.js |
| Switch clinic (multi-branch later) | Session + clinic membership |

**Rule:** Keep existing UI. Swap data sources behind the same screens. Do not delete `demo-data` until API-backed flows are verified.

---

## 2. Target architecture

```
Next.js Web App (existing UI)
        ↓
Next.js Route Handlers (`src/app/api/**`)
        ↓
Service Layer (`src/server/services/**`)
        ↓
Domain / permissions / validation
        ↓
Prisma Client (`src/lib/db`)
        ↓
PostgreSQL

Background:
Care Task → Automation Engine → BullMQ → Redis
  → WhatsApp / AI / Notifications
  → Patient response → Webhook → Care Loop Engine
  → Task update / escalation
```

### Principles

1. **Business logic stays out of React.** Components call APIs (or thin server actions that call services).
2. **Multi-tenant by default.** Every clinic-owned row has `clinicId`. Every request resolves `user → clinic → permission → resource`.
3. **AI is assistive only.** Never diagnose, prescribe, change treatment, or make clinical decisions.
4. **Webhooks enqueue work.** No heavy AI in the request path.
5. **Phased delivery.** Demo state remains until each screen is migrated.

---

## 3. Project structure (target)

```
src/
  app/
    (auth)/
      login/page.tsx
    (dashboard)/          # existing pages — keep
    api/
      auth/[...nextauth]/
      clinics/
      users/
      patients/
      couples/
      care-plans/
      care-tasks/
      care-loop/
      appointments/
      documents/
      conversations/
      escalations/
      notifications/
      whatsapp/webhook/
  components/             # existing UI — keep
  lib/
    db/                   # Prisma client
    auth/                 # Auth.js config, session helpers
    validation/           # Zod schemas
    permissions/          # RBAC
    api/                  # response helpers, errors
    whatsapp/             # Phase 4
    ai/                   # Phase 5
    storage/              # Phase 2+
  server/
    services/             # clinic, user, patient, care-task, …
    workflows/            # Care Loop decisions
    jobs/                 # enqueue helpers
prisma/
  schema.prisma
  seed.ts
workers/                  # Phase 3+
  care-loop.worker.ts
  whatsapp.worker.ts
  notification.worker.ts
types/
```

---

## 4. Database entities (Prisma / PostgreSQL)

### Tenancy & access

| Model | Purpose |
|---|---|
| `Organization` | Parent org (e.g. ABC Fertility Group) |
| `Clinic` | Tenant boundary for almost all clinical data |
| `ClinicBranch` | Physical location under a clinic |
| `User` | Staff account (email + password hash) |
| `ClinicMembership` | User ↔ Clinic + role |
| `Role` / `Permission` / `RolePermission` | RBAC catalog |

### Clinical core

| Model | Purpose |
|---|---|
| `Patient` | Individual person |
| `Couple` | Primary + optional partner; shared journey |
| `CarePlanTemplate` / `CarePlan` / `CarePlanStep` | Doctor-approved journey |
| `CareTask` / `TaskReminder` / `TaskAssignment` | Follow-through unit |
| `Treatment` / `IVFCycle` / `IUICycle` | Cycle records |
| `Appointment` | Visits / procedures |

### Care Loop / communication

| Model | Purpose |
|---|---|
| `Conversation` / `Message` / `AIInteraction` | WhatsApp (later voice) thread |
| `Escalation` | Human attention queue |
| `Consent` | WhatsApp / voice consent gates |
| `AutomationRule` | Reminder / escalate policies |
| `WhatsAppAccount` / `Integration` | Provider config per clinic |

### Ops

| Model | Purpose |
|---|---|
| `Document` / `DocumentCategory` | Metadata in DB; bytes in S3 |
| `Notification` | In-app staff alerts |
| `AuditLog` | Security / clinical ops trail |

### Fertility care plan types (initial)

`FERTILITY_EVALUATION` · `IUI` · `IVF` · `FET`

### Care task statuses

`WAITING` · `IN_PROGRESS` · `COMPLETED` · `OVERDUE` · `ESCALATED` · `CANCELLED`

### Care task priority

`LOW` · `NORMAL` · `HIGH` · `CLINICAL`

### Escalation types

`CLINICAL` · `NO_RESPONSE` · `MISSING_REPORT` · `APPOINTMENT` · `TASK_OVERDUE` · `AI_UNABLE_TO_RESOLVE`

---

## 5. Multi-tenancy

Every authenticated request:

```
Session user
  → ClinicMembership (active clinic)
  → Role + permissions
  → Query/mutate only where clinicId = activeClinicId
```

Example: `GET /api/patients/[id]` must verify `patient.clinicId === session.clinicId` (and membership). Frontend filtering is **never** sufficient.

---

## 6. Authentication & authorization

### Auth.js (NextAuth v5)

- Credentials provider for staff email/password (demo + clinic admin provisioning).
- Secure HTTP-only session cookies.
- Session payload: `userId`, `email`, `name`, `clinicId`, `role`.

### Roles (server-enforced)

| Role | Typical access |
|---|---|
| `CLINIC_ADMIN` | Users, settings, all clinic data |
| `DOCTOR` | Assigned clinical cases, clinical escalations |
| `CARE_COORDINATOR` | Care Loop, tasks, WhatsApp ops |
| `NURSE` | Tasks, appointments, documents |
| `RECEPTIONIST` | Appointments, basic patient ops |

Permissions are checked in the **service layer**, not trusted from the client.

---

## 7. API design

Consistent envelopes:

```json
{ "success": true, "data": { } }
```

```json
{
  "success": false,
  "error": { "code": "RESOURCE_NOT_FOUND", "message": "Patient not found" }
}
```

| Status | Meaning |
|---|---|
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Validation |
| 500 | Internal (no stack traces to clients) |

### Care Loop API (Phase 2–3)

`GET /api/care-loop` → attention counts + exception records  
`GET /api/care-loop/exceptions` → filtered inbox  

Frontend Care Loop page will consume these and drop `demo-data` for exceptions once stable.

---

## 8. Care Loop automation (Phase 3)

```
Task due tomorrow → 24h WhatsApp reminder
Task due → reminder
Overdue → follow-up
Still silent → AI voice (Phase 6)
Unresolved → staff escalation
Clinical concern → doctor escalation
```

Implemented as BullMQ jobs + workflow services — **not** in React.

---

## 9. WhatsApp (Phase 4)

- `GET/POST /api/whatsapp/webhook` — Meta challenge + signed payloads
- Webhook stores raw event → enqueues processor
- Processor: phone → patient → conversation → task → AI classify → decide

Consent required before automated outbound messages.

---

## 10. AI (Phase 5)

Abstraction under `src/lib/ai/`:

- `classify-message.ts` → `COMPLETED | QUESTION | REQUEST_CALLBACK | CANNOT_COMPLETE | APPOINTMENT | UPLOAD_REPORT | CLINICAL_CONCERN | OTHER`
- `generate-response.ts` — approved non-clinical copy only

**Forbidden:** diagnose, prescribe, change meds/plan, clinical report interpretation as decision, treatment recommendation.

**Allowed:** reminders, completion checks, info collection, report upload prompts, staff scheduling, escalate clinical concerns without advice.

---

## 11. Storage

- Document **metadata** in PostgreSQL
- File **bytes** in S3-compatible object storage
- Validate MIME, size limits, authz before signed upload/download

---

## 12. Security

- AuthN + AuthZ on every mutating/read clinic API
- Zod validation on all inputs
- Webhook signature verification
- Rate limits on auth + webhooks (later)
- Audit log for create/update/complete/escalate/consent/user changes
- Never log message medical content or secrets
- No hardcoded API keys

---

## 13. Environment variables

See `.env.example`. Critical keys:

| Variable | Use |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `AUTH_SECRET` | Auth.js |
| `REDIS_URL` | BullMQ |
| `OPENAI_API_KEY` | AI |
| `WHATSAPP_*` | Meta Cloud API |
| `S3_*` / `STORAGE_*` | Object storage |

Never commit `.env`.

---

## 14. Development phases

| Phase | Scope | Stop when |
|---|---|---|
| **1** | Deps, Prisma schema, migrate, seed, Auth.js, clinic/user/role, login | Login works; session persists; seed clinic exists |
| **2** | Patients, couples, care plans, tasks, appointments, documents, escalations APIs + wire UI | CRUD persists across refresh |
| **3** | Care Loop automation engine + workers | Reminders / overdue / escalate without UI hacks |
| **4** | WhatsApp send/receive + webhook | Real WhatsApp thread stored |
| **5** | AI classification + safe replies | Intent → task/escalation |
| **6** | Voice follow-up | Voice escalation path |

### Phase 1 explicit boundary

- Install Prisma, Auth.js, bcrypt, Postgres client deps
- Full Prisma schema (foundation for later phases)
- Migrate + seed ABC Fertility Centre + demo staff + couples/plans/tasks
- Login / logout / session
- Clinic membership + role on session
- **Minimal** frontend: login page + auth gate for dashboard
- **Do not** rip out `AppStateProvider` / `demo-data` yet

Phase 2 connects screens to APIs and retires demo state module by module.

---

## 15. Seed targets (Phase 1)

**Clinic:** ABC Fertility Centre (Bangalore; optional branch rows for Kochi/Chennai later)

**Users:**

| Name | Role |
|---|---|
| Clinic Admin | `CLINIC_ADMIN` |
| Dr. Ananya Rao | `DOCTOR` |
| Dr. Ravi Menon | `DOCTOR` |
| Meera Iyer | `CARE_COORDINATOR` |
| Nisha Fernandes | `RECEPTIONIST` |

**Couples (seeded for later UI):** Priya+Rahul, Anjali+Arjun, Meera+Vivek, Sneha+Kiran, Kavya+Rohit — with fertility plans/tasks mirroring current demo narrative.

Default demo password (dev only): documented in seed output / README — **change in production**.

---

## 16. Migration strategy for existing UI

1. Keep screens and components.
2. Add API + services underneath.
3. Introduce a data client (`fetch` / React Query later) per module.
4. Feature-flag or dual-read briefly if needed.
5. Remove `AppStateProvider` mutations only after that module’s API is proven.
6. Care Loop is last to fully detach from demo (highest product risk).

---

## 17. Success criteria by phase

### Phase 1

- [x] App builds with Prisma + Auth.js
- [x] PostgreSQL schema + migration committed
- [x] Seed script for ABC Fertility Centre + demo staff/couples
- [x] Login screen + session cookies + Sign out
- [x] Clinic membership + role on session
- [ ] **Local verify:** requires PostgreSQL running (`npm run db:up` needs Docker Desktop, or any Postgres matching `DATABASE_URL`)

### Phase 2 (later)

- Dashboard/patients/tasks backed by Postgres
- Create patient, couple, care plan, care task — persist after refresh
- No in-memory requirement for those core ops

---

## Phase 1 delivered files

| Path | Purpose |
|---|---|
| `BACKEND-ARCHITECTURE.md` | This document |
| `prisma/schema.prisma` | Full multi-tenant schema |
| `prisma/migrations/` | Initial SQL migration |
| `prisma/seed.ts` | Demo clinic seed |
| `docker-compose.yml` | Local Postgres |
| `src/lib/db/` | Prisma client |
| `src/lib/auth/` | Auth.js (Edge-safe config + credentials) |
| `src/lib/permissions/rbac.ts` | Role → permission map |
| `src/app/(auth)/login/` | Login UI |
| `src/app/api/auth/` | Auth.js + `/api/auth/me` |
| `src/app/api/clinics/current/` | Session clinic from DB |
| `src/app/api/health/` | DB health check |
| `src/middleware.ts` | Auth gate |

*Document version: Phase 1 implemented (pending local Postgres verification).*
