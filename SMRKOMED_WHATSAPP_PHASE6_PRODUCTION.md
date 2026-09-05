# SMRKOMED WhatsApp — Phase 6 Production Hardening

**Date:** 2026-09-05  
**Scope:** Idempotency, retry policy, failure visibility, worker/realtime/storage topology, RBAC/audit verification.  
**Does not claim REAL WHATSAPP VERIFIED** without a live Meta patient/staff test after deploy.

---

## Deployment topology (current intentional constraints)

| Concern | Status | Constraint |
|---------|--------|------------|
| API replicas | **Single replica recommended** | Process-local SSE bus + in-process automation worker |
| Automation worker | In-process `setInterval` and/or cron `POST .../internal/tick` | Safe with DB locks + execution idempotency; prefer `replicas=1` when worker enabled |
| Realtime (SSE) | In-memory bus (`modules/realtime/bus.ts`) | No Redis pub/sub. Multi-instance → clients miss events from other replicas. Restart clears replay buffer (200 events) |
| Media storage | `LocalFilesystemMediaStorageProvider` only | **Ephemeral on Railway without a persistent volume** → media lost on redeploy (**BLOCKER** for durable media) |
| Object storage | Env vars `S3_*` documented; **no WhatsApp MediaStorageProvider implementation** | Do not claim durable media until volume or S3 provider is wired |

### Recommended Railway settings (until Redis/S3)

1. API service **replicas = 1**
2. Persistent volume mounted at `MEDIA_STORAGE_DIR` (or accept media loss)
3. `WHATSAPP_AUTOMATION_WORKER=1` on that single API **or** disable worker and use one cron with `WHATSAPP_WORKER_SECRET`
4. Keep Meta webhook pointed at the single public API URL

---

## Hardening delivered in Phase 6 (code)

1. **Webhook claim** — atomic `status: RECEIVED` → `PROCESSING` (closes concurrent double-process race)
2. **Duplicate inbound** — no staff notification / automation on duplicate `providerMessageId`
3. **Status monotonicity** — do not downgrade READ→DELIVERED; FAILED always applies
4. **Meta Graph error mapping** — permanent vs transient codes (invalid phone/template/permission vs rate limit/5xx/network)
5. **Bounded retry** — `classifyRetry` no longer treats all `MESSAGE_SEND_FAILED` as retryable
6. **Outbound automation idempotency** — SEND_* skips Meta if prior COMPLETED step already has `providerMessageId`
7. **Execution create race** — P2002 on idempotency key returns duplicate execution
8. **Failure visibility** — FAILED Message rows on template/session send failure; AI `ERROR` interactions on send failure
9. **RBAC nav** — WhatsApp sidebar gated on `WHATSAPP_VIEW` (not `PATIENTS_READ`)
10. **Audit** — `whatsapp.execution.start` on live flow start

---

## Verification labels (how to read the matrix)

| Label | Meaning |
|-------|---------|
| CODE VERIFIED | Implemented and reviewed in repo |
| AUTOMATED TEST VERIFIED | Covered by API unit/integration tests |
| PRODUCTION VERIFIED | Observed healthy on deployed Railway/Vercel with real credentials |
| REAL WHATSAPP VERIFIED | End-to-end with real patient + staff WhatsApp devices |

---

## Real WhatsApp E2E checklist (post-deploy — not claimed here)

**Patient → clinic**

- [ ] Text
- [ ] Image / Voice / Video / Document / Sticker
- [ ] Template-triggered response
- [ ] AI conversation (clinic AI enabled)
- [ ] Human handoff

**Staff → patient**

- [ ] Text / Image / Voice / PDF / Template / Reply

**Automation**

- [ ] Incoming trigger → condition → send template → wait → patient reply → resume → Care Loop → AI → handoff

**Realtime**

- [ ] Every step visible in inbox **without** page refresh

Mark each item REAL WHATSAPP VERIFIED only after the corresponding live test.

---

## BLOCKERS / WARNINGS / READY

See final Phase 6 report in the PR / chat response for the live classification matrix.

---

## Capability classification (as of Phase 6 code ship)

| Capability | CODE | AUTOMATED TEST | PRODUCTION | REAL WHATSAPP |
|------------|------|----------------|------------|---------------|
| Webhook idempotency | Yes | Partial (dup webhook tests) | No | No |
| Outbound automation idempotency | Yes | Unit/classifier | No | No |
| Retry transient vs permanent | Yes | Yes (phase6) | No | No |
| Failure visibility | Yes | Partial | No | No |
| Worker (single replica) | Yes | N/A | No | No |
| Realtime SSE (single instance) | Yes | Existing realtime tests | No | No |
| Media persistence | Local FS only | Download/proxy tests | **BLOCKER** without volume | No |
| Media security | Yes | Yes (auth/cross/range/MIME) | No | No |
| Templates / chat / automation / AI / KB / Care Loop | Prior phases | Prior phase suites | No | No |
| RBAC WhatsApp | Yes | Yes (matrix) | No | No |
| Audit important actions | Yes | Existing audit test | No | No |

**Not 100% production ready** while media durability + multi-instance realtime remain constrained and live WhatsApp E2E is unchecked.

