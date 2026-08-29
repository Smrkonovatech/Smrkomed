# SMRKOMED Platform Audit

**Date:** 2026-08-28  
**Method:** Static code inspection of the repository (Prisma schema, API modules, Next.js UI, env examples, seeds).  
**Not performed in this Stage 1 pass:** live browser E2E against a running DB, live Meta/OpenAI/gateway sandbox calls.  
**Legend:** ✅ Working · 🟡 Partial · 🔴 Broken · ⚪ UI only/mock · 🔵 Backend exists, UI incomplete · 🟣 Integration required · ⛔ Not implemented

**Status language for claims:**  
- `CODE VERIFIED` — evidenced by source  
- `RUNTIME NOT VERIFIED` — needs live environment  
- `BLOCKED — credential/API` — external provider not exercised  
- `UI ONLY` / `INTEGRATION READY — PROVIDER NOT CONNECTED` as applicable

---

## Executive summary

| Priority | Count (approx.) | Theme |
|----------|-----------------|-------|
| **P0** | 6 | Fake analytics KPIs; Care Loop automation stub; document blob storage missing; multi-clinic session limited to first membership; settings billing prefs local-only; Care Loop exception board demo-seeded |
| **P1** | 12 | WhatsApp production readiness; pharmacy↔Care Loop live link; payments sandbox verification; appointment reminders; voice/OpenAI ops; CRM ads; staff admin UI; landing dual apps |
| **P2** | 8 | Google Calendar; ABDM/ABHA; NHCX insurance; S3 docs; module activation nav; branches product use |
| **P3** | 6 | Multi-specialty workflows; FHIR; telehealth; labs; advanced AI; data warehouse |

**Strongest product layers (CODE VERIFIED):** Auth.js + API JWT cookie auth, couples/patients CRUD with `CREATE_COUPLE_FAILED` + `requestId`, staff list with loading/empty/error UX, Care Plan/Task CRUD APIs, Pharmacy module, Insurance Manual/Demo, Payments architecture (Razorpay/Cashfree/PayU + encryption), CRM leads/campaigns, Smrko AI tools (server OpenAI key).

---

## 1. Core platform

### Authentication / session

| Field | Value |
|-------|--------|
| Module | Core |
| Feature | Login, Auth.js session, API auth middleware |
| Frontend | ✅ Login + NextAuth credentials |
| Backend | ✅ JWT cookie decode (`authjs.session-token`) |
| Database | ✅ User, ClinicMembership |
| API | Web `/api/auth/*`; API has no login route |
| Integration | ✅ Shared `AUTH_SECRET` |
| Current problem | Multi-clinic: login takes **first** ACTIVE membership only; AppState `clinicId` can initialize from demo clinics |
| Root cause | `authorize` uses `memberships.take: 1`; UI not fully session-driven for clinic switch |
| Recommended fix | Clinic picker + JWT refresh; bind AppState clinic from session |
| Priority | **P0** (isolation risk if multi-clinic users exist) |
| Verified | CODE VERIFIED — `apps/web/src/lib/auth/auth.ts`, `apps/api/src/middleware/auth.ts` |

### Organizations / clinics / branches

| Field | Value |
|-------|--------|
| Feature | Org/clinic tenancy; ClinicBranch |
| Frontend | 🟡 Settings/onboarding; admin shows branches |
| Backend | 🟡 Org/clinic current + list; no clinic-facing branch CRUD |
| Database | ✅ Organization, Clinic, ClinicBranch |
| API | `GET /organizations/current`, `GET /clinics`, `GET /clinics/current` |
| Problem | Branch model unused for patients/appointments (all keyed by clinicId) |
| Priority | **P2** |
| Verified | CODE VERIFIED |

### Users / roles / permissions

| Field | Value |
|-------|--------|
| Feature | RBAC |
| Frontend | 🟡 Consumed in nav/dialogs; Settings team largely local |
| Backend | ✅ `/users/me`, `/users/staff`, `/users` |
| Database | ✅ Role, Permission, RolePermission, StaffRole enum |
| Roles present | CLINIC_ADMIN, DOCTOR, CARE_COORDINATOR, NURSE, RECEPTIONIST, PLATFORM_ADMIN, ORGANIZATION_ADMIN, COUNSELOR, MARKETING, READ_ONLY, PHARMACY_*, payments & insurance perms |
| Missing roles vs PRD | ACCOUNTANT, LAB_STAFF (not in ROLE_PERMISSIONS) |
| Priority | **P1** (staff admin UI); **P2** (accountant/lab roles) |
| Verified | CODE VERIFIED — `packages/database/src/permissions.ts` |

### Staff / doctor / coordinator dropdowns

| Field | Value |
|-------|--------|
| Feature | Staff load for Add Couple |
| Frontend | ✅ Loading / empty / error + Try again |
| Backend | ✅ `GET /api/v1/users/staff` |
| Problem | RUNTIME NOT VERIFIED for all Test A–J flows |
| Priority | **P0** to browser-verify in Stage 2 |
| Verified | CODE VERIFIED — `add-couple-dialog.tsx`, `clinic-api.ts` |

### Audit logs

| Field | Value |
|-------|--------|
| Feature | AuditLog writes |
| Frontend | 🟡 Activity feed |
| Backend | ✅ writeTenantAuditLog used across modules |
| Priority | **P1** (coverage gaps for some UI-only actions) |
| Verified | CODE VERIFIED |

### Settings

| Field | Value |
|-------|--------|
| Feature | Clinic settings sections |
| Frontend | 🟡 Mix of real panels (WhatsApp, Payments link) and local toast-only saves (billing prefs, some integrations toggles) |
| Priority | **P1** |
| Verified | CODE VERIFIED — `settings/page.tsx` |

---

## 2. Patients & couples

### Couple / patient creation

| Field | Value |
|-------|--------|
| Feature | Add Couple → patients + treatment + optional care plan/task + consent |
| Frontend | ✅ Dialog wired to API |
| Backend | ✅ Stepped create with `CREATE_COUPLE_FAILED` + `requestId` + step |
| Database | ✅ Patient, Couple, Treatment, CarePlan, CareTask, Consent |
| API | `POST /api/v1/couples` |
| Problem | Care plan labels in UI are strings, not DB `CarePlanTemplate`; Stage 1 did **not** run Tests A–J live |
| Recommended fix | Stage 2 browser matrix; map templates to DB templates |
| Priority | **P0** (verify runtime); template wiring **P1** |
| Verified | CODE VERIFIED — `couples/service.ts`, `errors.ts` |

### Patient list / profile / search

| Field | Value |
|-------|--------|
| Feature | Patients page + profile tabs |
| Frontend | ✅ List from couples API; profile tabs include pharmacy, insurance, financials |
| Backend | ✅ couples/patients GET |
| Priority | **P1** (timeline completeness varies by tab) |
| Verified | CODE VERIFIED |

### Clinic isolation (patients)

| Field | Value |
|-------|--------|
| Feature | Tenant scoping |
| Backend | ✅ Queries use session clinicId |
| Tests | Isolation tests exist in database package (need Postgres) |
| Priority | **P0** runtime verify |
| Verified | CODE VERIFIED pattern; RUNTIME NOT VERIFIED |

---

## 3. Care Loop (flagship)

### Care plans & tasks CRUD

| Field | Value |
|-------|--------|
| Feature | Create/list/update plans & tasks |
| Frontend | 🟡 `/care-plans`, `/tasks` API-backed; templates partly demo |
| Backend | ✅ `/care-plans`, `/care-tasks` |
| Database | ✅ CarePlan, CarePlanStep, CareTask, TaskAssignment |
| Priority | **P0** product path is present |
| Verified | CODE VERIFIED |

### Attention board / exceptions / automation

| Field | Value |
|-------|--------|
| Feature | Care Loop attention, escalations, automation rules, reminders engine |
| Frontend | ⚪ Exceptions from `seedExceptions` / local actions; hardcoded “AI handled” style stats |
| Backend | ⛔ No automation runner; Escalation/TaskReminder/AutomationRule schema + seed |
| Problem | Flagship UX not driven by live escalation API |
| Recommended fix | Load escalations from API; implement reminder/escalation worker; remove fake KPIs |
| Priority | **P0** |
| Verified | CODE VERIFIED — `care-loop/page.tsx`, schema models unused in app logic |

### Care Loop safety (AI clinical boundary)

| Field | Value |
|-------|--------|
| Feature | AI must not diagnose/prescribe |
| Status | ✅ Prompt/safety tooling present in AI layer; mutating actions require confirmation |
| Priority | Maintain as P0 policy |
| Verified | CODE VERIFIED — `lib/ai/safety.ts`, `/api/ai/action` |

---

## 4. Appointments

| Field | Value |
|-------|--------|
| Feature | Schedule CRUD + calendar tabs |
| Frontend | 🟡 List/check-in API; Remind is client-only; Availability uses demo team |
| Backend | ✅ GET/POST/PATCH `/appointments` |
| Integration | 🟣 WhatsApp/Google Calendar not auto |
| Priority | **P1** |
| Verified | CODE VERIFIED |

---

## 5. Documents

| Field | Value |
|-------|--------|
| Feature | Document metadata + upload UI |
| Frontend | ⚪ Upload dialog: metadata only; download exports .txt metadata |
| Backend | 🟡 POST creates Document without storageKey/multipart |
| Database | ✅ Document.storageKey optional |
| Storage | ⛔ S3 env present; **no TS upload implementation** |
| Priority | **P0** for real clinical docs; **P1** if pilot accepts metadata |
| Verified | CODE VERIFIED — `documents/index.ts`, upload dialog copy |

---

## 6. Pharmacy

| Field | Value |
|-------|--------|
| Feature | Products, inventory, sales, Rx, alerts, reports |
| Frontend | ✅ Full `/pharmacy/*` |
| Backend | ✅ `/api/v1/pharmacy/*` |
| Database | ✅ 11 pharmacy models + MedicationReminder |
| Care Loop link | 🟡 Schema/seed `careTaskId`; live Rx create does not always link tasks |
| WhatsApp reminders | ⚪ Always `demoMode: true`; simulate ≠ Meta send |
| Priority | **P1** (Care Loop + real reminders) |
| Verified | CODE VERIFIED |

---

## 7. Billing & payments

| Field | Value |
|-------|--------|
| Feature | Invoices, payments, gateways, refunds, links |
| Frontend | ✅ `/billing`, `/payments`, `/settings/payments`, patient financials |
| Backend | ✅ PaymentService + Razorpay/Cashfree/PayU adapters + webhooks |
| Database | ✅ BillingInvoice*, BillingPayment, Refund, PaymentGatewayConnection, PaymentWebhookEvent |
| Credentials | ✅ AES-GCM via `INTEGRATION_ENCRYPTION_KEY` |
| Live gateway | 🟣 INTEGRATION READY — PROVIDER NOT CONNECTED until clinic TEST keys |
| Mock | `PAYMENTS_MOCK=1` or `mock_` key IDs |
| Priority | **P1** sandbox verify |
| Verified | CODE VERIFIED architecture; BLOCKED live provider |

---

## 8. CRM

| Field | Value |
|-------|--------|
| Feature | Leads, pipeline, campaigns |
| Frontend | ✅ `/crm/*` API-backed |
| Backend | ✅ leads, campaigns, crm summary |
| Ads import | ⛔ Meta/Google Ads not implemented |
| Priority | **P1** core CRM; **P2** ads |
| Verified | CODE VERIFIED |

---

## 9. Analytics / dashboard

| Field | Value |
|-------|--------|
| Feature | `/analytics` KPIs |
| Frontend | ⚪ Hardcoded values (e.g. `1,248`) + `demo-data` charts |
| Backend | 🔵 `GET /api/v1/analytics/summary` returns real counts — **UI does not use it** |
| Problem | Violates “no fake dashboard numbers” |
| Recommended fix | Wire UI to `/analytics/summary` (+ pharmacy/payments aggregates) |
| Priority | **P0** |
| Verified | CODE VERIFIED — `analytics/page.tsx` |

---

## 10. Smrko AI

| Field | Value |
|-------|--------|
| Feature | Single AI layer: Buddy, tools, action confirm |
| Frontend | ✅ Command center / chat surfaces |
| Backend | ✅ Next `/api/ai/chat`, `/api/ai/action`; tools use Prisma |
| OpenAI key | ✅ Server-only `OPENAI_API_KEY`; **no** `NEXT_PUBLIC_OPENAI_*` |
| Graceful fail | CODE VERIFIED pattern when key missing |
| Mutations | ✅ Confirm → `/api/ai/action` (createTask) |
| Live OpenAI | BLOCKED — credential required |
| Priority | **P0** security OK; **P1** ops with real key |
| Verified | CODE VERIFIED |

---

## 11. Voice consultation

| Field | Value |
|-------|--------|
| Feature | Transcribe → summarize → ConsultationNote |
| Frontend | ✅ Voice notes UI |
| Backend | ✅ `/api/voice/transcribe|summarize|notes` |
| Audio storage | ✅ Intentionally not persisted (text only) |
| Live Whisper | BLOCKED — OPENAI_API_KEY |
| Priority | **P1** |
| Verified | CODE VERIFIED |

---

## 12. Communications

### WhatsApp

| Field | Value |
|-------|--------|
| Provider | Meta Cloud API / Graph |
| Frontend | ✅ Integrations WhatsApp + templates |
| Backend | ✅ Connect, templates, send, webhooks, CRM capture |
| Consent | 🟡 Send path blocks REVOKED; pharmacy reminders require GRANTED (asymmetric) |
| Production | 🟣 Needs Meta app + clinic WABA |
| Priority | **P0** for Care Loop messaging product; currently INTEGRATION READY |
| Verified | CODE VERIFIED; BLOCKED live Meta |

### SMS / Email / Voice telephony

| Field | Value |
|-------|--------|
| Status | ⛔ Not productized (ConversationChannel enum exists) |
| Priority | **P3** |

---

## 13. Integrations matrix (short)

| Integration | Status mark |
|-------------|-------------|
| OpenAI | 🟣 INTEGRATION READY — key required |
| WhatsApp Meta | 🟣 INTEGRATION READY — Meta credentials |
| Payments Razorpay/Cashfree/PayU | 🟣 Architecture ✅; clinic TEST keys required |
| Google Calendar/Ads | ⛔ / ⚪ Stub + UI toggle |
| ABDM/ABHA | ⛔ Catalog + enum only |
| Insurance NHCX | ⛔ Manual/Demo only |
| S3 documents | ⛔ Env only |

---

## 14. Insurance

| Field | Value |
|-------|--------|
| Feature | Manual clinic workflow (providers, policies, claims, queries, tasks) |
| Frontend | ✅ `/insurance/*` + patient tab |
| Backend | ✅ Full module; ManualInsuranceProvider |
| NHCX | ⛔ Explicitly not connected |
| Priority | **P2** for live insurers; **P1** demo OK as Manual |
| Verified | CODE VERIFIED |

---

## 15. Landing page

| Field | Value |
|-------|--------|
| Feature | Marketing site |
| Status | ✅ Next `(marketing)` LandingPage; also duplicate Vite app `apps/landing page/` |
| Risk | Two landings can diverge |
| Priority | **P2** consolidate |
| Verified | CODE VERIFIED |

---

## 16. Module activation / nav

| Field | Value |
|-------|--------|
| Feature | OrganizationModule / specialty modules |
| Database | ✅ OrganizationModule model |
| UI | 🟡 Pharmacy/Insurance gated by permissions; not full module marketplace |
| Priority | **P2** |
| Verified | CODE VERIFIED |

---

## 17. Issue register (structured)

### P0-1 Fake analytics KPIs
```
Module: Analytics
Feature: Dashboard metrics
Frontend: ⚪ mock
Backend: 🔵 summary API unused
Database: N/A
API: GET /api/v1/analytics/summary
Integration: none
Problem: Hardcoded 1,248 etc.
Root cause: page imports demo-data
Fix: Bind UI to API aggregates
Priority: P0
```

### P0-2 Care Loop automation / exceptions UI-only
```
Module: Care Loop
Feature: Escalation, reminders, attention board
Frontend: ⚪ seed/local
Backend: ⛔ no worker
Database: models exist
Problem: Flagship loop incomplete
Fix: API-backed escalations + reminder job
Priority: P0
```

### P0-3 Document file storage missing
```
Module: Documents
Feature: Upload/download binary
Frontend: ⚪ metadata
Backend: 🟡 metadata POST
Database: storageKey unused
Problem: Clinical files not persisted
Fix: Multipart + S3/local storage
Priority: P0
```

### P0-4 Multi-clinic session = first membership
```
Module: Auth
Feature: Clinic selection
Problem: Wrong clinic risk for multi-membership users
Fix: Explicit clinic switch in JWT
Priority: P0
```

### P0-5 Patient create runtime matrix unverified
```
Module: Patients
Feature: Add Couple Tests A–J
Status: CODE VERIFIED; RUNTIME NOT VERIFIED (no DB in this audit env)
Fix: Stage 2 browser + API tests with Postgres
Priority: P0
```

### P0-6 Care Loop fake automation metrics
```
Module: Care Loop
Feature: “AI handled / automation %” style stats
Frontend: hardcoded
Fix: Remove or compute from DB
Priority: P0
```

### P1 examples
- WhatsApp production templates + consent consistency  
- Pharmacy Rx → CareTask live  
- Payment gateway sandbox E2E  
- Appointment WhatsApp reminders  
- Wire settings billing prefs  
- Staff management UI beyond dropdown  
- Voice multilingual E2E with OpenAI  

### P2 examples
- Google Calendar OAuth  
- ABDM/ABHA architecture only until sandbox  
- NHCX insurance adapter  
- ClinicBranch operational use  
- Module marketplace nav  

### P3 examples
- Multi-specialty workflow packs  
- Telehealth, Labs modules  
- SMS/Email channels  
- Enterprise warehouse  

---

## 18. What Stage 1 did **not** claim

- Did not mark OpenAI/WhatsApp/Payments “production working” without credentials.  
- Did not run full browser Tests A–J (Postgres unavailable in audit environment).  
- Did not change application code (Stage 1 audit only).

---

## Next stage

**Stage 2 — Fix P0 only:** analytics wiring, Care Loop exception API surface (minimal), document storage plan or honest UI gating, clinic session binding, run patient-create E2E with DB.
