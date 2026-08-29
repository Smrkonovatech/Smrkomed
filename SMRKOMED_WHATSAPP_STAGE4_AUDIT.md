# SMRKOMED WhatsApp Stage 4 Audit

**Date:** 2026-08-29  
**Rule:** Inspect-only for this document; implementation follows in ordered phases.  
**Prior:** Stage 2 engine/builder verified (`SMRKOMED_WHATSAPP_STAGE2_VERIFICATION.md`).

---

## 1. Existing functionality (reuse — do not rebuild)

| Area | Location | Status |
|------|----------|--------|
| Meta Cloud API / connect / sync / send APPROVED | `integrations/providers/whatsapp/*` | Production-oriented |
| Conversation / Message / Consent / Webhooks | Prisma + messaging + webhook | Keep as single inbox |
| Flow engine (WAIT, lock, retry, idempotency, conditions) | `whatsapp-automation/engine.ts` | Stage 2 |
| Worker tick + scheduled appt/care | `worker.ts` | Stage 2 |
| Flow builder `@xyflow/react` | `flow-canvas.tsx` | Stage 2 |
| KB CRUD (title/category/content/status) | API + `/whatsapp/knowledge-base` | Basic |
| AI + published KB injection | `apps/web/src/lib/ai/service.ts` | Basic |
| Triggers: patient create, appt booked, care task create | patients/appointments/care-loop | Wired |
| Worker: APPOINTMENT_TOMORROW, CARE_TASK_DUE/OVERDUE | worker | Wired |
| Library flows (10) | `library.ts` | Draft SYSTEM via `isLibrary` |
| Overview KPIs | `/whatsapp-automation/overview` | Real counts |
| Inbox automation hint | inbox page + executions by patientId | Partial |
| Pharmacy prescription items + MedicationReminder | pharmacy module | Data rich; **no flow dispatch** |
| BillingPayment | payments module | **no flow dispatch** |
| Consent check on send | messaging.ts | Blocks **REVOKED** only (not require GRANTED) |

---

## 2. Missing for Stage 4 (implement)

| Requirement | Gap | Approach |
|-------------|-----|----------|
| KB keywords, specialty, richer categories | No columns | **Additive migration** |
| 20 SYSTEM library flows | Only 10 | Expand `library.ts` (seed idempotent) |
| Medicine → WhatsAppFlow | No dispatch | Hook after `scheduleMedicationReminders` |
| Payment → WhatsAppFlow | No dispatch | Hook create/success/fail |
| Appointment missed / cancelled / 2h | Types partial | Worker windows + status patch hooks |
| Require consent GRANTED for automation | Soft check today | Engine pre-send + clinic setting |
| Working hours | None | `WhatsAppClinicSettings` Json hours |
| Frequency limits | None | Same settings + Message count query |
| Variable resolution hard-fail | Soft empty strings | Resolve + skip send if required missing |
| Template “used in flows” | None | Query flow definitions |
| Broadcast foundation | Placeholder only | Minimal audience preview API + UI shell with confirm gate |
| Human handoff pause automation | Escalation creates task | Cancel WAITING executions for patient + CareTask |
| Analytics extras (consent blocked, template usage) | Partial overview | Extend overview queries |

---

## 3. Database requirements

**Existing migration:** `20260828190000_whatsapp_automation_flows` — keep.

**New additive migration required (genuinely):**

1. `WhatsAppKnowledgeArticle.keywords` `String?`
2. `WhatsAppKnowledgeArticle.specialty` `String?`
3. `WhatsAppClinicSettings` (1:1 clinic): workingHours Json, maxMessagesPerDay, minDelayMinutes, requireConsentGranted, urgentBypassHours

No reset / no db push to prod.

---

## 4. API requirements

| Change | Notes |
|--------|-------|
| KB schemas + CRUD | keywords, specialty |
| `GET/PATCH /settings/communication` | Clinic WhatsApp communication settings |
| Overview metrics | consentBlocked, frequencySkipped, templateUsage top |
| Templates list enrichment | optional `usedInFlowCount` |
| Engine: consent + hours + frequency + variables | Before SEND_TEMPLATE |
| `dispatchWhatsAppTrigger` from pharmacy/payments/appointments patch | Fail-isolated |
| Broadcast preview (foundation) | Count only; no send in Stage 4 unless safe |

---

## 5. UI requirements

- KB: specialty, keywords, categories list, search/filter polish  
- Settings: working hours + frequency + consent mode  
- Templates: used-in-flows count  
- Overview: new real metrics / empty states  
- Inbox: pause automation / handoff clearer  
- Builder: more trigger options in palette (already mostly in TRIGGER_TYPES)  
- Broadcasts: foundation preview (not unrestricted mass send)  
- Library: more SYSTEM cards  

---

## 6. External credentials

Same as Stage 2: Meta app, WABA, `WHATSAPP_WORKER_SECRET`, encryption key, OpenAI for AI+KB. Live send = 🔵 credentials.

---

## 7. Production requirements

- Migration deploy  
- Worker on for WAIT + new medicine/payment schedules if timed  
- Meta approved templates matching library names (or clinic remaps on duplicate)  

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Stricter consent breaks clinics with no Consent rows | Setting `requireConsentGranted` default **false**; document flip to true |
| Duplicate medicine messages | Idempotency key includes reminder id |
| Outside hours + urgent | Setting `urgentBypassHours` for ESCALATE path only |
| Breaking existing flows | Additive only; defaults preserve Stage 2 behavior |

---

## 9. Tests required

- Consent gate (requireGranted on/off)  
- Frequency skip reason  
- Working hours defer → WAIT resumeAt  
- Pharmacy/payment dispatch idempotency keys  
- KB specialty/keywords isolation  
- Clinic settings scoped  

---

## 10. Phase order (execution)

1. ✅ This audit  
2. KB + migration + AI filter  
3. Library expansion + appointment/care hooks  
4. Pharmacy + payment dispatch  
5. Consent / hours / frequency in engine + settings API/UI  
6. Builder/variables polish  
7. Inbox handoff  
8. Analytics/logs polish  
9. Broadcast foundation (safe)  
10. Tests + `SMRKOMED_WHATSAPP_STAGE4_REPORT.md`  

**Must not rebuild:** Meta, Conversation store, Smrko AI, Care Loop/Pharmacy/Payments cores.
