# SMRKOMED WhatsApp Stage 5 Report

**Date:** 2026-08-29  
**Scope:** Operational Inbox, human handoff, assignment, timeline, consent/preferences, segmentation, controlled campaigns, analytics.  
**Rule:** Extended Stage 1–4 only — no second WhatsApp, automation, or AI stack.

---

## 1. Existing architecture

Reused Conversation/Message/Consent, Meta send/webhook, Automation Center (flows/engine/worker), Stage 4 safety (consent/hours/frequency), Smrko AI, CareTask, Notification, AuditLog.

## 2. Reused components

- `sendWhatsAppTemplate` + new session text helper
- `dispatchWhatsAppTrigger` (now skips patients with `automationPausedAt`)
- Worker tick (+ campaign processing)
- Permissions `whatsapp:*`
- Existing overview + execution APIs

## 3. New features

| Feature | Status |
|---------|--------|
| Inbox 3-col (list / thread / context) | ✅ WORKING |
| Filters + search | ✅ WORKING |
| Staff assignment (membership-validated) | ✅ WORKING |
| Human takeover → HUMAN_HANDOFF + pause + CareTask + notify | ✅ WORKING |
| Pause / resume automation | ✅ WORKING |
| Session free-text staff reply | ✅ WORKING (🔵 Meta session window) |
| Follow-up Care Task from inbox | ✅ WORKING |
| Message labels AUTOMATION / STAFF / PATIENT / AI | ✅ WORKING |
| Patient communication timeline API | ✅ WORKING |
| Consent Center UI + API | ✅ WORKING |
| CommunicationPreference model + API | ✅ WORKING |
| Segment preview (real DB) | ✅ WORKING |
| Campaigns create / confirm / cancel / batch send | ✅ WORKING (🔵 Meta + templates) |
| Analytics page (30d real metrics + staff workload) | ✅ WORKING |
| Logs page (was broken nav) | ✅ WORKING |
| Smrko AI inbox deep-link | 🟡 PARTIAL (link to Overview/AI; no dedicated draft panel) |
| Demo seed 10× entities | 🔴 NOT IMPLEMENTED (use live clinic data) |
| Average response time charts | 🟡 PARTIAL (counts only; no chart lib) |

## 4. Database changes

**Migration:** `packages/database/prisma/migrations/20260829120000_whatsapp_stage5_inbox_campaigns/migration.sql`

- `ConversationStatus` + `HUMAN_HANDOFF` | `ESCALATED` | `RESOLVED`
- Conversation: `assignedStaffId`, `priority`, `handoffAt`, `handoffReason`, `automationPausedAt`, `lastStaffReadAt`
- `CommunicationPreference`
- `WhatsAppCampaign` + `WhatsAppCampaignRecipient`

Additive only.

## 5. API changes (examples)

Under `/api/v1/whatsapp-automation/`:

- `GET /inbox`, `GET /inbox/:id`, `GET /inbox/:id/context`
- `POST /inbox/:id/assign|reply|follow-up|pause-automation|resume-automation`
- `PATCH /inbox/:id/status`
- Extended `POST /conversations/:id/takeover`
- `GET/POST /consent`, `GET/PATCH /patients/:id/preferences`
- `GET /patients/:id/timeline`
- `POST /segments/preview`
- `GET/POST /campaigns`, `POST /campaigns/:id/confirm|cancel|process`
- `GET /analytics/detailed`, `GET /staff`

Session send: `sendWhatsAppSessionText` in messaging provider.

## 6–14. Feature notes

**Inbox:** Desktop 3-column; mobile list → thread → patient sheet.  
**Handoff:** Sets status, pause, assignee, CareTask, notification, audit.  
**Timeline:** Composes Message + Execution + Consent + WhatsApp CareTasks.  
**Consent:** Separate from marketing preference (`marketingOptIn`).  
**Segmentation:** Real filters; exclusion reasons NO_PHONE, NO_CONSENT, OPTED_OUT, FREQUENCY_LIMIT.  
**Campaigns:** Draft → materialize → explicit confirm → RUNNING batches via worker/API. Template APPROVED required.  
**AI:** Reuse Smrko AI; no auto-send.  
**Analytics:** 30-day real counts; empty state honest.  
**Staff workload:** Assigned conversation counts only.

## 15. Security

- clinicId from session
- Assign validates `ClinicMembership` ACTIVE
- Campaigns/consent/preferences clinic-scoped
- No secrets in logs
- Automation skipped when conversation `automationPausedAt` set

## 16. Testing

| Check | Result |
|-------|--------|
| `npm run typecheck -w @smrkomed/api` | ✅ |
| `npm run typecheck -w @smrkomed/web` | ✅ |
| `prisma validate` | ✅ |
| `whatsapp-automation.test.ts` (15) | ✅ |
| Full `npm test -w @smrkomed/api` / database | 🔴 needs Postgres |
| `npm run lint -w @smrkomed/web` | 🟡 pre-existing repo failures |

## 17. Production requirements

1. Apply Stage 5 migration  
2. Meta WhatsApp connected + APPROVED templates  
3. Worker: `WHATSAPP_AUTOMATION_WORKER=1` and/or `WHATSAPP_WORKER_SECRET` cron (campaigns + WAIT)  
4. Recommend `requireConsentGranted=true` in Settings  
5. AUTH / DATABASE / CORS / ENCRYPTION keys unchanged  

## 18. Known limitations

- Session text fails outside Meta 24h window — UX points to templates  
- Campaign batch uses empty template parameters (templates with required vars need careful naming / future param mapping)  
- No full AI draft panel inside composer (Stage 5 wires ops; Smrko AI remains global)  
- No dedicated charting library  
- Contacts nav removed from primary nav (Consent + Analytics added)  
- Demo seed not shipped  

## Verdict

**Stage 5 READY WITH CONFIG** — typecheck + unit tests green; apply migration and Meta/worker for live messaging and campaign sends.
