# SMRKOMED WhatsApp Stage 2 Audit

**Date:** 2026-08-28  
**Method:** Code inspection only (no application code modified during this audit document).  
**Scope:** Extend WhatsApp Automation Center with Flows, engine, Knowledge Base, logs — without replacing Meta integration.

---

## 1. What already exists

| Area | Evidence | Status |
|------|----------|--------|
| Meta Cloud API | `apps/api/src/integrations/providers/whatsapp/{graph,messaging,webhook,onboarding,sync}.ts` | Production-shaped |
| Connection / Embedded Signup | `WhatsAppConnectionPanel`, `/integrations/whatsapp` | Ready (needs Meta credentials) |
| Templates sync + list | `WhatsAppTemplate`, GET templates, POST sync | Ready; **body/components not stored** |
| Template send | `sendWhatsAppTemplate` (APPROVED only) | Ready |
| Conversation / Message | Prisma + inbox at `/whatsapp/inbox` | Reuse — **do not duplicate** |
| Consent | `Consent` WHATSAPP_COMMUNICATION | Enforced on send |
| IntegrationEvent | Webhook idempotency + logs spine | Reuse for delivery events |
| Stage 1 Center UI | `/whatsapp/*` nav, Overview, Templates, Inbox, Settings | Shell exists |
| AutomationRule | Schema only: `name`, `trigger`, `config` Json | **No runner** |
| Care Loop / Appointments / Pharmacy / Payments | Full modules | Event sources for triggers |
| Smrko AI | `/api/ai/chat`, tools | Reuse — no second AI |
| AuditLog / RBAC / clinic session | Existing | Must continue |

---

## 2. What can be reused

- Entire Meta Graph client and webhook HMAC path  
- `sendWhatsAppTemplate` for SEND_TEMPLATE actions  
- `Conversation` / `Message` for inbox + delivery status  
- `Consent` gate before any outbound  
- Stage 1 Overview analytics (extend with flow execution counts)  
- Pharmacy `MedicationReminder` / CareTask / Appointment / BillingInvoice as **trigger payloads**  
- Design system (PageHeader, cards, sidebar patterns)  
- `AutomationRule` optionally as thin alias — **prefer dedicated Flow models** for multi-node graphs  

---

## 3. What needs modification

| Item | Change |
|------|--------|
| `/whatsapp/flows` placeholder | Replace with real list + builder |
| `/whatsapp/knowledge-base` | Real CRUD |
| `/whatsapp/logs` | Execution + message status UI |
| `/whatsapp/automations` | Alias or redirect to Flows (avoid two engines) |
| Overview analytics | Add active/completed/failed executions (real counts) |
| Inbox | Optional automation badges when execution linked |
| Permissions | Add `whatsapp:*` keys (or map carefully to patients/settings) |
| Clinic model relations | Wire new flow/KB models |
| Webhook inbound | Hook: “patient replied” → resume WAITING executions (extend, don’t replace) |

---

## 4. New database models (minimal)

**Required (additive migration only):**

| Model | Purpose |
|-------|---------|
| `WhatsAppFlow` | Clinic-scoped flow; `definition` Json = nodes + edges; status DRAFT/ACTIVE/PAUSED/ARCHIVED; triggerType; isLibrary |
| `WhatsAppFlowExecution` | Run instance; patient/couple/conversation; status; currentNodeId; resumeAt; idempotencyKey |
| `WhatsAppFlowExecutionStep` | Per-node history |
| `WhatsAppKnowledgeArticle` | Clinic KB articles |

**Not required as separate tables if Json graph is used:** `WorkflowNode` / `WorkflowEdge` as rows — stored inside `WhatsAppFlow.definition` (same capability, fewer joins). Document as equivalent.

**Do not create:** second Conversation/Message/Template tables.

**Migration risk:** Low if additive only. **Never** `migrate reset`.

---

## 5. New API routes (proposed)

Mount under existing protected API, e.g. `/api/v1/whatsapp-automation` or `/api/v1/whatsapp/flows` **without** colliding with `/integrations/whatsapp`.

| Routes | Purpose |
|--------|---------|
| CRUD `/flows` | Flow definitions |
| POST `/flows/:id/activate\|pause\|archive\|test\|duplicate` | Lifecycle |
| GET `/flows/:id/executions` | Runs |
| GET `/executions/:id` | Detail |
| POST `/executions/:id/resume\|cancel\|handoff` | Control |
| CRUD `/knowledge` | KB |
| GET `/logs` | Filtered executions |
| POST `/triggers/:type` (internal) | Event bus from Care Loop/appointments (service calls, not public) |

Reuse: `/integrations/whatsapp/templates`, `/messages/template`, conversations.

---

## 6. New UI

| Page | Notes |
|------|-------|
| Flows list | Active/Draft/Paused cards |
| Flow builder | Canvas (card/node list + connect); mobile = step list |
| KB list/edit | Articles |
| Logs | Executions table |
| Template tabs | Enhance existing page (Approved/Pending/…) |

**Do not** build a second Inbox.

---

## 7. Currently mocked / incomplete

| Item | Reality |
|------|---------|
| Flow placeholders | UI ONLY |
| Pharmacy WA reminders | Always `demoMode` — not live Graph |
| Communication page demo couples | Fallback when no live threads |
| Analytics “appointment flow” rows | Explicit “Not enough data” until executions exist |
| Template submit to Meta | Not in Graph helpers — BM + Sync only |

---

## 8. Production-ready today

- Meta connect / disconnect / sync  
- Template send (APPROVED) with consent  
- Webhook inbound text + status updates  
- Clinic isolation on existing WA routes  
- Stage 1 Center navigation  

---

## 9. Requires Meta credentials

- Live send / delivery / read  
- Template sync from Meta  
- Webhook receive in deployed environment  

**Classification:** `REQUIRES CREDENTIALS` for live messaging.

---

## 10. Migration & worker risks

| Risk | Mitigation |
|------|------------|
| Additive Prisma migration | Named migration SQL; no reset |
| WAIT nodes / scheduled triggers | **REQUIRES PRODUCTION WORKER/CRON** — engine persists `resumeAt`; document poller; no browser timers |
| Duplicate sends | Unique idempotency key per (clinic, flow, triggerEventId, patient) |
| Cross-clinic leakage | Always `clinicId` from session on queries |
| Over-eager auto clinical actions | Actions that mutate appointments/meds need explicit permission + confirmation; default = message + CareTask only |
| Large Json definitions | Cap node count; validate on activate |

---

## Implementation plan after audit

1. Additive Prisma models + permissions  
2. Flow CRUD + validation API  
3. Execution engine (sync steps + WAIT persistence)  
4. Seed library of 10 draft flows (inactive)  
5. Flows UI + simplified visual builder  
6. KB CRUD + clinic isolation  
7. Logs UI  
8. Wire a few internal trigger helpers (appointment/care task) where safe  
9. Typecheck; honest report classifications  

**Honesty labels for deliverables:**  
`CODE VERIFIED` · `REQUIRES CREDENTIALS` · `REQUIRES PRODUCTION WORKER` · `UI ONLY` · `NOT IMPLEMENTED`
