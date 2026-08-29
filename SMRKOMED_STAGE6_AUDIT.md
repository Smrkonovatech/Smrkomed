# SMRKOMED Stage 6 Audit — Pharmacy / Medication

**Date:** 2026-08-29  
**Rule:** Inspect-first. Extend existing Pharmacy + WhatsApp + Care Loop + Smrko AI. No duplicate systems.

---

## 1. What already exists (reuse)

| Area | Location | Notes |
|------|----------|--------|
| PharmacyProduct / Batch / StockMovement | Prisma | Full inventory domain |
| Purchase orders, suppliers, sales | Prisma + API + UI | Working module |
| PharmacyPrescription + Items | Rich fields (dose, frequency, timeOfDay, beforeAfterFood, dates) | Reuse as schedule source |
| MedicationReminder | Scheduled WhatsApp reminder rows | Demo-mode today |
| Dispense with batchId | API + prescriptions UI | Stock atomic via stock.ts |
| Dashboard / alerts / reports | `/pharmacy/*` | KPIs + 7 report types |
| Patient Pharmacy tab | `patients/[slug]` | History via couple API |
| Permissions | `pharmacy:*` roles | PHARMACIST, MANAGER, etc. |
| Billing link | pharmacy-sales → invoice | Existing payments |
| WhatsApp `MEDICINE_ASSIGNED` / `MEDICINE_REMINDER` | Dispatch on Rx create | Reminder fired too early |
| Library medicine flows | Stage 4 library | Seed as DRAFT |
| Seed demo pharmacy | `seed-pharmacy.ts` | 10+ products, scenarios |

---

## 2. Incomplete / gaps (implement Stage 6)

| Gap | Approach |
|-----|----------|
| Adherence statuses UPCOMING/DUE/TAKEN/MISSED | Additive enum values + API mark taken/missed; derive DUE from clock |
| Worker does not emit due MedicationReminders | Wire worker → `MEDICINE_REMINDER` / `MEDICATION_DUE` |
| `MEDICINE_REFILL` unwired | Optional trigger when qty low / end approaching |
| Live Rx create → CareTask | Create follow-up Care Task like seed |
| Reminder always `demoMode: true` | Keep demo until Meta; still dispatch flow for ACTIVE clinic flows |
| Pharmacy AI tools | Add read-only tools to Smrko AI |
| Dedicated patient medications UX | Enrich Pharmacy tab + optional schedule API |
| Medication starting tomorrow | Worker window + library flow |
| Prescription dispensed WA | Dispatch `MEDICINE_DISPENSED` after dispense |
| Dashboard polish | Ensure Stage 6 KPI names match spec |
| Prevent expired dispense | Verify stock.ts already blocks; strengthen if needed |

---

## 3. Do NOT rebuild

- Second pharmacy module
- Second WhatsApp engine
- Second AI
- Second task/audit system
- New MedicationSchedule table (use PrescriptionItem + MedicationReminder)

---

## 4. Database

**Prefer no new models.**  
**Additive only if needed:** extend `MedicationReminderStatus` with `DUE`, `TAKEN`, `MISSED`, `SKIPPED`, `COMPLETED` (and keep delivery statuses).

---

## 5. Security

- Clinic isolation on all pharmacy routes
- RBAC via existing pharmacy permissions
- No secrets in logs
- WhatsApp: no fake delivery; Meta required for live send

---

## 6. Implementation order

1. Audit (this doc)  
2. Reminder/adherence + worker triggers  
3. Rx CareTask + dispense WhatsApp + library flows  
4. Patient medication schedule API/UI  
5. AI tools + dashboard/reports polish  
6. Tests + Stage 6 report  
