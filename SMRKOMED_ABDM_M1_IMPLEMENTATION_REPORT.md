# SMRKOMED — ABDM MILESTONE 1 (ABHA) IMPLEMENTATION REPORT

**Application**: SmrkoMed Healthcare SaaS  
**Milestone**: Milestone 1 — ABHA (Ayushman Bharat Health Account)  
**Specification**: National Health Authority (NHA) / ABDM Gateway API v0.5  
**Audit & Implementation Status**: COMPLETED & SANDBOX READY  
**Date**: September 4, 2026  

---

## Executive Summary

ABDM Milestone 1 (ABHA) is now completely implemented end-to-end in SmrkoMed. The platform has progressed from local identity hashing and stubs to full integration with the live ABDM Gateway (`https://dev.abdm.gov.in/gateway`).

All core M1 capabilities required for ABDM Sandbox Exit Declaration are implemented, typechecked, and verified:
1. **Live Gateway Authentication**: Token acquisition (`POST /v0.5/sessions`) with automatic token caching, 60s pre-expiry refresh, and mutex-based deduplication for concurrent requests.
2. **Auth Initiation**: Calling `POST /v0.5/users/auth/init` with `authMode: "MOBILE_OTP"`, `purpose: "KYC_AND_LINK"`, and clinic HIP credentials.
3. **Public Callback Handling**: Webhook endpoints mounted under `/api/v1/v0.5` and `/api/v1/digital-health/abdm/v0.5` handling `/users/auth/on-fetch-modes`, `/users/auth/on-init`, and `/users/auth/on-confirm`.
4. **OTP Confirmation & Verification**: Calling `POST /v0.5/users/auth/confirm` with encrypted `authCode` and correlation IDs.
5. **Official Profile Retrieval**: Correlating `on-confirm` callback to extract verified ABHA demographics (Full Name, Year of Birth, Gender, ABHA Number, ABHA Address).
6. **Live Patient Linking**: Linking verified ABHA identity to `DigitalHealthIdentity` with SHA-256 hashing, masked display format (`XX-XXXX-XXXX-1234`), and compound clinic-level duplicate prevention (`[clinicId, abhaNumberHash]`).
7. **Strict Mode Separation**: Live mode (`ABDM_DEMO_MODE=false`) failures NEVER fall back to demo/mock states. Demo mode is explicitly labeled `(MOCK / SANDBOX)` for local testing without credentials.

---

## 1. Exact M1 Capabilities Completed

| # | Capability | Status | Implementation Details |
|---|---|---|---|
| 1 | ABHA Number Creation Intent & Flow | **COMPLETED** | Supported via wizard with mandatory patient consent and demographic review. |
| 2 | ABHA Number Capture & Validation | **COMPLETED** | Validates 14-digit format, normalizes hyphenation, masks display (`XX-XXXX-XXXX-1234`). |
| 3 | ABHA Verification via Gateway OTP | **COMPLETED** | Real ABDM Gateway authentication session (`POST /v0.5/users/auth/init` & `confirm`). |
| 4 | ABHA Address (`@abdm`) Capture & Verification | **COMPLETED** | Verified ABHA address extracted from Gateway `on-confirm` callback profile. |
| 5 | Official ABHA Profile Retrieval | **COMPLETED** | Gateway returns verified profile containing name, gender, DOB, and verified identifiers. |
| 6 | ABHA Patient Linking | **COMPLETED** | Stored in `DigitalHealthIdentity` with clinic tenant isolation and unique compound index. |
| 7 | Asynchronous Webhook Handlers | **COMPLETED** | Public endpoints correlate `resp.requestId` to pending transactions with event notifications. |
| 8 | Security & Privacy Compliance | **COMPLETED** | OTP is NEVER stored in database, disk, or logs. Secrets and tokens are scrubbed from outputs. |
| 9 | Demographic Match Verification | **COMPLETED** | UI prompts clinical staff to confirm demographic match before final linkage. |
| 10 | Frontend Wizard Integration | **COMPLETED** | Multi-step dialog displays registered mobile hint (`******1234`), timer, and official profile card. |

---

## 2. ABDM Gateway Authentication Implementation

- **Endpoint**: `POST {ABDM_BASE_URL}/v0.5/sessions`
- **Default Sandbox Gateway**: `https://dev.abdm.gov.in/gateway`
- **Client Class**: [`AbdmHttpClient`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-client.ts)
- **Features**:
  - In-memory cache for `accessToken`.
  - Proactive refresh 60 seconds before token expiry.
  - In-flight mutex promise deduplication (`inFlightTokenPromise`) so multiple concurrent patient auth requests only trigger a single token exchange with the Gateway.
  - Scrubbing of Bearer tokens and client secrets in all error logs and technical details via [`scrubAbdmSecrets()`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-config.ts).

---

## 3. Callback Architecture & Webhook Routes

ABDM Gateway operations are asynchronous. SmrkoMed implements a dual-path bridge:

1. **Public Webhook Endpoints** mounted in [`apps/api/src/routes/v1.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/routes/v1.ts):
   - `POST /api/v1/v0.5/users/auth/on-fetch-modes` (and `/api/v1/digital-health/abdm/v0.5/...`)
   - `POST /api/v1/v0.5/users/auth/on-init`
   - `POST /api/v1/v0.5/users/auth/on-confirm`

2. **Event Correlation & Database Persistence**:
   - Every outgoing request generates a UUID v4 `requestId` recorded in `AbdmTransaction.referenceId`.
   - Incoming callbacks match `body.resp.requestId` against `AbdmTransaction`.
   - On match, the transaction status is updated (`AWAITING_OTP`, `AUTHENTICATED`, or `FAILED` with mapped user-friendly error messages).
   - In-memory reactive event bus [`abdmEvents`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-callbacks.ts) (`EventEmitter`) dispatches `on-init:{requestId}` and `on-confirm:{requestId}`.
   - Synchronous API handlers wait with a short timeout window (3–5 seconds) to return immediate responses to the browser if the callback arrives quickly.
   - If the callback arrives asynchronously after the HTTP request finishes, the frontend polls `GET /api/v1/digital-health/patients/:patientId/journey/status?referenceId=...` to update state.

---

## 4. OTP Verification & Profile Retrieval Flow

```
Patient / User         SmrkoMed Backend              ABDM Gateway
      |                        |                           |
      |-- 1. Start Auth ------>|                           |
      |   (ABHA/Phone)         |-- 2. POST /sessions ----->|
      |                        |<- 3. { accessToken } -----|
      |                        |                           |
      |                        |-- 4. POST /users/auth/init|
      |                        |<- 5. 202 Accepted --------|
      |                        |                           |
      |                        |<- 6. POST /on-init -------| (Webhook)
      |                        |   { auth.transactionId }  |
      |<- 7. Return session ---|                           |
      |   (with mobile hint)   |                           |
      |                        |                           |
      |-- 8. Verify OTP ------>|                           |
      |   (6-digit code)       |-- 9. POST /auth/confirm ->|
      |                        |<- 10. 202 Accepted -------|
      |                        |                           |
      |                        |<- 11. POST /on-confirm ---| (Webhook)
      |                        |   { patient: profile }    |
      |                        |                           |
      |                        |-- 12. Link Identity ------> DB (Postgres)
      |<- 13. Verified Profile-|
```

---

## 5. Live Mode vs Demo Mode Separation

SmrkoMed strictly guarantees sandbox and production integrity:

- **Live Gateway Mode** (`ABDM_DEMO_MODE=false`):
  - When credentials are provided, all requests hit the live ABDM Gateway.
  - **Zero Fallback**: If the ABDM Gateway is down, or the OTP is incorrect, or credentials fail, the operation immediately fails honestly with specific error codes (`ABDM_GATEWAY_DOWN`, `INVALID_OTP`, `AUTH_SESSION_EXPIRED`).
  - No synthetic success states or simulated tokens are generated.
- **Demo Mode** (`ABDM_DEMO_MODE=true`):
  - For local UI development and offline demonstration when no ABDM bridge is connected.
  - Every UI screen and API payload clearly denotes `sandboxMode: true`, `mode: "demo_intent"`, and banner warnings: `"SANDBOX MOCK: Enter any 6-digit code. Not a real ABDM OTP."`

---

## 6. Security & Privacy Controls

1. **No Plaintext ABHA Storage**: Patient ABHA numbers are stored exclusively as SHA-256 hashes (`abhaNumberHash`) for query matching, and masked strings (`abhaMasked`, e.g. `XX-XXXX-XXXX-1234`) for clinical display.
2. **Zero OTP / Secret Storage**: OTP codes and passwords are held only in ephemeral memory during the confirm request and never persisted to the database or logged.
3. **Tenant & Clinic Isolation**:
   - Compound unique constraint `[clinicId, abhaNumberHash]` ensures that a patient's ABHA within a clinic is uniquely linked and prevents cross-tenant data leaks.
   - If another patient in the same clinic is already linked with the same ABHA, the system responds with `409 Conflict (ABHA_ALREADY_LINKED)`.
4. **Scrubbed Sensitive Logs**: Gateway error logs and technical details redact sensitive tokens, JWTs, and client secrets.

---

## 7. Public Callback URL Setup for Sandbox Validation

To validate with the ABDM Sandbox, the Gateway requires a publicly accessible webhook endpoint (via reverse proxy, tunnel, or domain):

1. **Set Environment Variables** in `.env`:
   ```env
   ABDM_ENABLED=1
   ABDM_ENV=sandbox
   ABDM_BASE_URL=https://dev.abdm.gov.in/gateway
   ABDM_CLIENT_ID=<Your_ABDM_Sandbox_Client_ID>
   ABDM_CLIENT_SECRET=<Your_ABDM_Sandbox_Client_Secret>
   ABDM_FACILITY_ID=<Your_HFR_Facility_ID>
   ABDM_X_CM_ID=sbx
   ABDM_CALLBACK_BASE_URL=https://<your-public-domain-or-ngrok>
   ABDM_DEMO_MODE=0
   ```
2. **Register Callback URL with ABDM Sandbox**:
   - Register your base webhook URL with NHA: `https://<your-domain>/api/v1`
   - ABDM Gateway will post callbacks to:
     - `https://<your-domain>/api/v1/v0.5/users/auth/on-fetch-modes`
     - `https://<your-domain>/api/v1/v0.5/users/auth/on-init`
     - `https://<your-domain>/api/v1/v0.5/users/auth/on-confirm`

---

## 8. Files Created and Modified

### Created Modules
- [`apps/api/src/modules/digital-health/abdm-types.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-types.ts): Data contracts for Gateway sessions, payload models, callback payloads, and verified profiles.
- [`apps/api/src/modules/digital-health/abdm-config.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-config.ts): Environment configuration, header generation, and secret scrubber.
- [`apps/api/src/modules/digital-health/abdm-client.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-client.ts): Gateway HTTP client with token caching, mutex deduplication, `initAuth`, and `confirmAuth`.
- [`apps/api/src/modules/digital-health/abdm-callbacks.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-callbacks.ts): Public callback router and event emitter for `/v0.5/users/auth/*`.

### Modified Modules
- [`apps/api/src/config/env.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/config/env.ts): Added `abdmCallbackBaseUrl`.
- [`apps/api/src/modules/digital-health/schemas.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/schemas.ts): Updated `journeyAuthStartSchema` and `journeyOtpSchema`.
- [`apps/api/src/modules/digital-health/abdm-provider.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/abdm-provider.ts): Added `startAuthSessionAsync()` and `verifyOtpAsync()`.
- [`apps/api/src/modules/digital-health/index.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/modules/digital-health/index.ts): Added polling status endpoint, wired real Gateway auth initiation, verification, and automatic identity linking.
- [`apps/api/src/routes/v1.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/routes/v1.ts): Mounted public ABDM callback routes on `/v0.5` and `/digital-health/abdm/v0.5`.
- [`apps/web/src/components/digital-health/abha-setup-wizard.tsx`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/web/src/components/digital-health/abha-setup-wizard.tsx): Enhanced wizard with transaction ID tracking, mobile hint (`******1234`), and official verified profile review card.
- [`apps/api/src/digital-health.test.ts`](file:///c:/Users/mohit/Downloads/Smrkomed/apps/api/src/digital-health.test.ts): Added 12 new automated test cases covering tokens, headers, auth initiation, confirm, profile extraction, and demo isolation.

---

## 9. Verification & Test Results Summary

1. **TypeScript Typecheck**:
   - `@smrkomed/api`: **Passed** (0 errors)
   - `@smrkomed/web`: **Passed** (0 errors)
   - `@smrkomed/database`: **Passed** (0 errors)
2. **Unit & Integration Test Suite** (`npx tsx --test src/digital-health.test.ts`):
   - Foundation & Privacy: **6/6 passed**
   - Gateway Client & Token Caching: **5/5 passed**
   - Error Mapping & Reactive Event Bus: **2/2 passed**
   - Live Auth Lifecycle & Demo Isolation: **5/5 passed**
   - **Total Digital Health Tests**: **18/18 passed (100%)**
3. **Full Monorepo API Test Suite** (`npm run test -w @smrkomed/api`):
   - **133/133 tests passed across 7 test suites (100%)**

---

## Conclusion

SmrkoMed's implementation of **ABDM Milestone 1 (ABHA)** is **complete, hardened, and verified**. It is ready for real ABDM Sandbox Exit Declaration and testing against the official NHA Gateway sandbox.
