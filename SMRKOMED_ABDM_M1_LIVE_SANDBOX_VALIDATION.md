# SMRKOMED — ABDM M1 LIVE SANDBOX VALIDATION REPORT

**Audit Date**: September 4, 2026  
**Audited Target**: SmrkoMed Railway API Service & Local Workspace  
**ABDM Client ID**: `SBXID_071353`  
**ABDM Gateway**: `https://dev.abdm.gov.in/gateway` (Sandbox)  
**Report Type**: Pre-Live Verification & Sandbox Readiness Diagnostic  

---

## 1. Backend Configuration Audit

| Variable | Status | Value / Hostname | Security Verification |
|---|---|---|---|
| `ABDM_CLIENT_ID` | **PRESENT** | `SBXID_071353` | Approved NHA Sandbox Client ID. Configured on Railway API. |
| `ABDM_CLIENT_SECRET` | **PRESENT** | `[CONFIGURED SERVER-SIDE]` | Set in Railway Secret Manager. Never printed, never logged, never exposed to browser or client bundles. |
| `ABDM_DEMO_MODE` | **OFF** | `false` | Real ABDM Sandbox mode active. Mock fallbacks are strictly disabled. |
| `ABDM_CALLBACK_BASE_URL` | **NEEDS ALIGNMENT** | `https://smrkomed-api-production.up.railway.app/api/v1` | Verified Railway public domain. See Section 3 for routing details. |

---

## 2. Railway Public API URL & Webhook Reachability Probe

### A. Live Infrastructure Detection
Through DNS resolution and live HTTP probing, the active production deployment was verified:
- **Public Railway API URL**: `https://smrkomed-api-production.up.railway.app`
- **Health Probe Result**:
  ```http
  GET https://smrkomed-api-production.up.railway.app/api/v1/health
  HTTP/1.1 200 OK
  access-control-allow-origin: https://smrkomed.vercel.app/
  {"status":"ok","database":"connected"}
  ```

### B. Current Callback Route Probe on Railway (CRITICAL DIAGNOSTIC)
We probed the deployed Railway endpoint for callback reachability:
```http
POST https://smrkomed-api-production.up.railway.app/api/v1/v0.5/users/auth/on-init
HTTP/1.1 401 Unauthorized
{"success":false,"error":{"code":"UNAUTHENTICATED","message":"Unauthenticated"}}
```

#### Why did Railway return 401 Unauthorized?
1. **The Codebase Gap**: The M1 implementation developed in this session (`abdm-client.ts`, `abdm-callbacks.ts`, `abdm-types.ts`, `abdm-config.ts`, and the public mounting of `/v0.5` in `apps/api/src/routes/v1.ts`) currently exists **only in your local workspace** as uncommitted changes.
2. **Current Deployed Version**: Railway is currently running the previous commit (`37ed8b4 whats app 360`), where `/v0.5` is not mounted under public routes and falls into `protectedRoutes`, requiring an Auth.js user session cookie.
3. **Local Dev Server Comparison**: On your local development machine (`http://localhost:4000`), our updated `apps/api/src/routes/v1.ts` is active, and the endpoint correctly bypasses authentication and returns:
   ```json
   {"status":"FAIL","error":"INVALID_JSON"} (HTTP 400 - route is public, awaiting Gateway payload)
   ```

---

## 3. Exact Callback URL Configuration for Railway & NHA

To ensure the ABDM Sandbox Gateway can deliver callbacks to SmrkoMed:

1. **In Railway Environment Variables**:
   Configure:
   ```env
   ABDM_CALLBACK_BASE_URL=https://smrkomed-api-production.up.railway.app/api/v1
   ```
2. **Registered with NHA ABDM Sandbox**:
   NHA Gateway automatically appends `/v0.5/users/auth/on-init` and `/v0.5/users/auth/on-confirm` to your bridge URL. Therefore:
   - **Bridge / Callback URL**: `https://smrkomed-api-production.up.railway.app/api/v1`
   - **Resolved Webhook Endpoints**:
     - `https://smrkomed-api-production.up.railway.app/api/v1/v0.5/users/auth/on-fetch-modes`
     - `https://smrkomed-api-production.up.railway.app/api/v1/v0.5/users/auth/on-init`
     - `https://smrkomed-api-production.up.railway.app/api/v1/v0.5/users/auth/on-confirm`

---

## 4. End-to-End M1 Flow Architecture & Action Checkpoints

When the M1 code is active on the server with your credentials, the transaction executes as follows:

```
[ SmrkoMed Web ]
       |  1. Enter ABHA / Phone
       v
[ SmrkoMed API ] (POST /patients/:id/journey/auth/start)
       |  2. Calls POST /v0.5/sessions with SBXID_071353 + Secret
       v
[ ABDM Gateway ]
       |  3. Returns session Bearer token
       v
[ SmrkoMed API ]
       |  4. Calls POST /v0.5/users/auth/init (MOBILE_OTP, KYC_AND_LINK)
       v
[ ABDM Gateway ] ---> 5. Sends SMS OTP to patient's mobile
       |
       |  6. Dispatches webhook POST /api/v1/v0.5/users/auth/on-init
       v
[ SmrkoMed API ] (Correlates requestId, updates transaction to AWAITING_OTP)
       |
       v
[ SmrkoMed Web ] ---> *** USER ACTION CHECKPOINT: Enter 6-digit OTP ***
       |
       |  7. User enters OTP in AbhaSetupWizard
       v
[ SmrkoMed API ] (POST /patients/:id/journey/auth/verify)
       |  8. Calls POST /v0.5/users/auth/confirm with authCode
       v
[ ABDM Gateway ]
       |  9. Dispatches webhook POST /api/v1/v0.5/users/auth/on-confirm
       v
[ SmrkoMed API ] (Extracts verified profile, creates DigitalHealthIdentity)
       |
       v
[ SmrkoMed Web ] (Displays "Official ABDM Verified & Linked" card)
```

### Action Checkpoint for Sandbox Testing:
When step 5 occurs:
- The ABDM Gateway issues an OTP challenge to the sandbox mobile registered with the test ABHA.
- In ABDM Sandbox, standard test profiles have designated test OTPs (typically sent via SMS, or fixed test OTP `123456` depending on your sandbox profile setup).
- The wizard will prompt for this 6-digit OTP.

---

## 5. Security & Isolation Controls Verified

- **Client Secret Backend Isolation**: Kept strictly in Railway environment variables. Never returned in any HTTP response, bundle, or report.
- **Access Token Ephemerality**: Held in server memory (`cachedToken`), automatically refreshed 60s before expiry, deduplicated via mutex promise.
- **Zero OTP Persistence**: OTP is never stored in Postgres, disk, or logs.
- **ABHA Privacy**: Raw ABHA is hashed with SHA-256 (`abhaNumberHash`) and displayed masked (`XX-XXXX-XXXX-1234`).
- **Tenant Isolation**: Compound unique index `[clinicId, abhaNumberHash]` guarantees clinic boundary.
- **Live Failure Protection**: `ABDM_DEMO_MODE=false` guarantees that Gateway failures will **never** silently fall back to mock success.

---

## 6. Automated Test & Build Verification Summary

- **Prisma Schema**: Valid (Exit code 0).
- **TypeScript Typecheck**:
  - `@smrkomed/api`: 0 errors (Exit code 0)
  - `@smrkomed/web`: 0 errors (Exit code 0)
  - `@smrkomed/admin`: 0 errors (Exit code 0)
  - `@smrkomed/database`: 0 errors (Exit code 0)
- **API Lint**: 0 errors, 0 warnings (Exit code 0).
- **Digital Health Test Suite**: **18/18 passed (100%)**.
- **Full API Monorepo Test Suite**: **133/133 passed across 7 test suites (100%)**.
- **Production Builds**:
  - `apps/web`: 80/80 routes compiled cleanly.
  - `apps/admin`: 19/19 routes compiled cleanly.

---

## 7. M1 Status Breakdown & Next Step

| M1 Requirement | Current State | Detail |
|---|---|---|
| **Gateway Authentication** | **PENDING DEPLOYMENT** | Code verified with client credentials support. Blocked on Railway deploy. |
| **Auth Initiation** | **PENDING DEPLOYMENT** | Code verified conforming to v0.5 KYC_AND_LINK spec. |
| **Callback Reception** | **BLOCKED ON RAILWAY** | Deployed Railway returns 401 until uncommitted M1 public routes are deployed. |
| **OTP Challenge** | **PENDING DEPLOYMENT** | Awaiting live auth initiation. |
| **OTP Confirmation** | **PENDING DEPLOYMENT** | Awaiting live OTP receipt. |
| **Profile Response** | **PENDING DEPLOYMENT** | Awaiting live on-confirm callback. |
| **Identity Linking** | **CODE VERIFIED** | Tested and verified in digital-health test suite. |
| **Transaction Lifecycle** | **CODE VERIFIED** | State machine transitions verified via unit tests. |

---

## 8. Final Classification

Because the local M1 code containing the public callback handlers and Gateway client has not yet been deployed to your Railway API service (and you instructed not to push to GitHub without alignment):

```
====================================================================
           M1 — IMPLEMENTED, SANDBOX VALIDATION PENDING
====================================================================
```

### Action to Complete Live Validation:
1. Deploy the local M1 changes to the Railway API service (so Railway runs the public `/v0.5` callback endpoints).
2. Set `ABDM_CALLBACK_BASE_URL=https://smrkomed-api-production.up.railway.app/api/v1` in Railway variables.
3. Trigger the ABHA Setup Wizard from `https://smrkomed.vercel.app` (or test via API) using your sandbox test ABHA / mobile.
4. Enter the received OTP to achieve **`M1 — SANDBOX VALIDATED`**.
