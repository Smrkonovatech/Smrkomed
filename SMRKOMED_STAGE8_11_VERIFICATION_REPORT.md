# SMRKOMED Stage 8.11 Verification Report

**Date:** 2026-08-29  
**Objective:** Verify Stage 8 Patient 360 end-to-end; fix only real issues. No Stage 9.  
**No** `prisma migrate reset`. **No** production data deletion.

---

## 1. Test environment

| Item | Value |
|------|--------|
| OS | macOS (darwin) |
| Node | v24.x |
| Postgres | Homebrew `postgresql@16` on `localhost:5432` |
| Docker | **Unavailable** (`docker` / `docker-compose` not installed) |
| Database | `smrkomed` / user `smrkomed` (matches project `.env`) |
| Approach | Started local Postgres via Homebrew; ran `db:migrate:deploy` |

---

## 2. Database status

| Check | Result |
|-------|--------|
| Connectivity | **WORKING** |
| `prisma validate` | **WORKING** |
| Migrations applied | 19 (including Stage 8.11 sync) |
| `migrate reset` | **Not used** |
| Schema drift before fix | Integration missing `displayName`, `encryptedCredentials`, enum values |
| After `20260829180000_stage8_11_integration_schema_sync` | Empty prisma diff vs schema |

---

## 3. API status

| Check | Result |
|-------|--------|
| Typecheck | **PASS** |
| Lint | **PASS** (workspace) |
| Full test suite | **121 / 121 PASS** |
| Patient 360 tests | **5 / 5 PASS** |

---

## 4. Web status

| Check | Result |
|-------|--------|
| Typecheck | **PASS** |
| Lint (full) | **FAIL** — 28 errors / 35 warnings, mostly pre-existing (`react-hooks/set-state-in-effect`, etc.) |
| `patient-360-panel.tsx` lint | **PASS** (clean) |
| Browser visual pass | **NOT RUN** this session |

---

## 5. Patient creation

| Check | Result |
|-------|--------|
| API create couple / patient | **WORKING** (covered by `api.test.ts`, `couples-create.test.ts`) |
| Clinic isolation on create | **WORKING** |
| Doctor / coordinator assignment | **WORKING** (HTTP + seed scenarios) |
| Interactive UI create + refresh | **NOT RUN** (no browser session) |

---

## 6. Patient 360

Seeded scenarios `s811-p1` … `s811-p10` via `packages/database/scripts/seed-stage8-11.ts`.  
Verified with `packages/database/scripts/verify-stage8-11.ts` — **15 / 15 checks PASS**.

| Scenario | Expected | Observed |
|----------|----------|----------|
| p1 New | No treatment | OK |
| p2 Active treatment | IVF + doctor + coordinator | OK |
| p3 Overdue | HIGH attention / overdue-tasks | OK |
| p4 Upcoming appointment | Confirmed appt data | OK |
| p5 Medication | currentMedications ≥ 1 | OK |
| p6 Pending payment | OUTSTANDING | OK |
| p7 Insurance | ACTIVE | OK |
| p8 WhatsApp thread | OPEN | OK |
| p9 ABHA | LINKED (sandbox) | OK |
| p10 Timeline rich | ≥ 4 events + storage note | OK |

Status: **WORKING** (API / composition). UI panel wired: **WORKING** (code); visual: remaining.

---

## 7. Timeline

| Check | Result |
|-------|--------|
| Chronological derived events | **WORKING** |
| Source modules present (Care Loop, Pharmacy, Payments, Digital Health, WhatsApp, Documents, Appointments, Consultation) | **WORKING** on p10 |
| No manufactured history | **WORKING** |
| Cross-patient leakage | **WORKING** (clinic isolation null) |

---

## 8. Care Loop

| Check | Result |
|-------|--------|
| Tasks / care plans in 360 | **WORKING** |
| Autonomous clinical decisions | Not introduced |

---

## 9. Pharmacy

| Check | Result |
|-------|--------|
| Module tests | **WORKING** (after isolation fixes) |
| Product cross-clinic GET | Fixed → **404** (was 403 leak) |
| Patient medications cross-clinic | Fixed → **404** |
| 360 meds from prescriptions | **WORKING** (p5) |
| Fake dispense success | Not introduced |

---

## 10. Medication

| Check | Result |
|-------|--------|
| Dosage / frequency / timing / food / instructions on Rx items | Present in schema + seed |
| 360 shows PRESCRIBED vs DISPENSED labels | **WORKING** |
| AI prescribe | Blocked by design |

---

## 11. WhatsApp

| Check | Result |
|-------|--------|
| Automation / connect / webhook tests | **WORKING** in API suite |
| 360 conversation status | **PARTIALLY WORKING** (reads Conversation; Conversation tab still demo UI) |
| Meta delivery | **NOT CONNECTED** without credentials — no fake delivery |

---

## 12. Documents

| Check | Result |
|-------|--------|
| Metadata in timeline | **WORKING** |
| Blob storage | **NOT CONNECTED** — note: “Document storage is not configured…” |
| Fake download links | Not created |

---

## 13. ABDM

| Check | Result |
|-------|--------|
| Stage 7 unit tests | **WORKING** |
| Live gateway | **NOT CONNECTED** — `AbdmProvider.getConnectionInfo().status = NOT_CONNECTED` |
| 360 ABHA LINKED sandbox seed | **WORKING** (demo identity only; not gateway verified) |
| Fake SHARED / OTP success | Not present |

---

## 14. Payments

| Check | Result |
|-------|--------|
| Module tests | **WORKING** |
| Outstanding invoice in 360 | **WORKING** (p6) |
| Razorpay/Cashfree/PayU live | **NOT CONNECTED** / **INTEGRATION READY** |

---

## 15. Insurance

| Check | Result |
|-------|--------|
| Module tests | **WORKING** |
| Policy status in 360 | **WORKING** (p7 ACTIVE, MANUAL_DEMO provider) |
| Live insurer verification | **NOT IMPLEMENTED** / not claimed |

---

## 16. Smrko AI

| Check | Result |
|-------|--------|
| Tools registered (`getPatient360`, timeline, meds, prepare, …) | **WORKING** |
| Permission gating (e.g. receptionist no pharmacy meds tool) | **WORKING** |
| Live OpenAI chat | **NOT CONNECTED** (`OPENAI_API_KEY` unset in this environment) |
| Prescribe / diagnose / auto-WhatsApp | Not allowed by tool design |

---

## 17. RBAC

Covered by existing API/database permission tests + AI `allowedTools` checks.  
Roles exercised in suite: CLINIC_ADMIN, DOCTOR, RECEPTIONIST, CARE_COORDINATOR, pharmacy roles, platform admin.  
Status: **WORKING**

---

## 18. Clinic isolation

| Check | Result |
|-------|--------|
| Patient 360 HTTP Clinic A ↛ B | **WORKING** (404) |
| `buildPatient360` cross-clinic null | **WORKING** |
| Pharmacy product / medications | **WORKING** after fixes |
| Broader API isolation suite | **WORKING** |

---

## 19. AuditLog

| Check | Result |
|-------|--------|
| Patient create audits without secrets | **WORKING** (`api.test.ts`) |
| WhatsApp audits without tokens/bodies | **WORKING** |

---

## 20. Mobile / 21. Desktop

| Check | Result |
|-------|--------|
| Responsive classes in Patient 360 panel | Present (grid stacks) |
| Device QA in browser | **NOT RUN** |

Status: **UI ONLY** verified at code level; visual **PARTIALLY WORKING** pending browser QA.

---

## 22. Tests passed

- Database: 22/22  
- API: 121/121 (includes Patient 360, pharmacy, insurance, payments, WhatsApp, digital-health, CRM)  
- Typecheck: database + api + web  
- Prisma validate  
- Stage 8.11 scenario verify: 15/15  

---

## 23. Tests failed

| Test | Status | Notes |
|------|--------|-------|
| `npm run lint -w @smrkomed/web` | FAIL | Pre-existing eslint errors; not introduced by Stage 8.11 Patient 360 panel |
| Live OpenAI / Meta / ABDM / payment gateway E2E | N/A | Providers **NOT CONNECTED** |

Transient failures fixed during 8.11 (before final green run):

1. Schema drift → Integration columns/enums  
2. Pharmacy product IDOR-style 403 → clinic-scoped 404  
3. Pharmacy medications cross-clinic 403 → clinic-scoped 404  
4. Pharmacy test double-read of response body  
5. Test preload forcing `NODE_ENV=test` + `MOCK_INTEGRATIONS_ENABLED=1` so mock provider tests run when shell `.env` has `NODE_ENV=development`

---

## 24. Bugs fixed

1. **Migration** `20260829180000_stage8_11_integration_schema_sync` — additive Integration / enum / Conversation FK sync  
2. **Pharmacy** `GET /products/:id` — scope by session clinic → 404  
3. **Pharmacy** `GET /patients/:id/medications` — scope by session clinic → 404  
4. **Tests** pharmacy response body read; isolation assertion; test preload env forcing  

---

## 25. Remaining issues

1. Web eslint debt (pre-existing)  
2. Document blob storage not implemented  
3. Patient Conversation tab demo thread  
4. Care Journey tab still uses some demo step data  
5. Browser/mobile visual QA not executed  
6. Live OpenAI chat not exercised (no key)  

---

## 26. Production blockers

| Blocker | Severity |
|---------|----------|
| Must apply Stage 8.11 migration before Integration features rely on new columns | **Required** |
| Meta / ABDM / payment gateways / OpenAI / S3 optional until credentials configured | Expected — do not fake |

Not blockers for Patient 360 composition itself.

---

## 27. Required environment variables

Unchanged from `SMRKOMED_ENVIRONMENT.md`. Critical for this verification:

- `DATABASE_URL` / `DIRECT_URL`  
- `AUTH_SECRET`  
- Optional: `OPENAI_API_KEY`, `ABDM_*`, Meta WhatsApp, `INTEGRATION_ENCRYPTION_KEY`, storage/S3  

---

## 28. Deployment requirements

1. Deploy application code  
2. `npm run db:migrate:deploy -w @smrkomed/database`  
3. Do **not** run `migrate reset`  
4. Smoke: `GET /api/v1/couples/:slug/360` for a known couple  
5. Optional seed for local QA:  
   `npx tsx packages/database/scripts/seed-stage8-11.ts`  
   `npx tsx packages/database/scripts/verify-stage8-11.ts`  

---

## 29. Manual acceptance result

| Area | Result |
|------|--------|
| API Patient 360 + isolation + scenarios | **PASS** |
| Full API regression | **PASS** (121) |
| Database isolation / permissions | **PASS** |
| External integrations | Honest **NOT CONNECTED** where unconfigured |
| Browser UI acceptance | **INCOMPLETE** — remaining checklist item |

**Overall Stage 8.11 verdict:** Patient 360 is **trustworthy at the composition/API layer**. External providers remain honestly labeled. Do not claim full production UX acceptance until browser QA and configured providers are exercised.
