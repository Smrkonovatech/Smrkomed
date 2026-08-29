# SMRKOMED WhatsApp Master Audit

**Date:** 2026-08-28  
**Stage:** **STAGE 1 ONLY — read-only inspection**  
**Scope:** Existing WhatsApp Automation Center + Meta Cloud API + related clinic modules  
**Code changes in this stage:** **None**

Related prior docs (do not replace; this is the master consolidation):

- `SMRKOMED_WHATSAPP_STAGE2_AUDIT.md`
- `SMRKOMED_WHATSAPP_IMPLEMENTATION_REPORT.md`
- `docs/integrations/whatsapp.md`
- `SMRKOMED_ENVIRONMENT.md`

---

## Executive summary

SmrkoMed already has a **real Meta WhatsApp Cloud API stack** and a **Stage 2 Automation Center** (flows, executions, KB, logs) built on top of it. The correct path is **extend and harden**, not rebuild.

| Verdict | Detail |
|---------|--------|
| Messaging / Meta core | Production-oriented and covered by API tests (`whatsapp.test.ts`) |
| Automation Center | Backend + UI present; engine is real but incomplete vs Twilio/HubSpot depth |
| Biggest blockers | Meta credentials for live send; **no production worker/cron** for WAIT / scheduled triggers |
| Must not rebuild | Meta Graph, Conversation/Message, Consent, WhatsAppAccount/Template, Smrko AI, Care Loop/Pharmacy/Appointments stores |

---

## 1. Current architecture

```
Clinic session (Auth.js + tenant middleware)
        │
        ├─ /api/v1/integrations/whatsapp/*     ← Meta connect, templates, send, inbox, analytics
        ├─ /api/v1/webhooks/whatsapp           ← signed Meta webhooks
        └─ /api/v1/whatsapp-automation/*       ← flows, executions, KB, overview, resume-due
                │
                ├─ engine.ts (runExecution / WAIT / SEND_TEMPLATE / CareTask / escalate)
                ├─ triggers.ts (dispatchWhatsAppTrigger)
                └─ sendWhatsAppTemplate (existing messaging.ts — APPROVED only)
                        │
                        ▼
              Meta Graph API (encrypted clinic credentials)
                        │
                        ▼
         Conversation / Message / Consent (clinic-scoped)
```

**UI surface:** `/whatsapp/*` layout + `WhatsAppNav` (design system shared with rest of app).

**AI:** Existing `POST /api/ai/chat` + `runSmrkoAiChat`; published KB articles injected into system prompt. **No second AI.**

---

## 2. What must NOT be rebuilt

| Asset | Location | Rule |
|-------|----------|------|
| Meta Graph / Embedded Signup / OAuth state | `apps/api/src/integrations/providers/whatsapp/*` | Extend only |
| Template sync / APPROVED send | `sync.ts`, `messaging.ts` | Reuse |
| Signed webhooks + IntegrationEvent idempotency | `webhook.ts`, public routes | Reuse |
| Conversation / Message / Consent | Prisma + clinic APIs | **No second inbox** |
| WhatsAppAccount / WhatsAppTemplate / Integration | Prisma | Reuse |
| WhatsAppFlow + Execution + Step + KnowledgeArticle | Prisma (already added) | Extend, don’t duplicate |
| Smrko AI Buddy | `apps/web/src/lib/ai/*`, `/api/ai/chat` | Reuse |
| Care Loop / Pharmacy / Appointments / Patients | Existing modules | Hook only |
| Design system | `ui-kit`, sidebar, WhatsApp nav | Match, don’t fork |

**Do not create:** second WhatsApp provider, second Conversation store, second chatbot, parallel `AutomationRule` runner as a second engine (legacy model exists but is unused for multi-step flows).

---

## 3. Database inventory

### Core messaging (stable — reuse)

| Model | Role | Status |
|-------|------|--------|
| `WhatsAppAccount` | Clinic phone / WABA link | ✅ CODE VERIFIED (tests) |
| `WhatsAppTemplate` | Meta-synced templates + status | ✅ CODE VERIFIED |
| `Integration` | Provider connection + encrypted credentials | ✅ CODE VERIFIED |
| `IntegrationEvent` | Webhook idempotency + encrypted payload | ✅ CODE VERIFIED |
| `Conversation` | Clinic WhatsApp threads | ✅ CODE VERIFIED |
| `Message` | Inbound/outbound + delivery status | ✅ CODE VERIFIED |
| `Consent` | WhatsApp revocation checks on send | ✅ CODE VERIFIED |
| `AutomationRule` | Legacy simple rules | 🟡 Present; **no multi-step runner** — Flows supersede for workflows |

### Automation Center (Stage 2)

| Model | Role | Status |
|-------|------|--------|
| `WhatsAppFlow` | Definition Json `{nodes,edges}`; DRAFT/ACTIVE/PAUSED/ARCHIVED; library flags | ✅ CODE VERIFIED (schema + API) |
| `WhatsAppFlowExecution` | Run + `idempotencyKey` + `resumeAt` | ✅ CODE VERIFIED |
| `WhatsAppFlowExecutionStep` | Per-node history | ✅ CODE VERIFIED |
| `WhatsAppKnowledgeArticle` | Clinic KB DRAFT/PUBLISHED/ARCHIVED | ✅ CODE VERIFIED |

### Related clinical (hook targets — do not duplicate)

Patients, Couples, Appointments, CareTask / CarePlan, Pharmacy medication reminders, Billing/Payments, AuditLog, Notification, Staff/User/RBAC.

### Likely future migrations (not required for Stage 1)

| Gap | Possible models / fields |
|-----|--------------------------|
| Broadcasts | Audience snapshot, BroadcastJob, BroadcastRecipient, consent snapshot |
| Execution hardening | `retryCount`, lock/`lockedAt`, PAUSED execution status |
| Inbox assignment | Conversation assignee / status fields if missing |
| KB tags | `tags String[]` or join table |
| Richer template metadata | Header/body/footer Json if Meta payload not stored fully today |

**Do not** `prisma migrate reset`. Additive migrations only when Stage work proves need.

---

## 4. API inventory

### Meta / clinic WhatsApp — `/api/v1/integrations/whatsapp`

| Endpoint | Purpose | Classification |
|----------|---------|----------------|
| GET `/`, `/status` | Connection status | ✅ CODE VERIFIED (tests) |
| POST `/connect`, `/callback`, `/disconnect` | Embedded Signup lifecycle | ✅ CODE VERIFIED |
| POST `/sync`, GET `/templates` | Template sync/list | ✅ CODE VERIFIED |
| POST `/messages/template` | Send APPROVED only | 🔵 Needs Meta for live; ✅ code + tests with mocks |
| GET `/conversations`, `/:id` | Inbox data | ✅ CODE VERIFIED |
| GET `/analytics` | Message/conversation KPIs | ✅ CODE VERIFIED (real counts) |

### Public webhook — `/api/v1/webhooks/whatsapp`

| Capability | Classification |
|------------|----------------|
| Verify challenge | ✅ CODE VERIFIED |
| Signature verification | ✅ CODE VERIFIED |
| Inbound message → Conversation/Message | ✅ CODE VERIFIED |
| Delivery/read/failed status | ✅ CODE VERIFIED |
| Template status updates | ✅ CODE VERIFIED (via sync/webhook mapping) |
| Resume WAITING flows on inbound | 🔴 NOT IMPLEMENTED |

### Automation — `/api/v1/whatsapp-automation`

| Endpoint | Purpose | Classification |
|----------|---------|----------------|
| GET `/overview` | Automation dashboard KPIs | ✅ CODE VERIFIED |
| CRUD `/flows` + duplicate/activate/pause/archive/validate | Flow lifecycle | ✅ CODE VERIFIED |
| POST `/flows/:id/test` | Simulation (no live send) | ✅ CODE VERIFIED |
| POST `/flows/:id/trigger` | Manual live run | 🔵 Needs Meta/templates for send nodes |
| GET `/executions`, `/:id`, cancel | Logs | ✅ CODE VERIFIED |
| KB CRUD `/knowledge` | Clinic articles | ✅ CODE VERIFIED |
| GET `/variables` | Variable catalog | ✅ CODE VERIFIED |
| POST `/internal/resume-due` | WAIT resume | 🟡 Code exists; **requires cron + auth hardening** |

### Trigger hooks already calling `dispatchWhatsAppTrigger`

| Event | Module | Classification |
|-------|--------|----------------|
| `PATIENT_CREATED` | `patients/index.ts` | ✅ CODE VERIFIED (wired) |
| `APPOINTMENT_BOOKED` | `appointments/index.ts` | ✅ CODE VERIFIED (wired) |
| `CARE_TASK_CREATED` | `care-loop/index.ts` | ✅ CODE VERIFIED (wired) |
| Payment / medicine / due / missed / inactive / scheduled | — | 🔴 Not wired (engine supports types) |

---

## 5. UI inventory

| Route | Status | Notes |
|-------|--------|-------|
| `/whatsapp` Overview | ✅ Real API data | `/whatsapp-automation/overview`; empty → honest zeros / notes |
| `/whatsapp/inbox` | ✅ Reuses Conversation APIs | Automation hint when patient has open execution; not full Intercom context panel |
| `/whatsapp/flows` | ✅ List + library + actions | |
| `/whatsapp/flows/new`, `/flows/[id]` | 🟡 Builder | Vertical card path — **not** full drag-canvas / zoom / free edges UI |
| `/whatsapp/templates` | 🟡 Useful | Sync + local draft preview; does **not** claim Meta approval for drafts |
| `/whatsapp/knowledge-base` | ✅ CRUD UI | Tags / richer sections partial vs master vision |
| `/whatsapp/logs` | ✅ Executions list/detail | |
| `/whatsapp/settings` | ✅ Connection panel | Existing Meta connection |
| `/whatsapp/automations` | Redirect → Flows | Single engine — correct |
| `/whatsapp/broadcasts` | 🔴 UI placeholder only | Stage 7 shell |
| `/whatsapp/contacts` | 🔴 UI placeholder only | Should reuse Patient+Consent |
| `/whatsapp/analytics` | 🔴 Missing nav/page | Metrics split across Overview + integrations analytics |

**Nav:** `WhatsAppNav` includes Overview, Inbox, Automations, Flows, Templates, KB, Contacts, Broadcasts, Logs, Settings. **No Analytics** item yet. Sidebar group exposes a subset (Overview/Inbox/Templates/Settings).

**Design:** Uses existing SMRKOMED components — keep it that way.

---

## 6. Workflow engine capabilities (today)

### Node types (`types.ts` / `engine.ts`)

| Node | Behavior | Classification |
|------|----------|----------------|
| TRIGGER | Entry | ✅ |
| WAIT | Sets `WAITING` + `resumeAt` | 🟡 Persist ✅; resume 🔵 worker |
| CONDITION | Mostly `patient_replied` | 🟡 Shallow vs full condition builder |
| SEND_TEMPLATE | Meta APPROVED via existing helper | 🔵 Live needs credentials |
| SEND_TEXT | Explicit no-op with reason | 🔴 By design until session window |
| CREATE_TASK | CareTask | ✅ |
| ESCALATE / NOTIFY_STAFF | CareTask + Notification | ✅ |
| AI_DRAFT | Does not send | ✅ Safe stub |
| ASSIGN_STAFF | Skipped with reason | 🟡 |
| END | Completes | ✅ |

### Triggers declared vs wired

| Trigger type | Declared | Live dispatch |
|--------------|----------|---------------|
| PATIENT_CREATED | ✅ | ✅ |
| APPOINTMENT_BOOKED | ✅ | ✅ |
| CARE_TASK_CREATED | ✅ | ✅ |
| MANUAL | ✅ | ✅ API |
| APPOINTMENT_TOMORROW / MISSED | ✅ | 🔴 Needs cron |
| CARE_TASK_DUE / OVERDUE | ✅ | 🔴 Needs cron |
| MEDICINE_REMINDER | ✅ | 🔴 Pharmacy schedules reminders separately; not yet → WhatsAppFlow |
| PAYMENT_* | ✅ | 🔴 |
| PATIENT_INACTIVE / CONSULTATION / SCHEDULED / INCOMING | ✅ | 🔴 |

### Library / system templates

10 recommended flows in `library.ts` (welcome, appointment, care, medicine, payment, inactive, consultation, overdue…). Seeded as **DRAFT + `isLibrary`**. Activate blocked until duplicate. **Not** fully immutable “SYSTEM TEMPLATE” lock beyond activate/UI library banner — Stage 2 hardening candidate.

### Idempotency

`clinicId` + hashed `idempotencyKey` (clinic|flow|triggerType|eventId|patient) — ✅ CODE VERIFIED pattern. Duplicate event returns existing execution.

### Simulation

`POST .../test` — skips live WhatsApp; WAIT skipped instantly — ✅.

---

## 7. Knowledge Base + Smrko AI

| Capability | Status |
|------------|--------|
| Clinic-scoped articles | ✅ |
| DRAFT / PUBLISHED / ARCHIVED | ✅ |
| Published → AI system prompt | ✅ (`loadClinicKnowledgeSnippet`) |
| AI auto-send WhatsApp | 🔴 Correctly absent |
| Tags / rich category taxonomy / publish workflow polish | 🟡 Partial vs master vision |
| Cross-clinic leak | Session `clinicId` only — ✅ pattern |

---

## 8. Permissions / RBAC

Existing keys in `permissions.ts`:

- `whatsapp:view`, `whatsapp:send`, `whatsapp:flows`, `whatsapp:templates`, `whatsapp:kb`, `whatsapp:logs`, `whatsapp:settings`

| Gap vs master vision | Notes |
|----------------------|-------|
| Separate `inbox` / `broadcast` / `analytics` keys | Not split yet — use view/send today |
| UI route gating by WhatsApp permission | 🟡 Mostly relies on API 403; sidebar not fine-grained |
| Role mapping | Coordinators get WHATSAPP_STAFF; doctors/reception get subset |

Authorization is **server-side** via session tenant — keep this; never trust body `clinicId`.

---

## 9. Care Loop / Appointments / Pharmacy / Payments

| Integration | Status |
|-------------|--------|
| Care Task create from flow | ✅ |
| Care Task create → trigger | ✅ |
| Care due/overdue → WhatsApp | 🔴 Worker |
| Appointment booked → trigger | ✅ |
| Reminder 24h before / missed | 🔴 Worker + status events |
| Pharmacy `scheduleMedicationReminders` | Exists in pharmacy module; **not** dispatching WhatsAppFlow |
| Payments pending/received → flow | 🔴 Not hooked |

**Care Loop must not be duplicated** — escalate/create task into existing models only.

---

## 10. Production blockers

| Blocker | Impact |
|---------|--------|
| Meta app + Embedded Signup + WABA connected | No live templates/send |
| `INTEGRATION_ENCRYPTION_KEY`, Meta env vars | Credential storage / Graph |
| **No worker/cron process** | WAIT stuck; scheduled triggers never fire |
| `resume-due` needs clinic-admin session or better internal auth | Cron security |
| Migration `20260828190000_whatsapp_automation_flows` applied per env | APIs fail without it |
| OpenAI key | AI + KB answers only |

See `SMRKOMED_ENVIRONMENT.md` for variable classification (never put tokens in `NEXT_PUBLIC_*`).

---

## 11. Security risks & gaps (inspect-only)

| Risk | Severity | Notes |
|------|----------|-------|
| Clinic isolation (conversations) | Mitigated | Covered in `whatsapp.test.ts` |
| Flow/KB/execution isolation | Pattern OK | Session clinicId; ⚠️ add dedicated automation isolation tests |
| Token exposure | Mitigated | Encrypted credentials; tests assert secrets not returned |
| Webhook unsigned | Mitigated | Signature required |
| Cron calling resume-due with user cookie | Medium | Prefer internal secret / service principal |
| AI inventing policy | Mitigated if published KB only | Prompt still needs “according to clinic knowledge” polish |
| Broadcast mass-send | N/A | Not built — keep gated |
| Free-text auto-send | Mitigated | SEND_TEXT no-ops |
| Library flow edit | Low | UI discourages; harden SYSTEM immutability later |

---

## 12. Testing status

| Suite | Coverage |
|-------|----------|
| `apps/api/src/whatsapp.test.ts` | Connect, sync, send APPROVED-only, webhook verify/sign/idempotency, clinic isolation, disconnect, admin monitoring |
| WhatsApp automation module tests | 🔴 Not dedicated yet |
| Web Playwright for `/whatsapp/*` | 🔴 Not verified in this audit |
| Typecheck | Previously green for api/web after Stage 2 (re-verify each stage) |

---

## 13. Feature matrix (master vision vs today)

| Capability | Classification |
|------------|----------------|
| Connect WhatsApp Business | ✅ CODE VERIFIED / 🔵 CONFIGURATION REQUIRED for live |
| Sync Meta templates | ✅ / 🔵 |
| Template management UX (categories, Meta submit) | 🟡 PARTIALLY IMPLEMENTED |
| Visual flow builder (Studio-grade canvas) | 🟡 Vertical builder only |
| Conditions (rich healthcare fields) | 🟡 Minimal |
| WAIT / schedule engine | 🟡 Persist ✅; worker 🔵 |
| Healthcare workflow library | ✅ Seeded drafts |
| Knowledge Base | ✅ Core; 🟡 tags/IA |
| Inbox + automation context | 🟡 Basic + hint |
| Execution logs | ✅ |
| Broadcasts (safe) | 🔴 NOT IMPLEMENTED (placeholder) |
| Staff WhatsApp RBAC | 🟡 Keys exist; UX/roles incomplete |
| Analytics page | 🟡 Overview only |
| Failed message retries | 🟡 Meta status tracked; flow retry/lock thin |
| Idempotency | ✅ |
| Clinic isolation | ✅ Pattern + messaging tests |
| Care Loop deep loop | 🟡 Partial hooks |
| Pharmacy reminders → WhatsAppFlow | 🔴 |
| Appointment reminder scheduling | 🔴 |
| Smrko AI draft (no auto-send) | ✅ Pattern |
| Production worker | 🔴 Infrastructure missing |

Legend: ✅ CODE VERIFIED · 🟡 PARTIAL · 🔵 CONFIG REQUIRED · 🔴 NOT IMPLEMENTED · ⚠️ MANUAL TEST REQUIRED

---

## 14. What works / partial / UI-only / backend-ready / Meta / cron / DB

### Works (reuse immediately)

Meta connect/sync/send/webhook; Conversations inbox APIs; Flow CRUD + simulation + activate guards; Execution logs; KB + AI injection; Overview real counts; Patient/appointment/care-task trigger dispatch; Idempotent executions; Clinic-scoped Prisma models.

### Partially implemented

Flow builder UX; Condition engine; WAIT resume path; Template categories/submit; Inbox patient context; RBAC fine-grained UI; Library system immutability; Overview vs dedicated Analytics.

### UI-only / shell

Broadcasts; Contacts; (Automations = redirect, not shell).

### Backend-ready but not production-complete

`resumeDueExecutions`; trigger type constants without emitters; SEND_TEMPLATE path behind credentials.

### Requires Meta credentials

Live messaging, live template sync, connection health green, delivery/read in real traffic.

### Requires worker/cron

WAIT resume; appointment-tomorrow/missed; care due/overdue; inactive; scheduled; medicine→flow; payment due emitters.

### Requires database changes (future stages only)

Broadcast entities; optional execution lock/retry; KB tags; richer conversation assignment if product requires.

---

## 15. Recommended implementation order (after approval)

Aligned with your stage plan — **do not start until Stage 1 approved**:

| Stage | Focus | Primary reuse |
|-------|--------|---------------|
| **2** | Flow builder + engine hardening (conditions, WAIT lock/retry, system templates) | `whatsapp-automation/*` |
| **3** | Knowledge Base polish (tags, IA, AI phrasing) | KB model + AI service |
| **4** | Inbox + automation context | Conversation APIs |
| **5** | Triggers: Care Loop, Appointments, Pharmacy | `dispatchWhatsAppTrigger` |
| **6** | Templates + Meta sync UX | Existing sync/messaging |
| **7** | Controlled broadcasts | **New** models + consent |
| **8** | Analytics + logs depth | Overview + Message aggregates |
| **9** | RBAC + audit + security tests | permissions + audit |
| **10** | Production: cron, Meta, migrations, checklist | Env + worker |

**Stop rule:** Do not advance if typecheck/lint/blocking tests fail.

---

## 16. Stage 1 conclusion

| Question | Answer |
|----------|--------|
| Rebuild WhatsApp? | **No** |
| Second AI / inbox? | **No** |
| Ready for Stage 2? | **Yes**, after explicit approval |
| Highest value next | Harden visual builder + condition evaluation + WAIT worker contract |
| Highest production risk | Shipping WAIT/schedules without cron; claiming Meta send without credentials |

---

## STOP

**Stage 1 complete.** No application code was modified.

Await approval before **Stage 2** (Flow builder + workflow engine hardening).
