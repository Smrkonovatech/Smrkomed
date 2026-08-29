# SMRKOMED WhatsApp Stage 5 Audit

**Date:** 2026-08-29  
**Rule:** Inspect-first. Extend Stage 1–4 only. No second WhatsApp, automation, or AI stack.

---

## 1. What already exists (reuse)

| Area | Location | Notes |
|------|----------|--------|
| Conversation / Message / Consent | Prisma + messaging/webhook | Single inbox store |
| ConversationStatus | `OPEN`, `WAITING_PATIENT`, `WAITING_STAFF`, `CLOSED` | Underused in product |
| Human takeover | `POST .../conversations/:id/takeover` | Cancels WAITING/RUNNING + CareTask |
| Broadcast preview | `POST .../broadcast/preview` + UI | `sendEnabled: false` |
| Clinic comm settings | `WhatsAppClinicSettings` | Hours, frequency, consent mode |
| Automation engine + Logs API | whatsapp-automation | Executions timeline |
| Overview analytics | `/overview` | Real DB counts |
| Smrko AI draft | `POST /api/ai/chat`, tool `draftPatientMessage` | Never auto-sends |
| Notifications | `Notification` + inbound webhook | Reuse for handoff |
| AuditLog | `audit()` helper | Sanitized metadata |
| Inbox UI | `/whatsapp/inbox` | 2-col; takeover button |
| Patient page Conversation tab | `patients/[slug]` | Mostly demo thread |
| Safety gates | `safety.ts` | Consent, frequency, hours, vars |

---

## 2. Missing for Stage 5

| Requirement | Gap | Approach |
|-------------|-----|----------|
| Inbox 3-col + filters/search | Basic list only | Expand conversation list API + UI |
| Staff assignment | No `assignedStaffId` | **Additive** field + assign API |
| Operational status / handoff flag | Status underused; no HUMAN | Use status + `handoffAt` / `handoffReason` |
| Unread | No field | Derive or `lastStaffReadAt` additive |
| Free-text / session reply | Not in inbox | Reuse Meta session window if available; else template-only + clear UX |
| Patient communication timeline | No unified API | Compose from Message + Execution + CareTask + Consent |
| Communication preferences | No model | New `CommunicationPreference` (additive) |
| Consent Center UI | Enforcement only | Clinic + patient consent APIs/UI |
| Segmentation | Preview filters only | Query engine API (no fake counts) |
| Campaigns | Preview only | `WhatsAppCampaign` + recipients (controlled send) |
| AI in Inbox | Not wired | Call existing `/api/ai/chat` with conversation context |
| Analytics page | Overview only | New `/whatsapp/analytics` using real queries |
| Logs page | Nav broken | Add `/whatsapp/logs` if missing |
| Durable tags | Execution context only | Prefer couple/patient soft tags or skip duplicate system |
| Staff workload metrics | None | Analytics queries by assignee |

---

## 3. Database requirements

**Additive migration only if genuinely required:**

1. `Conversation.assignedStaffId` (FK User, optional)
2. `Conversation.priority` (String default NORMAL)
3. `Conversation.handoffAt`, `Conversation.handoffReason` (optional)
4. `Conversation.lastStaffReadAt` (optional — unread derivation)
5. Extend `ConversationStatus` with `HUMAN_HANDOFF` | `ESCALATED` | `RESOLVED` **or** map via existing + handoffAt
6. `CommunicationPreference` (1:1 patient): channel toggles + reminder types
7. `WhatsAppCampaign` + `WhatsAppCampaignRecipient` for controlled broadcast

No reset / no prod db push. Prefer computing unread before adding columns where possible.

---

## 4. API requirements

| Change | Notes |
|--------|-------|
| Enrich `GET conversations` | Filters, search, assignee, automation hint, unread |
| Assign / unassign / status | Clinic-scoped, membership check |
| Takeover / resume / pause | Extend existing takeover; resume ACTIVE wait cancellation undo via new pause flag |
| Patient context panel | Aggregate existing patient/appt/task/payment APIs |
| Timeline | `GET .../patients/:id/communication-timeline` |
| Consent list/update | Clinic-scoped |
| Preferences GET/PATCH | Patient-scoped |
| Segments preview | Filter → real counts |
| Campaign CRUD + confirm + worker tick | Consent + template gates |
| Analytics | Range queries, staff workload, template/flow stats |
| Inbox AI assist | Thin wrapper using Smrko AI (no new AI) |

---

## 5. UI requirements

- Inbox: desktop 3-col; tablet 2-col + drawer; mobile stack
- Consent page or Settings section
- Broadcasts → real campaign wizard (confirm gate)
- Analytics page + fix Logs nav
- Patient Communication Timeline tab (live data)
- Keep SMRKOMED branding; not consumer WhatsApp green

---

## 6. External credentials

- Meta WhatsApp (token, WABA, phone, webhook) — 🔵
- OpenAI for AI drafts — 🔵
- Worker for campaign schedule + WAIT — same Stage 4 vars

---

## 7. Security

- clinicId from session only
- Staff assign must verify clinic membership
- Consent-aware sends; no unrestricted free-text mass send
- No secrets in logs; audit assignment/handoff/campaign/consent

---

## 8. Risks

- Free-text Meta send outside 24h window fails — must UX clearly
- Campaign send can spam if gates incomplete — confirm + frequency + consent mandatory
- Expanding ConversationStatus enum requires careful Prisma migration
- Demo data must stay non-production

---

## 9. Tests required

- Clinic isolation on conversations/campaigns/timeline
- Assign membership validation
- Takeover pause + resume
- Consent / preference opt-out
- Campaign exclusions (NO_CONSENT, NO_PHONE, …)
- Unauthorized role blocked
- Analytics empty-state honesty

---

## 10. Implementation order (this Stage)

1. Audit (this doc)  
2. Inbox + conversation management  
3. Handoff + assignment  
4. Timeline  
5. Consent + preferences  
6. Segmentation  
7. Campaigns  
8. AI inbox assist  
9. Analytics  
10. Tests + report  

**Principle:** Operational communication layer connecting WhatsApp ↔ Care Loop ↔ Pharmacy ↔ Payments ↔ Staff ↔ Smrko AI — clinic-scoped, consent-aware, auditable, human-controlled.
