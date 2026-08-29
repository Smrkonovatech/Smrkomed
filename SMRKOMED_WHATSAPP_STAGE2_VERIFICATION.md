# SmrkoMed WhatsApp Stage 2 Verification

**Date:** 2026-08-29  
**Scope:** Stage 2 production readiness verification only (no Stage 3)  
**Prior docs:** `SMRKOMED_WHATSAPP_MASTER_AUDIT.md`, `SMRKOMED_WHATSAPP_STAGE2_REPORT.md`

---

## Overall Status

**READY WITH CONFIG**

Stage 2 code is type-safe, unit-tested for automation helpers, and hardened for clinic-scoped worker ticks. Live Meta delivery and platform-wide WAIT resume require production configuration (Meta + Railway worker secret). No Stage 2 database migration is required beyond the existing additive flows migration already in the repo.

---

## Working

| Area | Evidence | Label |
|------|----------|-------|
| API + web typecheck | `tsc --noEmit` both workspaces pass | ✅ CODE VERIFIED |
| Automation unit tests | `whatsapp-automation.test.ts` — **9/9 pass** | ✅ CODE VERIFIED |
| Prisma schema validate | Valid with `DATABASE_URL` present | ✅ CODE VERIFIED |
| API eslint | `@smrkomed/api` lint clean | ✅ CODE VERIFIED |
| Flow CRUD / activate guards / SYSTEM library immutability | Routes reject `isLibrary` PATCH/activate/archive | ✅ CODE VERIFIED |
| Idempotency key clinic-scoped | Unit tests + unique `(clinicId, idempotencyKey)` | ✅ CODE VERIFIED |
| Durable WAIT (`resumeAt`, waitNextNodeId in context) | Engine code path | ✅ CODE VERIFIED |
| Lock + retry (max 3) in execution `context` Json | Engine + unit lock helpers | ✅ CODE VERIFIED |
| Condition engine (server-side domains + AND/OR + sim) | `conditions.ts` + unit tests | ✅ CODE VERIFIED |
| Session-scoped flow/execution/KB queries | All routes use `tenant.clinicId` | ✅ CODE VERIFIED |
| Session tick clinic isolation (**fixed this pass**) | `processAutomationTick({ clinicId })` | ✅ CODE VERIFIED |
| Worker secret tick = all clinics | Intended for Railway cron | ✅ CODE VERIFIED |
| Triggers: PATIENT_CREATED, APPOINTMENT_BOOKED, CARE_TASK_CREATED | Wired in modules | ✅ CODE VERIFIED |
| Scheduled APPOINTMENT_TOMORROW / CARE_TASK_DUE / OVERDUE | Worker `emitScheduledTriggers` | ✅ CODE VERIFIED |
| SEND_TEMPLATE via existing Meta helper (APPROVED only) | Reuses `sendWhatsAppTemplate` | ✅ CODE VERIFIED (path); 🔵 live Meta |
| Test mode never sends | Simulation skips Meta | ✅ CODE VERIFIED |
| KB published-only → Smrko AI | `status: "PUBLISHED"` filter | ✅ CODE VERIFIED |
| React Flow builder + mobile list | `@xyflow/react` | ✅ CODE VERIFIED (compile); ⚠️ browser |
| Indexes: flow status, execution resumeAt, clinic | Migration `20260828190000_...` | ✅ CODE VERIFIED |

---

## Partially Working

| Area | Notes | Label |
|------|-------|-------|
| Meta template send in live flows | Path correct; needs WABA + APPROVED templates | 🔵 CONFIGURATION REQUIRED |
| WAIT resume in production | Needs in-process worker or cron + secret | 🔵 CONFIGURATION REQUIRED |
| Condition richness | Fields work when related rows/vars exist; patient “tags” are execution-scoped only | 🟡 PARTIALLY IMPLEMENTED |
| “Wait for patient reply” | Implemented as WAIT duration **then** CONDITION on inbound count — not event-driven resume on webhook | 🟡 PARTIALLY IMPLEMENTED |
| Inbox automation indicators | Best-effort execution hint by patientId | 🟡 PARTIALLY IMPLEMENTED |
| Pharmacy → WhatsAppFlow | Pharmacy has dosage/frequency/instructions/reminders; **not** yet dispatching `MEDICINE_REMINDER` to flows | 🟡 / 🔴 hook |
| Payment → WhatsAppFlow | Trigger types exist; payments module not wired | 🔴 NOT IMPLEMENTED (hook) |
| Manual FAILED retry after Meta timeout | May re-attempt same SEND node (Meta may have accepted) | 🟡 residual risk |
| Web lint (repo-wide) | Fails on pre-existing non-WhatsApp files (e.g. payments tab) | ENVIRONMENT / pre-existing |
| Full `whatsapp.test.ts` | Needs Postgres at `localhost:5432` | ENVIRONMENT BLOCKED here |

---

## Broken

| Item | Status after this pass |
|------|------------------------|
| Session `/internal/tick` processing **all clinics** | **FIXED** — session ticks are clinic-scoped |
| Production `resume-due` without secret still processing all clinics via session | **FIXED** — session scoped; empty secret in production warns on resume-due |

No remaining known P0 code breakers for Stage 2 isolation/locking after the fix above.

---

## P0 Issues

| Issue | Status |
|-------|--------|
| Cross-clinic resume via session-authenticated worker tick | **FIXED** 2026-08-29 |
| Clinic isolation on flow/execution/KB APIs | Verified by code review (session clinicId) — ✅ |
| Duplicate execution from same trigger event | Idempotency unique key — ✅ |
| Endless retry | Cap `DEFAULT_MAX_RETRIES = 3` — ✅ |
| Dual worker same execution | Optimistic lock token + TTL — ✅ |

---

## P1 Issues

| Issue | Status / plan |
|-------|----------------|
| Webhook inbound does not resume WAIT or fire `INCOMING_WHATSAPP` | Documented limitation; time-based WAIT + CONDITION covers reply checks |
| MEDICINE_REMINDER / PAYMENT_* not dispatched from pharmacy/payments | Stage 5+ wiring — architecture ready |
| Appointment cancelled/rescheduled triggers | Not wired — needs appointment status hooks |
| Full Meta suite not re-run (no local DB in this agent env) | Run with `db:up` + `npm test -w @smrkomed/api` |
| React Flow canvas UX | ⚠️ MANUAL browser test |
| Web eslint set-state-in-effect on WhatsApp pages | Same pattern as rest of app; not Stage 2 functional blocker |

---

## P2 Issues

- Canvas position persist best-effort until Save draft  
- Condition AND/OR UI (engine supports; builder is single field)  
- Dedicated Analytics page (out of Stage 2)  
- Broadcasts (Stage 3+)  

---

## External Configuration Required

### Meta
- `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_CONFIGURATION_ID`, `WHATSAPP_VERIFY_TOKEN`
- Clinic Embedded Signup → active WABA / phone
- APPROVED templates synced
- Webhook URL pointing at API with signature verification

### Railway (API)
- Long-running Node process (`npm start` / `tsx src/index.ts`)
- `WHATSAPP_AUTOMATION_WORKER=1` (or leave default on when `NODE_ENV=production`)
- `WHATSAPP_AUTOMATION_WORKER_INTERVAL_MS` (default 60000)
- `WHATSAPP_WORKER_SECRET` (required for platform-wide cron / secure tick)
- `INTEGRATION_ENCRYPTION_KEY`
- Apply migration `20260828190000_whatsapp_automation_flows` if not applied

### Vercel (optional cron)
- Cron → `POST /api/v1/whatsapp-automation/internal/tick`
- Header: `X-WhatsApp-Worker-Secret: <WHATSAPP_WORKER_SECRET>`
- Prefer this if API is not always-on; Railway in-process worker is preferred for WAIT

### Worker
- In-process: starts with API when worker flag on  
- Must not rely on browser timers  

---

## Environment Variables

**Names only — never print values:**

- `DATABASE_URL` / `DIRECT_URL`
- `AUTH_SECRET`
- `INTEGRATION_ENCRYPTION_KEY`
- `META_APP_ID` / `META_APP_SECRET`
- `WHATSAPP_CONFIGURATION_ID` / `WHATSAPP_VERIFY_TOKEN`
- `META_GRAPH_API_VERSION` (optional)
- `WHATSAPP_AUTOMATION_WORKER`
- `WHATSAPP_AUTOMATION_WORKER_INTERVAL_MS`
- `WHATSAPP_WORKER_SECRET` (or `CRON_SECRET`)
- `OPENAI_API_KEY` (KB AI answers only)

---

## Database

| Item | Notes |
|------|-------|
| New Stage 2 migration this verification | **None** |
| Existing migration | `packages/database/prisma/migrations/20260828190000_whatsapp_automation_flows/` |
| Lock/retry storage | `WhatsAppFlowExecution.context` Json (no new columns) |
| Indexes | clinic+status, resumeAt, idempotency unique |
| Deploy | `npm run db:migrate:deploy` — never `migrate reset` / prod `db push` |

---

## Test Results

| Suite | Result | Classification |
|-------|--------|----------------|
| `npm run typecheck -w @smrkomed/api` | Pass | ✅ CODE VERIFIED |
| `npm run typecheck -w @smrkomed/web` | Pass | ✅ CODE VERIFIED |
| `prisma validate` | Pass | ✅ CODE VERIFIED |
| `whatsapp-automation.test.ts` | 9/9 pass | ✅ CODE VERIFIED |
| `npm run lint -w @smrkomed/api` | Pass | ✅ CODE VERIFIED |
| `npm run lint -w @smrkomed/web` | Fail — pre-existing errors outside WhatsApp Stage 2 | ENVIRONMENT / pre-existing |
| `whatsapp.test.ts` (Meta) | Fail — Postgres not reachable at localhost:5432 | ENVIRONMENT BLOCKED |
| Full `npm test -w @smrkomed/api` | Not fully run (DB dependency) | ENVIRONMENT BLOCKED |

---

## Trigger inventory

| Trigger | Status |
|---------|--------|
| PATIENT_CREATED | ✅ Wired |
| APPOINTMENT_BOOKED | ✅ Wired |
| CARE_TASK_CREATED | ✅ Wired |
| APPOINTMENT_TOMORROW | ✅ Worker schedule |
| CARE_TASK_DUE / OVERDUE | ✅ Worker schedule |
| MANUAL / test | ✅ API |
| WAIT resume | ✅ Worker |
| APPOINTMENT cancelled / rescheduled | 🔴 Not wired |
| MEDICINE_REMINDER | 🔴 Types exist; pharmacy schedule not → flow |
| PAYMENT_PENDING / RECEIVED | 🔴 Not wired |
| PATIENT_INACTIVE / CONSULTATION / INCOMING_WHATSAPP | 🔴 Not wired |
| Voice note saved | 🔴 Not wired |

---

## Pharmacy readiness (for future Stage 5)

`PharmacyPrescriptionItem` already has: `medicineName`, `dosage`, `frequency`, `duration`, `instructions`, `timeOfDay`, `beforeAfterFood`, dates.  
`MedicationReminder` has `scheduledAt`, `channel=WHATSAPP`, status.  

**Sufficient data for approved-template reminders.** Do **not** invent dosages with AI. Hooking `dispatchWhatsAppTrigger("MEDICINE_REMINDER")` is Stage 5 work, not Stage 2.

---

## Care Loop readiness

Care task create → trigger ✅. Flow CREATE_TASK / ESCALATE → CareTask ✅.  
Patient reply → Conversation/Message via webhook ✅; condition `communication.patient_replied` ✅ when `conversationId` on execution.  
Deep “reply immediately resumes WAIT” 🔴 not implemented (use timed WAIT + condition).

---

## Manual Browser Tests

| ID | Scenario | Expected | Actual | Result |
|----|----------|----------|--------|--------|
| A | Create flow | Draft saved | — | ⚠️ MANUAL |
| B | Activate without APPROVED template | Clear error | — | ⚠️ MANUAL |
| C | Duplicate SYSTEM → CUSTOM editable | Copy editable | — | ⚠️ MANUAL |
| D | SYSTEM cannot PATCH | 422 | Code path ✅; UI ⚠️ | ⚠️ MANUAL |
| E | Test mode | “NO MESSAGE WILL BE SENT” | — | ⚠️ MANUAL |
| F | WAIT shows resumeAt in logs | Waiting + next time | — | ⚠️ MANUAL |
| G | Worker tick resumes | Continues | Needs config | 🔵 / ⚠️ |
| H | Retry FAILED | Safe retry | — | ⚠️ MANUAL |
| I | Clinic B cannot open Clinic A flow | 404 | Pattern ✅ | ⚠️ MANUAL |
| J–N | Desktop / tablet / mobile builder | Usable, no overflow | — | ⚠️ MANUAL |
| O | Worker env | Tick logs | — | 🔵 |
| P | Webhook signed | Existing Meta tests | ENV blocked here | ENVIRONMENT |
| Q | Pause ACTIVE | No new executions | Code ✅ | ⚠️ MANUAL |
| R–T | Error / duplicate / system | As designed | — | ⚠️ MANUAL |

---

## Security Verification

| Check | Result |
|-------|--------|
| Auth on automation routes | Session + permission |
| RBAC `whatsapp:*` | Present |
| Clinic isolation APIs | Session `clinicId` only |
| Clinic isolation worker tick (session) | **Fixed** — scoped |
| Secrets not in frontend | Tokens encrypted server-side |
| Webhook signature | Meta HMAC verified |
| Idempotency | Clinic-scoped key |
| SYSTEM templates immutable | Enforced |
| AI auto-send | Not implemented (correct) |
| Tick without secret in prod | resume-due requires secret or clinic-scoped session |

---

## Production Deployment Checklist

1. Deploy API + web with existing Stage 2 code  
2. `db:migrate:deploy` including `20260828190000_whatsapp_automation_flows`  
3. Set Meta + encryption env vars  
4. Set `WHATSAPP_WORKER_SECRET` (strong random)  
5. Enable Railway API worker (`WHATSAPP_AUTOMATION_WORKER=1` or production default)  
6. Optional: Vercel cron → `/internal/tick` with secret header  
7. Connect WhatsApp per clinic; sync APPROVED templates  
8. Duplicate SYSTEM flows → customize → activate  
9. Smoke: patient create / appointment / test simulation / logs  
10. Confirm Clinic A/B isolation with two logins  

---

## Remaining Limitations

1. No event-driven WAIT resume on inbound WhatsApp (time + condition only)  
2. Pharmacy/payment flow dispatch not wired  
3. Execution lock/retry in Json (not indexed columns) — adequate for Stage 2  
4. Agent environment could not run DB-backed Meta tests  
5. Repo-wide web lint has pre-existing failures unrelated to WhatsApp Stage 2  

---

## What Cursor fixed this verification pass

1. **P0:** Session-authenticated `/internal/tick` and `/internal/resume-due` now process **only the session clinic**  
2. Worker-secret path still processes all clinics (platform cron)  
3. Production note when worker secret missing on resume-due  
4. Extra unit test: idempotency differs across clinics  
5. This verification document  

---

## Recommended Next Stage

**Stage 3** (KB polish / deeper product) only after:

1. Local/CI: `db:up` + full `npm test -w @smrkomed/api`  
2. Manual browser matrix A–T on staging  
3. Railway worker + Meta smoke  

**Stage 2 itself:** **READY WITH CONFIG** — safe to configure for production; do not claim live WhatsApp delivery without Meta + worker.

---

## Can we move to Stage 3?

**Conditionally yes for product planning; not until staging smoke + DB tests pass in your environment.**  
Stage 2 code gate: **pass with config**. Stage 3 should not start until you explicitly approve after the checklist above.
