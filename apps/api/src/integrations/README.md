# Integration Framework (Phase 6)

Reusable provider socket for SmrkoMed. This phase builds the architecture, not live WhatsApp / Meta / Google connections.

## Architecture

```
Clinic / Admin UI
        ↓
Hono /api/v1
        ↓
IntegrationService / WebhookService / CredentialService
        ↓
Provider registry → adapter (stub | mock in tests)
        ↓
Integration + IntegrationEvent (@smrkomed/database)
```

Tenant ownership is always `organizationId` + `clinicId`. Request bodies are not trusted for those fields.

## Existing schema reused

- `Integration` (credentials stay in `encryptedCredentials`)
- `WhatsAppAccount` (provider-specific later; unused for real WhatsApp here)
- `AuditLog`
- `IntegrationProvider` enum (`WHATSAPP_CLOUD` is the WhatsApp provider)

## Additive schema

- `Integration.organizationId`, `lastErrorCode`
- `IntegrationStatus.DISCONNECTED`
- `IntegrationEvent` + `IntegrationEventStatus`

Migration: `20260819020000_phase6_integration_framework`

## Connection states

Stored Prisma statuses map to the public lifecycle:

| DB | API |
| --- | --- |
| DISABLED | NOT_CONNECTED |
| PENDING | CONNECTING |
| ACTIVE | CONNECTED |
| ACTION_REQUIRED | ACTION_REQUIRED |
| ERROR | ERROR |
| DISCONNECTED | DISCONNECTED |

`DISCONNECTED → CONNECTED` is invalid; a new connect operation must go through `CONNECTING`.

## Provider interface and registry

Adapters live under `src/integrations/providers/*`.

```ts
getProvider("WHATSAPP")      // WHATSAPP_CLOUD stub
getProvider("META_ADS")
getProvider("GOOGLE_ADS")
```

Unknown providers throw `PROVIDER_NOT_SUPPORTED`. Stub `connect` / `disconnect` / OAuth / webhook verify return `PROVIDER_NOT_IMPLEMENTED` (HTTP 501). They never return fake `CONNECTED`.

## Credentials

`CredentialService` uses AES-256-GCM (`INTEGRATION_ENCRYPTION_KEY`, 32 bytes).

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never use `NEXT_PUBLIC_INTEGRATION_ENCRYPTION_KEY`. Missing keys fail in production and local API startup. Tests use a preload key. Decrypt is server-side only. Serializers omit `encryptedCredentials`, tokens, and secrets.

`rotateCredentials()` is defined and returns `NOT_IMPLEMENTED`.

## Webhooks

`POST /api/v1/webhooks/:provider` (public)

Flow: verify → parse → identify integration by stored `externalAccountId` (ignore client `clinicId`) → unique `(provider, externalEventId)` → store sanitized metadata → return.

Raw bodies may be stored encrypted for 7 days (`payloadExpiresAt`) and are never returned to clinic or admin lists.

Stub verification is `NOT_IMPLEMENTED` so unsigned production webhooks are not accepted. Tests register `MockIntegrationProvider`.

In-memory rate limit is stricter for webhook paths. Redis is not used.

## OAuth foundation

Types: `getAuthorizationUrl`, `handleCallback`, `exchangeCode`, `refreshToken`.

`state` is bound to clinic + organization + nonce + expiry. Callbacks without valid state are rejected.

Routes:

- `GET /api/v1/integrations/:provider/oauth/start` (authenticated) → 501
- `GET /api/v1/integrations/:provider/oauth/callback` (public) → 501

No redirects to fake provider URLs.

## Mock provider

`MockIntegrationProvider` is **not** registered for production HTTP. Tests call `registerProviderForTests`. `MOCK_INTEGRATIONS_ENABLED=1` is development/test only; production still rejects the mock.

## Adding a new provider (future)

1. Create `providers/<name>/provider.ts` implementing `IntegrationProviderAdapter`.
2. Register it in `core/registry.ts`.
3. Implement authorization / OAuth (with `state`).
4. Encrypt credentials via `CredentialService`.
5. Implement `connect`, `disconnect`, `getStatus`.
6. Implement webhook `verify` + `parseWebhook`.
7. Handle events without trusting client tenant IDs.
8. Add isolation, credential, and webhook tests.
9. Add admin monitoring + clinic UI.
10. Do not rewrite the integration core.

## Implemented vs future

**Implemented:** registry, stubs, tenant-safe services, encryption, webhook idempotency, OAuth types, admin events/health, clinic “coming soon”.

**Future provider implementation (Phase 7+):** WhatsApp Embedded Signup, Meta/Google OAuth, real signature verification, token refresh, workers/Redis, retries with backoff.
