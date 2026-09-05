# SMRKOMED Environment Variables

**Date:** 2026-08-28  
**Source of truth:** root `.env.example` (+ `apps/api/.env.example`, `apps/admin/.env.example`)  
**Never commit `.env`.** Root file is copied into `apps/web/.env` by sync scripts.

---

## Classification

### SERVER ONLY — never `NEXT_PUBLIC_*`, never browser bundles

| Name | Purpose | Required? | Where |
|------|---------|-----------|--------|
| `DATABASE_URL` | PostgreSQL Prisma | **Yes** (prod) | Railway / Vercel DB / local Docker |
| `DIRECT_URL` | Direct Postgres (migrations) | Recommended | Same |
| `AUTH_SECRET` | Auth.js JWT/cookie encryption | **Yes** | Vercel + API hosts (must match) |
| `AUTH_URL` | Canonical auth URL | Yes prod | Vercel |
| `AUTH_TRUST_HOST` | Trust host header | Often true on Vercel | Vercel |
| `API_URL` | Hono API base for proxy/CORS | **Yes** | Web server |
| `API_PORT` | API listen port | Dev | Railway/API |
| `WEB_APP_URL` | Public web URL for links/CORS | Yes | API |
| `CORS_ORIGINS` | Allowed origins | Yes | API |
| `INTEGRATION_ENCRYPTION_KEY` | AES-256-GCM for WhatsApp + payment clinic secrets | **Yes** if integrations/payments | API |
| `MOCK_INTEGRATIONS_ENABLED` | Mock integration adapters | Optional | Dev |
| `PAYMENTS_MOCK` | Force payment gateway mocks | Optional | Dev/CI |
| `META_APP_ID` | Meta app for WhatsApp | If WhatsApp | API |
| `META_APP_SECRET` | Meta app secret | If WhatsApp | API |
| `WHATSAPP_CONFIGURATION_ID` | Embedded Signup config | If WhatsApp | API |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verify | If WhatsApp | API |
| `META_GRAPH_API_VERSION` | Graph version (default v21.0) | Optional | API |
| `OPENAI_API_KEY` | AI + Whisper | If AI/voice | Web (AI routes) / server |
| `OPENAI_MODEL` | Chat model | Optional | Server |
| `OPENAI_TRANSCRIBE_MODEL` | Whisper model | Optional | Server |
| `ABDM_ENABLED` | Enable ABDM gateway client (`1`) | If ABDM | API |
| `ABDM_ENV` | `sandbox` or `production` | If ABDM | API |
| `ABDM_BASE_URL` | ABDM gateway base URL | If ABDM | API |
| `ABDM_CLIENT_ID` / `ABDM_CLIENT_SECRET` | Client credentials | If ABDM | API |
| `ABDM_FACILITY_ID` | Health facility id (HFR) | Optional | API |
| `ABDM_X_CM_ID` | Consent manager id if required by gateway | Optional | API |
| `ABDM_DEMO_MODE` | Allow SANDBOX local ABHA link intents (not gateway OTP) | Dev only | API |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` / `S3_REGION` | Object storage | When docs storage built | API |
| `STORAGE_*` | Legacy aliases for S3 | Optional | API |
| `VOICE_API_KEY` | Documented but **unused in code** | No | — |
| `SENTRY_DSN` | Error tracking | Optional | All |
| `NODE_ENV` | runtime mode | Yes | All |
| `RATE_LIMIT_DISABLED` | API rate limit off | Dev only | API |

**Clinic payment credentials are NOT env vars** — entered in Settings → Payments and stored encrypted on `PaymentGatewayConnection`.

**Clinic WhatsApp tokens are NOT env vars** — Embedded Signup → encrypted `Integration` / WhatsAppAccount.

### SAFE FOR CLIENT (`NEXT_PUBLIC_*`)

| Name | Purpose | Required? | Where |
|------|---------|-----------|--------|
| `NEXT_PUBLIC_APP_URL` | Browser app origin | Yes | Vercel web |
| `NEXT_PUBLIC_API_URL` | Browser API hint / admin | Often | Web/admin |
| `NEXT_PUBLIC_META_APP_ID` | Optional Embedded Signup browser id | Optional | Prefer loading from authenticated connect API |
| `NEXT_PUBLIC_WHATSAPP_CONFIGURATION_ID` | Optional | Optional | Same |

**Never** put secrets in `NEXT_PUBLIC_*`.

---

## Platform vs clinic credentials

| Kind | Examples | Storage |
|------|----------|---------|
| Platform | `AUTH_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, Meta app IDs, OpenAI key | Host env |
| Clinic | Razorpay/Cashfree/PayU secrets, WABA tokens | DB encrypted fields |
| Mock/dev | `PAYMENTS_MOCK=1`, `mock_` key IDs | Env / UI test mode |

---

## Vercel (web)

Typical required:

- `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`
- `DATABASE_URL` (if web runs Prisma for AI tools)
- `API_URL` / `NEXT_PUBLIC_API_URL`
- `OPENAI_API_KEY` (if AI on web routes)
- `INTEGRATION_ENCRYPTION_KEY` if web decrypts (prefer API-side)

Ensure Auth.js cookie domain/HTTPS compatible with API host.

---

## Railway / API host

Typical required:

- `DATABASE_URL`, `DIRECT_URL`
- `AUTH_SECRET` (**same as Vercel**)
- `WEB_APP_URL`, `CORS_ORIGINS`
- `INTEGRATION_ENCRYPTION_KEY`
- Meta + optional `PAYMENTS_MOCK`
- Port / `API_PORT`
- WhatsApp automation worker (Stage 2+): `WHATSAPP_AUTOMATION_WORKER=1` for in-process ticks, and/or `WHATSAPP_WORKER_SECRET` for cron `POST /api/v1/whatsapp-automation/internal/tick`
- Optional: `WHATSAPP_AUTOMATION_WORKER_INTERVAL_MS` (default `60000`)
- **Phase 6:** keep API **replicas = 1** while SSE + in-process worker are process-local; mount a volume at `MEDIA_STORAGE_DIR` or media is lost on redeploy (`SMRKOMED_WHATSAPP_PHASE6_PRODUCTION.md`).
- **WhatsApp AI auto-reply:** set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) on the **API/Railway** service. Without the key, Smrko AI still replies using published knowledge-base / greeting fallbacks. Enable “Smrko AI auto-reply” under WhatsApp → Settings (default on after Phase 6).

Webhook URLs must be publicly reachable:

- `{API_URL}/api/v1/payments/webhooks/{razorpay|cashfree|payu}`
- WhatsApp Meta webhook URL (see WhatsApp docs in repo)

---

## Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set as `INTEGRATION_ENCRYPTION_KEY`. Losing this key makes existing encrypted clinic credentials unreadable.
