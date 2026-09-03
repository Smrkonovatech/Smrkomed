# SMRKOMED — ABDM M1 LIVE SANDBOX VALIDATION REPORT

**Audit Date**: September 4, 2026  
**Audited Target**: SmrkoMed Railway Production API & Real ABDM Sandbox Gateway  
**Railway Endpoint**: `https://smrkomed-api-production.up.railway.app`  
**ABDM Gateway**: `https://dev.abdm.gov.in/gateway` (NHA Sandbox)  
**ABDM Client ID**: `SBXID_071353`  
**Final Determination**: **`M1 — IMPLEMENTED, SANDBOX VALIDATION PENDING`**  

---

## 1. STEP 1 — Environment Configuration

| Variable | Status | Configured Value / Hostname | Security Validation |
|---|---|---|---|
| `ABDM_CLIENT_ID` | **PRESENT** | `SBXID_071353` | Approved NHA Sandbox Client ID. |
| `ABDM_CLIENT_SECRET` | **PRESENT** | `[CONFIGURED SERVER-SIDE]` | Server-only. Scrubbed from logs, client bundles, and HTTP responses. |
| `ABDM_DEMO_MODE` | **OFF** | `false` | Real sandbox mode strictly enforced. Zero mock fallbacks. |
| `ABDM_CALLBACK_BASE_URL` | **PRESENT** | `https://smrkomed-api-production.up.railway.app` | Public HTTPS endpoint on Railway. |

---

## 2. STEP 2 — Public Webhook Callbacks Verification

Every Milestone 1 callback route was probed live via HTTP against the active Railway deployment:

| Endpoint Path | HTTP Method | Live Response | Status | Security / Isolation |
|---|---|---|---|---|
| `GET /` | `GET` | `HTTP 200 OK` (`{"status":"ok","service":"SmrkoMed API","version":"v1"}`) | **LIVE VERIFIED** | Health probe verified. |
| `/v0.5/users/auth/on-fetch-modes` | `POST` | `HTTP 400 Bad Request` (`{"status":"FAIL","error":"INVALID_JSON"}`) | **LIVE VERIFIED** | Publicly reachable, bypasses auth cookies. |
| `/v0.5/users/auth/on-init` | `POST` | `HTTP 400 Bad Request` (`{"status":"FAIL","error":"INVALID_JSON"}`) | **LIVE VERIFIED** | Publicly reachable, ready for Gateway webhooks. |
| `/v0.5/users/auth/on-confirm` | `POST` | `HTTP 400 Bad Request` (`{"status":"FAIL","error":"INVALID_JSON"}`) | **LIVE VERIFIED** | Publicly reachable, ready for Gateway demographics. |
| `/api/v1/v0.5/*` (Alias) | `POST` | `HTTP 400 Bad Request` | **LIVE VERIFIED** | Dual-mounted for complete path compatibility. |

---

## 3. STEP 3 — Real ABDM Gateway Session Authentication

Executed live against the National Health Authority Sandbox Gateway:
- **Target URL**: `POST https://dev.abdm.gov.in/gateway/v0.5/sessions`
- **Request Headers**: `Content-Type: application/json`
- **Payload**: `{"clientId": "SBXID_071353", "clientSecret": "[REDACTED]"}`
- **Live Response**:
  - **HTTP Status**: `200 OK` — **`LIVE VERIFIED`**
  - **Token Type**: `bearer`
  - **Expires In**: `1200` seconds (20 minutes)
  - **Token Length**: 1,441 characters (Valid RS256 JWT)
  - **Latency**: 248ms
  - **Token Claims Decoded**:
    - Issuer: `https://dev.abdm.gov.in/auth/realms/central-registry`
    - Client ID: `SBXID_071353`
    - Realm Roles: `hip`, `hiu`, `bridge`, `healthId`, `HidAbhaSearch`, `HIU_PAYER`, `HIP_PAYER`

---

## 4. STEP 4 — Real M1 Flow Execution & Live Gateway Response

We attempted the live transaction against the ABDM Sandbox Gateway (`POST https://dev.abdm.gov.in/gateway/v0.5/users/auth/init`):
- **Request Headers**:
  - `Authorization: Bearer <live_jwt_token>`
  - `X-CM-ID: sbx`
  - `REQUEST-ID: <uuid_v4>`
  - `TIMESTAMP: <iso8601_utc>`
- **Payload**:
  ```json
  {
    "requestId": "511b8dbf-dc7b-4661-93ec-031c3e32085e",
    "timestamp": "2026-09-03T20:07:39.157Z",
    "query": {
      "id": "testuser@sbx",
      "purpose": "KYC_AND_LINK",
      "authMode": "MOBILE_OTP",
      "requester": {
        "type": "HIP",
        "id": "SBXID_071353"
      }
    }
  }
  ```

### Live Gateway Diagnostic Output:
- **HTTP Status**: `403 Forbidden`
- **Gateway Error Code**: `900908`
- **Gateway Message**: `"Resource forbidden "`
- **Gateway Description**: `"User is NOT authorized to access the Resource. API Subscription validation failed."`

### Root Cause & Upstream Action Required:
1. The Client ID (`SBXID_071353`) and Secret are genuine and successfully authenticate at `/v0.5/sessions`.
2. However, in NHA's WSO2 API Gateway, error code **`900908`** specifically indicates that the application **`SBXID_071353` has not yet had its API subscription to the ABDM Gateway / HIP services activated in the NHA Sandbox Developer Portal**.
3. **Action Required in NHA Sandbox Portal (`sandbox.abdm.gov.in`)**:
   - Log into the ABDM Sandbox Portal.
   - Go to **Applications** → **`SBXID_071353`** → **Subscriptions / APIs**.
   - Ensure the application is subscribed to the **ABDM Gateway API** (or confirm the Bridge URL `https://smrkomed-api-production.up.railway.app` is verified in your sandbox profile).
   - Once NHA activates the subscription, `/v0.5/users/auth/init` will immediately return `202 Accepted` and dispatch the OTP.

---

## 5. STEP 5 — Security & Privacy Audit

| Control | Status | Evidence |
|---|---|---|
| **Client Secret Confidentiality** | **PASS** | Stored strictly in server-side environment. Zero frontend or bundle exposure. |
| **Token Confidentiality** | **PASS** | Held in server memory with automatic 60s pre-expiry refresh. Never returned to browser. |
| **Zero OTP Persistence** | **PASS** | OTP is never stored in DB columns or logs. Verified in automated test suite. |
| **Aadhaar Privacy** | **PASS** | Zero raw 12-digit Aadhaar storage. |
| **ABHA Masking & Hashing** | **PASS** | SHA-256 hash (`abhaNumberHash`) for query matching, masked (`XX-XXXX-XXXX-1234`) for display. |
| **Tenant Isolation** | **PASS** | Compound unique index `[clinicId, abhaNumberHash]` strictly isolates clinic data. |
| **Audit Logs Scrubbing** | **PASS** | `audit()` logs redact credentials, tokens, and patient OTPs. |

---

## 6. STEP 6 — Test & Build Verification Results

| Suite | Command | Result |
|---|---|---|
| **Prisma Schema** | `npx prisma validate` | **Valid 🚀** (Exit code 0) |
| **TypeScript (All Workspaces)** | `npm run typecheck` (API, Web, Admin, Database) | **Clean (0 errors)** |
| **ESLint** | `npm run lint -w @smrkomed/api` | **Clean (0 errors, 0 warnings)** |
| **Digital Health Tests** | `npx tsx --test apps/api/src/digital-health.test.ts` | **18/18 passed (100%)** |
| **Full API Monorepo Tests** | `npm run test -w @smrkomed/api` | **133/133 passed (100%)** |

---

## 7. M1 Milestone Breakdown & Classification

| M1 Workflow Component | Classification | Live Verification Evidence |
|---|---|---|
| **1. Session Token Acquisition (`/v0.5/sessions`)** | **LIVE VERIFIED** | Validated against NHA Sandbox (`200 OK`, 1,441-char JWT). |
| **2. Public Webhook Callbacks (`on-init`, `on-confirm`)** | **LIVE VERIFIED** | Tested live against Railway (`https://smrkomed-api-production.up.railway.app`). |
| **3. Request ID Correlation & Handlers** | **CODE VERIFIED** | Implemented and verified via automated test suite. |
| **4. Auth Initiation (`/v0.5/users/auth/init`)** | **BLOCKED (UPSTREAM NHA)** | Blocked by NHA Gateway returning `900908` (API Subscription pending). |
| **5. OTP Challenge Tracking** | **CODE VERIFIED** | State machine waiting for live subscription activation. |
| **6. OTP Confirmation (`/v0.5/users/auth/confirm`)** | **CODE VERIFIED** | Implemented and verified via automated test suite. |
| **7. Official Profile Demographics (`on-confirm`)** | **CODE VERIFIED** | Implemented and verified via automated test suite. |
| **8. `DigitalHealthIdentity` Creation & Masking** | **CODE VERIFIED** | Implemented and verified via automated test suite. |
| **9. Patient Linking & Multi-tenant Isolation** | **CODE VERIFIED** | Implemented and verified via automated test suite. |
| **10. `AbdmTransaction` Terminal Status** | **CODE VERIFIED** | Implemented and verified via automated test suite. |

---

## Final Status Determination

In strict accordance with the validation criteria:
> *"Only mark LIVE VERIFIED when an actual ABDM Sandbox request/response proves it. If anything is blocked by external dependencies, clearly state the blocker. DO NOT FAKE SUCCESS."*

Because live Gateway authentication and live webhook reachability are genuine and verified, but live transaction initiation is blocked upstream by NHA Gateway error `900908 (API Subscription validation failed)`:

```
====================================================================
           M1 — IMPLEMENTED, SANDBOX VALIDATION PENDING
====================================================================
```
