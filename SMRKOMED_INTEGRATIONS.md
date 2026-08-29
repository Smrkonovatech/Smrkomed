# SMRKOMED Integrations

**Date:** 2026-08-28  
**Rule:** Do not mark production-working without live verification.

| Integration | Purpose | Current | API Needed | Credentials | Sandbox | Production | Priority |
|-------------|---------|---------|------------|-------------|---------|------------|----------|
| OpenAI | Smrko AI + voice STT/summary | **INTEGRATION READY — PROVIDER NOT CONNECTED** until key set. Server routes `/api/ai/*`, `/api/voice/*`. No `NEXT_PUBLIC_OPENAI_*` (CODE VERIFIED). | Chat Completions, Whisper | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL` | Use test key / low spend | Org billing + rate limits | **P0** |
| WhatsApp (Meta) | Patient messaging, templates, CRM capture | **INTEGRATION READY**. Code: Graph client, Embedded Signup, webhooks, encrypted tokens. Pharmacy reminders stay **demoMode**. | Meta Graph Cloud API, webhooks | `META_APP_ID`, `META_APP_SECRET`, `WHATSAPP_CONFIGURATION_ID`, `WHATSAPP_VERIFY_TOKEN`, clinic WABA token (encrypted) | Meta test numbers | Live WABA + approved templates | **P0** |
| Google Calendar | Doctor calendars | **UI ONLY / stub**. Admin note: OAuth not implemented. Settings toggle local. | Google Calendar API + OAuth | Google Cloud OAuth client | Test calendar | Domain-wide or per-user OAuth | **P1** |
| Google Ads | Lead import | **Not implemented** (catalog coming soon) | Ads API | OAuth + developer token | — | — | **P2** |
| Razorpay | Collect / links / refunds | **INTEGRATION READY**. Adapter + webhooks + AES clinic credentials. Live calls **BLOCKED** until clinic TEST keys. Mock via `PAYMENTS_MOCK` / `mock_` keys. | Orders, payment links, refunds, webhooks | Clinic Key ID/Secret + webhook secret (UI); platform `INTEGRATION_ENCRYPTION_KEY` | Razorpay Test Mode | Live keys + webhook URL | **P1** |
| Cashfree | Same | Same pattern | Orders/links/refunds/webhooks | App ID + Secret Key | Sandbox | Live | **P1** |
| PayU | Same | Same pattern | Payments/refunds/webhooks | Merchant Key + Salt | Test | Live | **P1** |
| ABDM | Health exchange | **Not implemented** (enum + catalog only) | ABDM gateway APIs, FHIR | ABDM sandbox credentials, certificates | ABDM sandbox | NHA registration | **P2** |
| ABHA | Patient identity | **Not implemented** | ABHA APIs | Same ecosystem | Sandbox | Production | **P2** |
| Insurance / NHCX | Eligibility/claims network | **Manual/Demo only**. `ManualInsuranceProvider`; NHCX stub throws not connected. | NHCX / TPA APIs later | Future | — | — | **P2** |
| S3 / object storage | Document blobs | **Env only — not wired** | S3-compatible API | `S3_*` / `STORAGE_*` | MinIO/local | Cloud bucket | **P0**/P1 |
| Email / SMS | Channels | **Not implemented** (enums exist) | Provider APIs | TBD | — | — | **P3** |
| Sentry | Observability | Env placeholder | Sentry SDK | `SENTRY_DSN` | — | — | **P2** |

---

## WhatsApp deep dive (CODE VERIFIED)

```
WhatsApp provider: Meta Cloud API (Graph)
API: apps/api/src/integrations/providers/whatsapp/*
Webhook: GET/POST public WhatsApp routes under /api/v1
Auth: Embedded Signup + encrypted Integration.encryptedCredentials
Templates: WhatsAppTemplate model + sync
Required env: META_APP_ID, META_APP_SECRET, WHATSAPP_CONFIGURATION_ID, WHATSAPP_VERIFY_TOKEN, META_GRAPH_API_VERSION
Clinic-level: WABA tokens stored encrypted (not in .env)
Consent: Consent WHATSAPP_COMMUNICATION — send blocks REVOKED; pharmacy path checks GRANTED
Sandbox: Meta test setup
Production: Approved templates + live phone number + verify webhook
```

**Do not auto-send** payment/pharmacy WhatsApp without consent + configured integration.

---

## Payments deep dive

```
Architecture: PaymentService → RazorpayProvider | CashfreeProvider | PayUProvider
Clinic-scoped: PaymentGatewayConnection per clinic (never shared merchant by default)
Secrets: AES-256-GCM (INTEGRATION_ENCRYPTION_KEY) — never NEXT_PUBLIC
Webhooks: /api/v1/payments/webhooks/{razorpay|cashfree|payu} — signature verify + idempotent PaymentWebhookEvent
Invoice paid: only after server verify / webhook SUCCESS (not browser alone)
Status: Architecture ✅ · Live gateway: BLOCKED — clinic TEST credentials required
```

### Exact setup steps (clinic)

**Razorpay TEST:** Dashboard → Test API Keys → Settings → Payments → Connect → Test Connection → Webhook URL `{API_URL}/api/v1/payments/webhooks/razorpay` + secret.  

**Cashfree TEST:** Sandbox App ID/Secret → Connect → webhook `/cashfree`.  

**PayU TEST:** Test Key/Salt → Connect → webhook `/payu`.

---

## Google

| Item | Status |
|------|--------|
| Google login | Not product auth path (credentials Auth.js) |
| Google Calendar | Stub / UI toggle |
| Google Meet / Gmail / Drive | Not implemented |
| Recommendation | Implement Calendar OAuth only when Appointments P1 is stable |

---

## ABDM / ABHA

| Item | Status |
|------|--------|
| Current | Not implemented |
| Required later | ABHA linking, consent artefacts, HIP/HIU roles, FHIR resources, ABDM gateway certs |
| Do not | Fake success responses or store clinical ABDM payloads without consent controls |

---

## Insurance

| Item | Status |
|------|--------|
| Current | Manual clinic workflow module (demo seed) |
| APIs | Internal SmrkoMed only |
| External insurers/TPA/NHCX | Not connected — architecture placeholder only |

---

## OpenAI security checklist

| Check | Result |
|-------|--------|
| `OPENAI_API_KEY` server-only | ✅ |
| No `NEXT_PUBLIC_OPENAI_API_KEY` | ✅ CODE VERIFIED absent |
| Not logged in responses | Expected; do not add |
| App works without key | AI/voice degrade; rest of platform continues | ✅ design intent |
