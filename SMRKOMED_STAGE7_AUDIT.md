# SMRKOMED Stage 7 Audit — ABDM / ABHA / Digital Health

**Date:** 2026-08-29  
**Rule:** Inspect-first. Extend existing Patient / Consent / Documents / Integrations / Care Loop / WhatsApp / Smrko AI. No second patient database.

---

## 1. Existing capabilities (reuse)

| Area | Status | Notes |
|------|--------|--------|
| Patient / Couple | ✅ | Clinic-scoped; phone/WhatsApp; no ABHA fields |
| Communication Consent | ✅ | Channel consent only (`WHATSAPP_COMMUNICATION`, etc.) — **not** ABDM HI consent |
| Documents | 🟡 | Metadata model; `storageKey` unused; S3 not wired |
| AuditLog | ✅ | Tenant-scoped + secret scrubbing |
| RBAC | ✅ | No digital-health permissions yet |
| Integrations framework | ✅ | `IntegrationProvider.ABDM` enum + catalog “Coming soon”; stub only |
| Patient profile | ✅ | Tabs exist; no Digital Health tab |
| Pharmacy / Rx / Care Loop / WhatsApp / AI | ✅ | Source of truth for operational records |

## 2. ABDM / ABHA code today

**None production-ready.** Only:
- `IntegrationProvider.ABDM` enum
- SaaS catalog “Coming soon”
- Web stub adapter that must **not** be treated as connected

No HIP/HIU, FHIR DTOs, ABHA fields, ABDM env vars, or exchange APIs.

## 3. What can work without credentials

- Digital Health patient tab + timeline from SMRKOMED data
- Local consent request lifecycle (clinic-side tracking)
- Record **preparation** / interoperability DTO export (clinic-scoped)
- Dashboard cards from local DB
- ABDM settings UI showing **NOT CONNECTED**
- Demo/sandbox seed rows clearly labelled

## 4. What requires ABDM credentials

- Real ABHA discovery / OTP / verification
- Production consent artefacts with ABDM gateway
- Actual record share / fetch with HIP/HIU
- Facility (HFR) verification against ABDM

## 5. Database plan (additive)

New models (do **not** overload messaging `Consent`):
- `DigitalHealthIdentity` — ABHA link state per patient/clinic
- `DigitalHealthConsent` — purpose, categories, expiry, status
- `HealthRecordExchange` — prepare/share lifecycle + idempotency
- Optional clinic `AbdmClinicConfig` via existing `Integration` + settings JSON

## 6. Security risks

- Never equate messaging consent with ABDM HI consent
- Never trust client clinicId / exchange status / ABHA verified flags
- Never mark SHARED without provider confirmation
- Mask ABHA identifiers in UI
- Do not send clinical content via WhatsApp

## 7. Classification preview

| Feature | Class |
|---------|--------|
| Timeline from SMRKOMED | PRODUCTION READY (local) |
| Consent center (local tracking) | PRODUCTION READY (local workflow) |
| Record prepare/export DTO | INTEGRATION READY |
| ABHA link via adapter | SANDBOX READY / REQUIRES CREDENTIALS |
| Live ABDM share | REQUIRES EXTERNAL CREDENTIALS |
| Web ABDM stub ACTIVE | MUST NOT be used as connected |

---

## 8. Implementation order

1. This audit  
2. Schema + migration + permissions  
3. ABDMProvider adapter (disconnected by default)  
4. API module  
5. Patient Digital Health UI + settings + dashboard  
6. AI / WhatsApp / Care Loop hooks  
7. Seed + tests + report  
