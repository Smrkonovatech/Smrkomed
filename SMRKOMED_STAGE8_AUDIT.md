# SMRKOMED Stage 8 Audit — Patient 360 + Unified Timeline

**Date:** 2026-08-29  
**Rule:** Inspect-first. Compose existing modules. No second AI / patient DB / WhatsApp / ABDM stack.

---

## 1. What already exists (reuse)

| Area | Status | Notes |
|------|--------|--------|
| Couple patient profile | ✅ | Multi-tab hub at `patients/[slug]` |
| Couple DTO | ✅ | Doctor, coordinator, treatment, nextStep |
| Digital health `buildTimeline` | ✅ | Appts, consults, Rx, sales, treatments, care plans, docs |
| Pharmacy patient/couple history | ✅ | Medications + schedule |
| Payments / insurance overviews | ✅ | Patient + couple endpoints |
| Care plans / tasks APIs | ✅ | `/care-plans`, `/care-tasks` |
| Smrko AI `getCoupleSummary` | ✅ | Closest to Patient 360 |
| Attention scoring | ✅ | `attention.ts` — operational only |
| Prepare Consultation UI | ✅ | Partial; needs live data |
| Stage 7 ABHA/consent/exchange | ✅ | Display in 360; do not rebuild |
| Documents metadata | 🟡 | No blob upload pipeline |
| Conversation tab | 🟡 | Demo thread, not live WhatsApp |

## 2. Gaps

- No `GET .../360` aggregator
- Timeline misses: CareTasks, billing, insurance, WhatsApp, medication reminders, ABDM events
- Overview uses demo care-plan steps / activity in places
- AI `getPatientHealthTimeline` thinner than API timeline
- No server-side Patient 360 attention bundle for the profile header

## 3. Database

**Prefer NO new models.** Compose queries over existing tables.  
No `Patient360` / `TimelineEvent` table.

## 4. Recommended API

```
GET /api/v1/couples/:idOrSlug/360
GET /api/v1/patients/:patientId/360   (optional alias → resolve couple)
```

Payload: header + summary cards + timeline + attention + module summaries.

## 5. Security

Reuse: Auth.js session clinic, `requirePermission`, `requireClinicOwned`, never trust client clinicId.

## 6. Documents

Keep metadata; show **"Document storage is not configured"** when `storageKey` absent. Do not fake uploads.

## 7. Classification plan

| Feature | Target |
|---------|--------|
| Patient 360 compose API | WORKING |
| Unified timeline (derived) | WORKING |
| Overview UI wired to 360 | WORKING |
| AI getPatient360 tools | WORKING (read-only) |
| Document blob storage | NOT CONNECTED / honest empty |
| Live WhatsApp in Conversation tab | PARTIALLY WORKING (link if conversation exists) |
| Fake ABDM/WhatsApp/payment success | Forbidden |

## 8. Implementation order

1. This audit  
2. Shared timeline builder + `/360` APIs  
3. Patient overview UI  
4. AI tools + alerts  
5. Tests + report  
