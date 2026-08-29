# SMRKOMED Stage 7 Report — ABDM / ABHA / Digital Health Foundation

**Date:** 2026-08-29  
**Verdict:** **ABDM integration foundation implemented** — useful without credentials; live gateway verification/share requires external ABDM configuration.

---

## 1. Audit findings

See `SMRKOMED_STAGE7_AUDIT.md`. No prior ABHA/HIP/HIU/FHIR implementation existed (catalog stub only). Messaging `Consent` must not be reused for HI consent.

## 2. Architecture reused

- Patient / Couple (clinic-scoped source of truth)
- AuditLog + `requireClinicOwned` + Auth.js tenant
- Existing RBAC (`PERMISSIONS` / roles)
- Care Tasks for follow-ups
- WhatsApp Automation Center triggers/library
- Smrko AI Copilot (read-only tools)
- Documents metadata (honest “storage not configured”)
- Settings + Integrations navigation patterns

## 3. New modules

| Module | Path |
|--------|------|
| ABDM adapter | `apps/api/src/modules/digital-health/abdm-provider.ts` |
| Interop DTO mapper | `apps/api/src/modules/digital-health/interop.ts` |
| Digital Health API | `apps/api/src/modules/digital-health/index.ts` |
| Patient UI tab | `apps/web/src/components/digital-health/patient-digital-health-tab.tsx` |
| Clinic dashboard | `apps/web/src/app/(dashboard)/digital-health/page.tsx` |
| Demo seed | `packages/database/src/seed-digital-health.ts` |

## 4. Database changes

**Migration:** `20260829160000_digital_health_abdm_foundation` (additive)

Models:
- `DigitalHealthIdentity` — ABHA link state (hashed + masked)
- `DigitalHealthConsent` — HI consent lifecycle (separate from WhatsApp Consent)
- `HealthRecordExchange` — prepare/share with idempotency; `SHARED` only after provider confirm

## 5. API changes

Mounted at `/api/v1/digital-health`:

- `GET /abdm/status`, `POST /abdm/test-connection`
- `GET /dashboard`, `GET /consents`
- `GET /patients/:patientId` (+ abha/consents/records)
- `POST .../abha/link`, `POST .../abha/verify`, `DELETE .../abha`
- Consent create / approve / reject / revoke
- Record prepare + share + exchange get

## 6–9. Feature classification

| Feature | Class |
|---------|--------|
| Patient Digital Health tab + timeline | **PRODUCTION READY** (local SMRKOMED data) |
| Consent center (clinic-side) | **PRODUCTION READY** (local workflow) |
| Interop prepare/export DTO | **INTEGRATION READY** (not claimed ABDM-certified FHIR) |
| ABDM connection status / test | **INTEGRATION READY** |
| ABHA link via gateway | **REQUIRES EXTERNAL CREDENTIALS** |
| Demo ABHA link intent (`ABDM_DEMO_MODE=1`) | **SANDBOX READY** |
| Live record share → SHARED | **NOT IMPLEMENTED** (honest failure until gateway wired) |
| Document blob exchange | **NOT IMPLEMENTED** (metadata only) |

## 10. ABDM adapter

`AbdmProvider` methods: authenticate, verifyConnection, linkAbha, verifyAbha, shareRecord.  
Disconnected by default. Never fakes OTP. Never marks SHARED without provider success.

## 11. Sandbox

- `sandboxMode` on identities/consents/exchanges
- UI badges when sandbox
- Demo seed clearly labelled `DEMO_SEED` / SANDBOX
- No seeded fake production SHARED success

## 12. RBAC

New permissions: `digital_health:*`, `abha:*`, `consent:*`, `record:*`, `abdm:settings`  
Doctors get clinical digital-health set; coordinators get consent/view/export; admins get settings.

## 13. Audit logging

`abha.link|verify|unlink`, `consent.create|approve|reject|revoke`, `record.prepare|share|exchange_failed`, `abdm.connection_test` — no secrets/OTP/ABHA raw digits.

## 14. AI integration

Read-only: `getPatientDigitalHealthStatus`, `getPatientConsents`, `getPatientHealthTimeline`, `getRecordSharingStatus`  
Must not approve consent, link ABHA, or share records.

## 15. WhatsApp

Triggers: `ABHA_LINKED`, `ABHA_VERIFICATION_REQUIRED`, `CONSENT_REQUESTED`, `CONSENT_EXPIRING`, `RECORD_SHARED`  
Library flows use minimal templates (no clinical content).

## 16. Care Loop

Consent request and failed share create Care Tasks (`DIGITAL_HEALTH`).

## 17. Demo data

Seed scenarios: not linked, linked, verification pending, pending/active/expired/revoked/rejected consents, prepared exchange, failed share.

## 18. Environment variables

Documented in `.env.example` + `SMRKOMED_ENVIRONMENT.md`:  
`ABDM_ENABLED`, `ABDM_ENV`, `ABDM_BASE_URL`, `ABDM_CLIENT_ID`, `ABDM_CLIENT_SECRET`, `ABDM_FACILITY_ID`, `ABDM_X_CM_ID`, `ABDM_DEMO_MODE`  
All server-only.

## 19. Tests

| Suite | Result |
|-------|--------|
| API typecheck | ✅ |
| Web typecheck | ✅ |
| Prisma validate | ✅ |
| `digital-health.test.ts` (6) | ✅ |
| WhatsApp automation unit (15) | ✅ |
| Pharmacy permissions unit | ✅ |
| Full API DB tests | 🔴 Postgres unavailable |
| Full web eslint | 🔴 pre-existing errors unrelated to Stage 7 |

## 20. Manual testing

Not run in this session (no DB/app). Checklist: Patient → Digital Health → link/verify/consent/prepare/share; unauthorized; cross-clinic; Meta/ABDM disconnected.

## 21. Production requirements

1. Deploy + `npm run db:migrate:deploy`
2. Configure ABDM server env when going live
3. Keep `ABDM_DEMO_MODE` off in production
4. Activate WhatsApp templates for consent/ABHA notices if messaging enabled
5. Re-seed demo clinic only in non-prod

## 22. Known limitations

- Live ABDM OTP / discovery / share APIs not fully wired to a certified gateway contract
- Document object storage still unwired
- Messaging Consent ≠ Digital Health Consent (by design)
- Web integrations catalog may still show ABDM “coming soon” separately from `/digital-health`

## 23. External credentials required

- ABDM client id/secret + base URL (+ facility id as required by your ABDM partner)
- Optional Meta WhatsApp for safe notifications
- Optional S3 for document bytes later

## 24. What is NOT implemented

- Full ABDM FHIR profile certification
- Patient-facing PHR app
- Automatic silent patient merge
- Clinical content over WhatsApp
- Claiming “ABDM integrated” as a live production exchange

---

**Bottom line:** SMRKOMED now has a clinic-scoped Digital Health layer (identity, consent, timeline, prepare/share status) on top of existing patient records — without a second patient database — and stays honest when ABDM is not connected.
