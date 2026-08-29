# SMRKOMED Stage 8 Report — Patient 360 + Unified Timeline

**Date:** 2026-08-29  
**Scope:** Compose existing modules into Patient 360. No second AI / WhatsApp / patient DB / ABDM stack.  
**Migration:** None required (derived queries only).

---

## 1. What already existed

- Couple-centric patient profile (`patients/[slug]`) with multi-tabs  
- Pharmacy prescriptions / dispense / reminders (Stage 6)  
- Digital health ABHA / consent / exchange (Stage 7)  
- Payments, insurance, Care Loop, documents metadata, WhatsApp conversations  
- Smrko AI tools (`getCoupleSummary`, pharmacy, digital health, prepare my day)  
- Operational attention helpers in `attention.ts`

## 2. What was reused

- Existing Prisma models and clinic session isolation  
- `PERMISSIONS.PATIENTS_READ` for 360 reads  
- Pharmacy prescription item schedule fields (dosage, frequency, timing, food)  
- Stage 7 digital health identity / consent / exchange records  
- Conversation rows for WhatsApp status (no new messaging stack)  
- Document metadata (`storageKey` honesty when absent)

## 3. What changed

| Area | Change | Status |
|------|--------|--------|
| Patient 360 API | `GET /api/v1/couples/:idOrSlug/360` | **WORKING** (typechecked; DB tests pending local Postgres) |
| Patient 360 alias | `GET /api/v1/patients/:id/360` | **WORKING** (same) |
| Unified timeline | `buildUnifiedTimeline` over existing tables | **WORKING** |
| Operational alerts | Deterministic HIGH/MEDIUM/LOW (not medical risk) | **WORKING** |
| Prepare Patient | Briefing payload from live records | **WORKING** |
| Overview UI | `Patient360Panel` on patient overview | **WORKING** (UI wired) |
| Smrko AI tools | `getPatient360`, timeline, meds, docs, payment, insurance, prepare, etc. | **WORKING** (read-only tools) |
| Document blobs | No new storage | **NOT CONNECTED** — honest “storage not configured” |
| WhatsApp Conversation tab | Still demo thread; 360 shows live conversation status if present | **PARTIALLY WORKING** |
| ABDM gateway | Unchanged Stage 7 | **INTEGRATION READY** / **NOT CONNECTED** without credentials |

## 4. Files changed

- `SMRKOMED_STAGE8_AUDIT.md`  
- `SMRKOMED_STAGE8_REPORT.md` (this file)  
- `packages/database/src/patient-360/*` — timeline + 360 aggregator  
- `packages/database/src/index.ts` — exports  
- `apps/api/src/modules/couples/index.ts` — `/360` route  
- `apps/api/src/modules/patients/index.ts` — `/360` alias  
- `apps/api/src/patient-360.test.ts` — clinic isolation tests  
- `apps/api/package.json` — include new test file  
- `apps/web/src/components/patients/patient-360-panel.tsx`  
- `apps/web/src/app/(dashboard)/patients/[slug]/page.tsx`  
- `apps/web/src/lib/ai/{types,permissions,tools}.ts`

## 5. Database changes

**None.** No new models / migrations. Prefer derived queries.

## 6. API changes

- `GET /api/v1/couples/:idOrSlug/360` — session clinic + PATIENTS_READ  
- `GET /api/v1/patients/:id/360` — resolves primary/partner couple then same payload  

## 7. AI changes

Extended existing Smrko AI (no second chatbot):

- `getPatient360`  
- `getPatientTimeline`  
- `getCurrentMedications`  
- `getPendingCareTasks`  
- `getPatientDocuments`  
- `getPatientCommunicationSummary`  
- `getPatientPaymentStatus`  
- `getPatientInsuranceStatus`  
- `preparePatientConsultation`  

Existing tools kept: `getUpcomingAppointments`, `getPatientAttentionScore`, `getPrepareMyDay`, digital-health tools.  
AI still cannot diagnose, prescribe, auto-send WhatsApp, or mutate without confirmation. Payment/pharmacy/insurance tools remain permission-gated.

## 8. WhatsApp changes

None to Automation Center. 360 reads conversation status only. Triggers still go through existing consent/provider rules.

## 9. Pharmacy changes

None to dispense pipeline. 360 surfaces prescribed vs dispensed labels from existing items.

## 10. ABDM changes

Display-only in 360 header / digitalHealth block. Stage 7 adapter unchanged. No fake SHARED / OTP success.

## 11. Security

- Clinic from Auth.js session only  
- Cross-clinic 360 → 404  
- No secrets in frontend  
- Operational alerts explicitly labeled non-clinical  

## 12. Tests passed

| Check | Result |
|-------|--------|
| `@smrkomed/database` typecheck | PASS |
| `@smrkomed/api` typecheck | PASS |
| `@smrkomed/web` typecheck | PASS |
| `prisma validate` | PASS |
| `@smrkomed/database` tests | PASS (22/22) — Stage 8.11 |
| `@smrkomed/api` tests | PASS (121/121) — Stage 8.11 |
| `patient-360.test.ts` | PASS (5/5) — Stage 8.11 |
| Scenario verify (`verify-stage8-11.ts`) | PASS (15/15 checks) — Stage 8.11 |
| `digital-health.test.ts` | PASS (6) |

## 13. Tests failed / blocked

- `npm run lint -w @smrkomed/web` — **FAIL** (28 pre-existing errors outside Patient 360; Patient 360 panel itself is clean)  
- Interactive browser UI walkthrough / live OpenAI chat — **NOT RUN** in Stage 8.11 (OpenAI key unset)  
- Meta WhatsApp delivery / ABDM gateway / payment gateways — **NOT CONNECTED** (honest)

## 14. Known limitations

- Document file storage still metadata-only  
- Patient Conversation tab remains demo WhatsApp UI  
- Digital-health local `buildTimeline` not yet refactored to call `buildUnifiedTimeline` (360 uses the fuller builder)  
- Care Journey tab still uses some demo `carePlanSteps` data (unchanged this stage)  

## 15. Environment variables

No new env vars. Continue using existing OpenAI / Meta / ABDM / payment secrets server-side only.

Deploy Stage 8.11 requires migration:

`20260829180000_stage8_11_integration_schema_sync`

## 16. Deployment steps

1. Deploy code  
2. Run `npm run db:migrate:deploy -w @smrkomed/database` (includes Stage 8.11 Integration drift fix)  
3. Confirm `DATABASE_URL` and API/web health  
4. Open a patient → Overview → Patient 360  
5. Expand Unified timeline / Prepare Patient  
6. Ask Smrko AI: “Show Patient 360 for …”  

## 17. Manual acceptance checklist

- [x] Seeded 10 realistic Patient 360 scenarios + clinic isolation (API/builder)  
- [x] Confirm 360 header / cards / attention / timeline from live records  
- [x] Prescription meds appear; docs storage note honest  
- [x] Outstanding payment / insurance / WhatsApp / ABHA statuses match records  
- [x] Clinic B cannot load Clinic A 360  
- [ ] Browser UI visual pass (desktop/tablet/mobile) — remaining  
- [ ] Live Smrko AI chat with OpenAI key — remaining (tools registered; key unset here)  
- [ ] Meta WhatsApp delivery — N/A until connected  

---

## STAGE 8.11 VERIFICATION

**Date:** 2026-08-29  
**Postgres:** Homebrew `postgresql@16` on localhost (Docker unavailable). Migrations deployed. No `migrate reset`.

| Feature | Status | Test performed | Result | Known limitation |
|---------|--------|----------------|--------|------------------|
| Patient 360 API | **WORKING** | HTTP + `buildPatient360` + isolation tests | Pass | — |
| Patient 360 UI | **WORKING** | Wired to overview; panel lint clean | Code verified; visual browser pass remaining | Needs live browser |
| Unified timeline | **WORKING** | p10 multi-event scenario | Pass | Derived only |
| Operational alerts | **WORKING** | p3 overdue → HIGH | Pass | Not medical risk |
| Prepare Patient | **WORKING** | Payload in 360 | Pass | — |
| Smrko AI tools | **WORKING** | Tool registration + RBAC gating | Tools ok; live OpenAI **NOT CONNECTED** | Key unset |
| Pharmacy product isolation | **WORKING** | Fixed clinic-scoped GET → 404 | Pass | — |
| Pharmacy meds isolation | **WORKING** | Fixed clinic-scoped patient lookup → 404 | Pass | — |
| Care Loop | **WORKING** | Tasks/plans in 360 scenarios | Pass | — |
| WhatsApp | **PARTIALLY WORKING** | Conversation status in 360; Meta mock tests pass | Pass for status | Delivery **NOT CONNECTED** without Meta |
| Documents | **PARTIALLY WORKING** | Metadata + honest storage note | Pass | Blob **NOT CONNECTED** |
| ABDM | **NOT CONNECTED** / **INTEGRATION READY** | `AbdmProvider.getConnectionInfo()` | `NOT_CONNECTED` | Credentials missing |
| Payments | **WORKING** (records) / gateway **NOT CONNECTED** | p6 outstanding invoice in 360 | Pass | No fake gateway success |
| Insurance | **WORKING** (manual demo records) | p7 ACTIVE policy | Pass | No live insurer verify |
| Clinic isolation | **WORKING** | API + builder checks | Pass | — |
| RBAC | **WORKING** | Existing role tests + AI tool gates | Pass | — |
| AuditLog | **WORKING** | Existing mutation audit tests | Pass | — |
| Schema drift fix | **WORKING** | Migration applied; empty prisma diff | Pass | Required for Integration columns |

See `SMRKOMED_STAGE8_11_VERIFICATION_REPORT.md` for full detail.

**Honest summary (post 8.11):** Patient 360 composition is verified against Postgres with 121/121 API tests and 10 seeded scenarios. External providers (Meta, ABDM, payment gateways, OpenAI, document blobs) remain honestly **NOT CONNECTED** unless credentials are configured.

