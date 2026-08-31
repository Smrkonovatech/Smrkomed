# WhatsApp Business Platform (Phase 7)

SmrkoMed connects a **clinic-owned** WhatsApp Business Account through Meta’s official WhatsApp Cloud API and Embedded Signup. SmrkoMed is a software application authorized by the clinic. This document does **not** claim Meta Partner, WhatsApp certified, or Meta-approved status.

Official sources used for this implementation:

- [Embedded Signup implementation](https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation/)
- [Create a webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)
- [Webhooks from Meta](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
- [Cloud API sending messages / templates](https://developers.facebook.com/docs/whatsapp/cloud-api/)

If Meta’s live documentation differs from this file, follow Meta.

## 1. Meta setup

1. Create a Meta Developer app with type **Business**.
2. Add the **WhatsApp** product (Cloud API).
3. Create or attach a Meta Business portfolio.
4. In **Facebook Login for Business → Configurations**, create an **Embedded Signup** configuration (v4 is current; v2 is deprecated 15 October 2026).
5. Copy the configuration ID into `WHATSAPP_CONFIGURATION_ID`.
6. Copy the app ID and app secret into `META_APP_ID` and `META_APP_SECRET` (server only).
7. Set a webhook verify token of your choosing in the App Dashboard and in `WHATSAPP_VERIFY_TOKEN`.

SmrkoMed application credentials (`META_APP_ID`, `META_APP_SECRET`, configuration ID, verify token) are separate from clinic WhatsApp assets (WABA, phone number, BISU token). Clinics never paste Facebook passwords, WhatsApp passwords, or access tokens into SmrkoMed.

## 2. Developer app setup

Required dashboard products:

- WhatsApp / Cloud API
- Webhooks
- Facebook Login for Business (Embedded Signup configuration)

Valid OAuth redirect / JavaScript SDK origins must include the clinic app origin, for example `http://localhost:3000` in development and the production HTTPS origin later.

## 3. Required permissions

Embedded Signup v4 selects permissions in the Login configuration builder, not by inventing extra scopes in SmrkoMed. Current WhatsApp Cloud API permissions used by this integration:

- `whatsapp_business_management`
- `whatsapp_business_messaging`

Do not add undocumented permissions.

## 4. Business verification and app review

Production onboarding of businesses that are **not** already on the app’s Business typically requires:

- Meta Business verification (where Meta requires it)
- App Review / Advanced Access for the WhatsApp permissions (where Meta requires it)
- A privacy policy, terms, and a data deletion process
- A verified domain for the production callback / frontend origin

Until those are granted, use Meta’s **test / development** WABA and test phone numbers from the App Dashboard. Phase 7 does not claim production readiness.

## 5. Embedded Signup

Clinic flow:

1. Settings → Integrations → WhatsApp → **Connect WhatsApp**
2. `POST /api/v1/integrations/whatsapp/connect` creates a short-lived server-side state bound to `userId`, `organizationId`, `clinicId` (10 minutes). The browser does not supply tenant IDs as identity.
3. The clinic app loads Meta’s JavaScript SDK and calls `FB.login` with:
   - `config_id`
   - `response_type: "code"`
   - `override_default_response_type: true`
   - `extras: { setup: {} }` (v4 extras are intentionally empty for standard Cloud API onboarding)
4. `WA_EMBEDDED_SIGNUP` `postMessage` may include the selected `waba_id` and `phone_number_id`. SmrkoMed uses those selected IDs. It does not pick an arbitrary WABA when several exist.
5. `FB.login` returns `authResponse.code`.
6. `POST /api/v1/integrations/whatsapp/callback` exchanges the code **server-to-server**:

`GET https://graph.facebook.com/{version}/oauth/access_token?client_id=...&client_secret=...&code=...`

Meta’s Embedded Signup token exchange does **not** use `redirect_uri`. The token is a Business Integration System User (BISU) token. This flow has **no refresh-token grant**. If Graph returns error code `190`, the integration becomes `ACTION_REQUIRED` (“WhatsApp connection requires attention.”).

7. SmrkoMed calls `POST /{waba-id}/subscribed_apps`, loads WABA and phone metadata, encrypts the token, and stores `Integration` + `WhatsAppAccount`.

If several phone numbers are returned and Embedded Signup did not specify one, the API returns a selection payload with masked numbers. The authorization code is single-use, so the exchanged token is stored on a `CONNECTING` integration until the clinic selects a number.

## 6. Redirect / callback URLs

This is **not** a classic redirect OAuth loop for WhatsApp. The clinic page stays on SmrkoMed. Configure Meta Login settings with the clinic origin. Generic `/api/v1/integrations/:provider/oauth/callback` remains unused for WhatsApp (501) so Meta Ads / Google can use it later.

## 7. Webhook URL

Public (no clinic session cookie):

- `GET  {API_URL}/api/v1/webhooks/whatsapp`
- `POST {API_URL}/api/v1/webhooks/whatsapp`

Production requires HTTPS. Meta does not accept self-signed certificates.

Configure this exact callback in App Dashboard → WhatsApp → Configuration → Webhook. Subscribe the `messages` field. A Meta app has one webhook URL; WABAs still need `subscribed_apps`.

## 8. Webhook verification

**GET (verification request)**  
Query: `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.  
If the token matches `WHATSAPP_VERIFY_TOKEN`, respond with HTTP 200 and the **raw** `hub.challenge` string (not JSON).

**POST (event notification)**  
Header `X-Hub-Signature-256: sha256=...` is HMAC-SHA256 of the **raw body** using `META_APP_SECRET`. Compared with `timingSafeEqual`. Signature verification is not disabled in production. Tenant IDs in the payload are ignored. The integration is resolved from `metadata.phone_number_id` / WABA id on `WhatsAppAccount`.

Unknown WABA/phone: HTTP 200 and ignore (so Meta does not retry for days). Invalid signature: 401. Malformed JSON: 400.

## 9. Environment variables

Server (`apps/api` / root `.env`):

| Variable | Purpose |
| --- | --- |
| `META_APP_ID` | Meta app id (also returned to the signed-in clinic for `FB.init`) |
| `META_APP_SECRET` | App secret for token exchange and webhook HMAC. Never `NEXT_PUBLIC_`. |
| `WHATSAPP_CONFIGURATION_ID` | Embedded Signup config id |
| `WHATSAPP_VERIFY_TOKEN` | Webhook GET handshake |
| `META_GRAPH_API_VERSION` | Default `v21.0` (override if Meta requires a newer version) |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte hex/base64 AES-256-GCM key |
| `WHATSAPP_DEMO_MODE` | Set to `1` to allow simulated Embedded Signup when Meta App credentials are not configured (dev/test only; never a production Meta connection) |
| `MOCK_INTEGRATIONS_ENABLED` | Also enables WhatsApp demo connect when Meta is not configured |

Optional public (not required; connect API already returns app id + config id):

- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_WHATSAPP_CONFIGURATION_ID`

## 10. Test environment

Use Meta’s dashboard test WABA and test phone numbers. Do not use a real patient’s WhatsApp account.

Local webhook testing needs a public HTTPS tunnel to `GET/POST /api/v1/webhooks/whatsapp`. After mock tests pass, run one controlled smoke test: connect → webhook → approved template send → delivered/read → disconnect/reconnect.

## 11. Template process

Templates live on the clinic WABA in Meta. Phase 7 **syncs metadata** (`GET /{waba-id}/message_templates`) and does **not** submit templates unless/until a later phase implements Meta’s current template API and the product requires it.

UI: Settings → WhatsApp → Templates. Statuses mapped from Meta: `PENDING`, `APPROVED`, `REJECTED`, `DISABLED`, `PAUSED`. Only **APPROVED** templates can be sent. SmrkoMed never shows “approved” unless Meta says so.

Send: `POST /{phone-number-id}/messages` with `type: "template"`. Body parameters `{{1}}`… must be supplied. Max 10 parameters, 256 characters each. No bulk / broadcast API.

## 12. Message flow

Outbound: clinic user → tenant checks → approved template on the same integration → Graph → store `SENT` with `providerMessageId` → webhook `delivered` / `read` / `failed`.

Inbound text: Meta → verify HMAC → identify phone → clinic Integration → normalize phone → match that clinic’s patient → reuse or create `Conversation` (`channel = WHATSAPP`) → store `Message`. Unknown numbers are `UNMATCHED_CONTACT` (no automatic Patient or CRM lead).

Unsupported inbound types (image, video, interactive, …) are stored as ignored events and do not fail the webhook.

## 13. Disconnect behavior

`DELETE /{waba-id}/subscribed_apps` unsubscribes **SmrkoMed** from that WABA. It does **not** delete the clinic’s WhatsApp Business Account or phone number in Meta.

Locally: `Integration` becomes `DISCONNECTED`, credentials are removed, WhatsAppAccount `isActive=false`. Historical conversations and messages are kept. Webhooks for that phone are ignored until reconnect. Reconnect reuses the clinic’s `Integration` row (`clinicId + provider` uniqueness).

If Meta app credentials are missing, disconnect remains 501 and local state is unchanged (Phase 6 contract).

## 14. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Connect returns 501 | `META_APP_ID` / secret / configuration id / verify token missing |
| Webhook GET fails | Verify token mismatch, or response was JSON instead of the raw challenge |
| Webhook POST 401 | HMAC uses the wrong app secret, or the body was parsed before hashing |
| Connection requires attention | Graph error 190; reconnect with Embedded Signup |
| Template send 422 | Template not APPROVED, missing `{{n}}` parameters, or wrong clinic |
| Events not creating messages | Phone number id not on an ACTIVE integration, or integration disconnected |

## 15. Production checklist

- [ ] Meta app configured (Business + WhatsApp + Login for Business Embedded Signup v4)
- [ ] Current permissions confirmed in the ES builder
- [ ] App Review / Advanced Access completed where Meta requires it
- [ ] Business verification completed where Meta requires it
- [ ] Production domain verified
- [ ] Privacy policy, terms, and data deletion instructions available
- [ ] HTTPS webhook URL
- [ ] GET challenge and POST HMAC working
- [ ] Credential encryption at rest
- [ ] Tenant isolation tests passing
- [ ] Duplicate webhook events ignored
- [ ] Token/authorization failures mapped to ACTION_REQUIRED
- [ ] Disconnect unsubscribes the app without deleting history
- [ ] Templates synced; only APPROVED templates send
- [ ] Message statuses follow Meta events
- [ ] Admin monitoring without tokens or chat bodies
- [ ] Audit logs without secrets or full message bodies
- [ ] Rate limiting on connect / send / webhook
- [ ] One real Meta test account verified

Phase 7 is **not** production-ready until the boxes that depend on Meta review are actually complete.

## Architecture

Clinic UI (`apps/web`) → Hono (`apps/api`) Integration Framework → `WhatsAppProvider` → Graph API and webhooks → `Integration` / `WhatsAppAccount` → clinic `Conversation` / `Message`.

Unsupported Meta event types are ignored. Future phases may add media, interactive messages, CRM, Care Loop workers, Redis, Meta Ads, and Google Ads. Those are out of scope here.

## Difference from earlier assumptions

- WhatsApp onboarding is Embedded Signup + `FB.login` (`response_type=code`), not a redirect OAuth code flow with `redirect_uri`.
- BISU tokens from this flow are not refreshed with a refresh-token grant.
- Graph API version is configurable (`META_GRAPH_API_VERSION`); default `v21.0`.
- Template submission is not implemented in Phase 7.
