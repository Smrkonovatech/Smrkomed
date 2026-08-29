# SMRKOMED WhatsApp Implementation Report

**Date:** 2026-08-28  
**Stages covered:** Stage 1 (center shell) + **Stage 2 Automation Center** (flows, engine, KB, logs)  
**Honesty rule:** Features are classified below. UI existence ≠ live Meta delivery.

Related audit (read-only phase): `SMRKOMED_WHATSAPP_STAGE2_AUDIT.md`

---

## 1. Existing architecture (reused)

| Area | Location |
|------|----------|
| Meta Cloud API (Graph, templates, send, webhook, onboarding) | `apps/api/src/integrations/providers/whatsapp/*` |
| Models | `WhatsAppAccount`, `WhatsAppTemplate`, `Conversation`, `Message`, `Consent`, `Integration`, `IntegrationEvent` |
| Inbox / conversations | Existing `/api/v1/integrations/whatsapp/conversations*` — **no second inbox** |
| Smrko AI | `POST /api/ai/chat` + `apps/web/src/lib/ai/service.ts` |
| Care Loop / appointments / patients | Existing modules; thin trigger hooks added |
| RBAC | `packages/database/src/permissions.ts` (`whatsapp:*`) |
| Design system | Existing `ui-kit`, cards, badges, WhatsApp nav |

**Not replaced:** Meta provider, Conversation store, Care Loop, Pharmacy, Payments, Auth.

---

## 2. Files created

### Audit / docs
- `SMRKOMED_WHATSAPP_STAGE2_AUDIT.md`
- `SMRKOMED_WHATSAPP_IMPLEMENTATION_REPORT.md` (this file)

### Database
- `packages/database/prisma/migrations/20260828190000_whatsapp_automation_flows/migration.sql`
- Schema models in `packages/database/prisma/schema.prisma`

### API (`apps/api/src/modules/whatsapp-automation/`)
- `types.ts`, `library.ts`, `validate.ts`, `engine.ts`, `schemas.ts`, `seed.ts`, `triggers.ts`, `index.ts`

### Web UI
- `apps/web/src/app/(dashboard)/whatsapp/flows/page.tsx`
- `apps/web/src/app/(dashboard)/whatsapp/flows/new/page.tsx`
- `apps/web/src/app/(dashboard)/whatsapp/flows/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/whatsapp/knowledge-base/page.tsx`
- `apps/web/src/app/(dashboard)/whatsapp/logs/page.tsx`
- Overview rewritten; Automations redirects to Flows

---

## 3. Files modified

- `apps/api/src/routes/v1.ts` — mount `/whatsapp-automation`
- `apps/api/src/modules/appointments/index.ts` — `APPOINTMENT_BOOKED` dispatch
- `apps/api/src/modules/patients/index.ts` — `PATIENT_CREATED` dispatch
- `apps/api/src/modules/care-loop/index.ts` — `CARE_TASK_CREATED` dispatch
- `apps/web/src/lib/api/client.ts` — `apiDelete`
- `apps/web/src/lib/ai/service.ts` — inject published clinic KB into system prompt
- `packages/database/src/permissions.ts` — WhatsApp permission keys (Stage 2)
- Stage 1 WhatsApp pages / nav (retained)

---

## 4. Database models

| Model | Purpose |
|-------|---------|
| `WhatsAppFlow` | Clinic-scoped flow; `definition` Json = `{ nodes, edges }`; status DRAFT/ACTIVE/PAUSED/ARCHIVED; library flags |
| `WhatsAppFlowExecution` | Run instance; `idempotencyKey` unique per clinic; `resumeAt` for WAIT |
| `WhatsAppFlowExecutionStep` | Per-node history |
| `WhatsAppKnowledgeArticle` | Clinic KB; DRAFT/PUBLISHED/ARCHIVED |

**Design choice:** Node/edge tables omitted — graph stored in `definition` Json (equivalent capability, fewer joins).

---

## 5. Migrations

- Additive only: `20260828190000_whatsapp_automation_flows`
- **Never** used `migrate reset` / `db push` against production in this work
- Apply with normal migrate deploy in each environment

---

## 6. API routes

Base: `/api/v1/whatsapp-automation` (session clinic scoped)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/overview` | Real today counts + connection |
| GET/POST | `/flows` | List (seeds library) / create draft |
| GET/PATCH | `/flows/:id` | Read / update definition |
| POST | `/flows/:id/duplicate\|activate\|pause\|archive\|validate\|test\|trigger` | Lifecycle |
| GET | `/executions`, `/executions/:id` | Logs |
| POST | `/executions/:id/cancel` | Stop run |
| GET/POST/PATCH/DELETE | `/knowledge` | KB CRUD |
| GET | `/variables` | Variable catalog |
| POST | `/internal/resume-due` | Worker resume for WAIT |

Templates remain on `/api/v1/integrations/whatsapp/*`.

---

## 7. Flow engine architecture

```
Event / Manual / Test
        ↓
dispatchWhatsAppTrigger / startFlowExecution
        ↓
Idempotency key = hash(clinic|flow|triggerType|eventId|patient)
        ↓
WhatsAppFlowExecution (PENDING → RUNNING)
        ↓
run node → WhatsAppFlowExecutionStep
        ↓
WAIT → status WAITING + resumeAt (server) ──worker──▶ resumeDueExecutions
CONDITION → yes/no edges
SEND_TEMPLATE → existing sendWhatsAppTemplate (APPROVED only)
CREATE_TASK / ESCALATE / NOTIFY_STAFF → CareTask / Notification
END / escalate → COMPLETED / ESCALATED
```

Simulation mode (`POST .../test`): skips live WhatsApp send; WAIT skipped instantly.

---

## 8. Trigger list

| Trigger | Wired live | Notes |
|---------|------------|-------|
| PATIENT_CREATED | CODE VERIFIED | Patient create |
| APPOINTMENT_BOOKED | CODE VERIFIED | Appointment create |
| CARE_TASK_CREATED | CODE VERIFIED | Care task create |
| APPOINTMENT_TOMORROW / TODAY / MISSED | REQUIRES PRODUCTION WORKER | Cron must emit events |
| CARE_TASK_DUE / OVERDUE | REQUIRES PRODUCTION WORKER | Cron |
| MEDICINE_REMINDER | REQUIRES PRODUCTION WORKER | Hook pharmacy reminder worker |
| PAYMENT_PENDING / RECEIVED | NOT IMPLEMENTED (hook ready via `dispatchWhatsAppTrigger`) | |
| PATIENT_INACTIVE / CONSULTATION_COMPLETED / SCHEDULED | REQUIRES PRODUCTION WORKER | |
| MANUAL | CODE VERIFIED | `POST .../trigger` |
| INCOMING_WHATSAPP | NOT IMPLEMENTED | Webhook resume of WAITING possible later |

---

## 9. Action list

| Action | Status |
|--------|--------|
| SEND_TEMPLATE | CODE VERIFIED path; LIVE INTEGRATION REQUIRES CREDENTIALS + APPROVED template |
| SEND_TEXT | Explicitly skipped (honest) — session free-text not in Meta helper yet |
| WAIT | CODE VERIFIED persist; resume REQUIRES PRODUCTION WORKER |
| CONDITION (patient_replied) | CODE VERIFIED (inbound message count) |
| CREATE_TASK | CODE VERIFIED |
| ESCALATE / NOTIFY_STAFF | CODE VERIFIED (CareTask + Notification when non-system actor) |
| AI_DRAFT | Does not auto-send — points to Smrko AI |
| ASSIGN_STAFF | Skipped with reason (use Care Task / Inbox) |

---

## 10. Template architecture

- Unchanged Meta sync + APPROVED-only send
- Flow nodes reference template **name**; activate fails if not APPROVED
- Local draft builder on Templates page ≠ Meta approval

---

## 11. Knowledge Base

- Clinic-scoped CRUD under `/whatsapp/knowledge-base`
- Session `clinicId` only
- Published articles injected into Smrko AI system prompt (clinic isolation)

---

## 12. AI integration

- Reuses `POST /api/ai/chat`
- KB snippets for published articles only
- Does **not** auto-send clinical free-form WhatsApp

---

## 13–16. Care Loop / Pharmacy / Payments / Appointments

| Module | Status |
|--------|--------|
| Care Loop | CREATE_TASK + CARE_TASK_CREATED trigger; due/overdue need worker |
| Appointments | APPOINTMENT_BOOKED wired; tomorrow/missed need scheduler |
| Pharmacy | Library flow + medicine variables; reminder dispatch not auto-wired to every schedule tick |
| Payments | Library flow + vars; `dispatchWhatsAppTrigger("PAYMENT_PENDING")` not yet called from payments module |

---

## 17. Human handoff

- ESCALATE creates high-priority CareTask + optional notification
- Execution status `ESCALATED`
- Pause flow / cancel execution APIs exist
- Inbox automation badges: **partial** — use Logs + Care Tasks; deep conversation UI indicators not fully painted

---

## 18. Security

- All routes use session tenant + `requirePermission`
- Clinic ID never taken from client body for ownership
- Tokens stay server-side in existing credential service
- Library flows cannot activate until duplicated

---

## 19. RBAC

| Permission | Use |
|------------|-----|
| `whatsapp:view` | Overview, list flows, KB read |
| `whatsapp:flows` | Manage / activate / test |
| `whatsapp:kb` | KB write |
| `whatsapp:logs` | Executions |
| `whatsapp:settings` | Resume-due worker endpoint |
| `whatsapp:send` / `templates` | Existing Meta send/templates |

Clinic admin inherits ALL. Coordinators get WHATSAPP_STAFF set.

---

## 20. Webhook handling

- Existing Meta webhook **unchanged**
- Incoming messages still update Conversation/Message
- Future: on inbound, resume WAITING executions linked to `conversationId` (documented gap)

---

## 21. Idempotency

- Unique `(clinicId, idempotencyKey)`
- Key = SHA-256 of `clinic|flow|triggerType|triggerEventId|patient` (truncated)
- Duplicate event returns existing execution (`duplicate: true`) without resending

---

## 22. Tests

| Check | Result |
|-------|--------|
| `prisma generate` | Pass |
| `@smrkomed/api` typecheck | Pass |
| `@smrkomed/web` typecheck | Pass |
| Dedicated whatsapp-automation API test file | **Not added** this pass |
| Live Meta send in CI | Not run (credentials) |

---

## 23–25. What works / credentials / worker

### CODE VERIFIED
- Flow CRUD, duplicate, validate, activate guards, pause, archive
- Visual vertical builder (persist definition)
- Simulation test (no send)
- Overview KPIs from DB
- KB CRUD + AI prompt injection
- Execution logs UI
- Library seed (10 recommended drafts)
- Triggers on patient / appointment / care-task create
- Engine steps for template/task/escalate/wait/condition

### REQUIRES CREDENTIALS (Meta)
- Live SEND_TEMPLATE delivery
- Template sync / connection status green
- Delivery/read receipts from Meta

### REQUIRES PRODUCTION WORKER
- Resume WAIT (`POST .../internal/resume-due` on cron)
- Scheduled triggers (tomorrow, due, inactive, medicine schedules)
- Appointment-missed / payment-due emitters

### UI ONLY / PARTIAL
- Broadcasts (architecture reserved — not mass-send)
- Full drag-canvas with zoom/fit (vertical card builder shipped instead of @xyflow)
- Inbox “Automation: Flow name” strip (logs/Care Tasks cover handoff for now)
- Free-text WhatsApp session messages

### NOT IMPLEMENTED
- Separate WorkflowNode/Edge tables
- Second WhatsApp provider
- Auto clinical decisions / appointment status mutation from patient YES
- Unrestricted bulk broadcast

---

## 26. Known limitations

1. WAIT without cron stays WAITING forever.
2. Activate requires APPROVED Meta templates for every SEND_TEMPLATE node.
3. Linear re-wire on “add node” may flatten complex branch graphs — edit carefully / duplicate library flows.
4. Simulation does not yet force CONDITION branch via UI toggle (config `simulateBranch` supported in engine).
5. `SEND_TEXT` intentionally no-ops with explanation.
6. Migration must be applied per environment before APIs work.

---

## 27. Production deployment requirements

1. Run migration `20260828190000_whatsapp_automation_flows`
2. Deploy API + web
3. Connect WhatsApp (existing Settings) + sync APPROVED templates
4. Cron (example every minute): authenticated `POST /api/v1/whatsapp-automation/internal/resume-due` with a service clinic admin session or extend with internal secret (preferred hardening)
5. Optional crons to emit `APPOINTMENT_TOMORROW`, `CARE_TASK_DUE`, `MEDICINE_REMINDER`, `PAYMENT_PENDING`
6. Do not enable library flows as ACTIVE without duplicate + clinic review

---

## 28. Manual testing checklist

1. Login as clinic admin  
2. Open `/whatsapp` — overview loads (zeros → “Not enough data” ok)  
3. Templates — sync from Meta (if connected)  
4. Flows — Recommended library appears  
5. Duplicate a library flow → Edit builder → Save draft  
6. Test simulation — confirm note “No WhatsApp messages were sent”  
7. Activate — expect clear error if template missing / WhatsApp disconnected  
8. With credentials + approved template — activate → create patient → check Logs  
9. Inbox still lists same conversations  
10. Knowledge Base create/publish → ask Smrko AI about policy  
11. Pause flow; cancel waiting execution if any  
12. Confirm Clinic B cannot see Clinic A flows (second clinic login)  
13. Mobile: flows list + builder usable (step cards, not desktop-only canvas squeeze)  

---

## Feature classification summary

| Feature | Classification |
|---------|----------------|
| Overview dashboard | CODE VERIFIED |
| Flows list + library | CODE VERIFIED |
| Flow builder (vertical) | CODE VERIFIED |
| Flow validation / activate guards | CODE VERIFIED |
| Simulation test | CODE VERIFIED |
| Live template send in flows | REQUIRES CREDENTIALS |
| WAIT resume | REQUIRES PRODUCTION WORKER |
| Scheduled appointment/care/medicine triggers | REQUIRES PRODUCTION WORKER |
| Knowledge Base | CODE VERIFIED |
| AI + KB | CODE VERIFIED (needs OpenAI key) |
| Automation logs | CODE VERIFIED |
| Inbox reuse | CODE VERIFIED |
| Inbox automation badges | PARTIAL / UI ONLY |
| Broadcasts | NOT IMPLEMENTED (shell) |
| Meta connection / webhooks | LIVE INTEGRATION VERIFIED only when credentials present (Stage 1 stack) |

---

**Bottom line:** SmrkoMed now has a real, clinic-scoped WhatsApp Automation Center on top of the existing Meta stack — flows, engine, KB, logs, and event hooks — without inventing a second messaging system. Live messaging and timed resumes still need Meta credentials and a production worker; those gaps are documented, not faked.
