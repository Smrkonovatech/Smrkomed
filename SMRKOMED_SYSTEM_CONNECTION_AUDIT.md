# SMRKOMED SYSTEM CONNECTION AUDIT

## 1. Executive Summary

**Overall system status:** SmrkoMed is currently operating in a hybrid state. Core structural elements (Auth, Patients, Clinics) are fully backed by the database, but many of the advanced clinical and operational features (Clinical Diagnostics, Smart Discharge, Staff/Roles, Care Loop) rely entirely on isolated frontend state and mock data.

**HOSPEX readiness:** High (due to extensive frontend demo layers).
**Backend readiness:** Low-to-Medium (significant gaps in clinical data models).
**Integration readiness:** Partial (ABDM has infrastructure; others like WhatsApp are nascent).
**Biggest risk:** Data duplication across various `demoData.ts` files creating false assumptions about systemic interconnectivity.
**Biggest opportunity:** Connecting the rich, existing UI layers for Clinical Diagnostics and IVF Lab directly to persistent PostgreSQL models to unlock a true clinical System of Record.

---

## 2. Current Architecture

The codebase relies on a monolithic App Router Next.js architecture leveraging Prisma ORM.

Frontend (Next.js App Router)
    ↓
API Routes (`/app/api/*` and Server Actions)
    ↓
Prisma ORM (`packages/database/prisma/schema.prisma`)
    ↓
PostgreSQL
    ↓
External Integrations (NextAuth for Auth, partial WhatsApp/ABDM)

---

## 3. Module Connection Matrix

| Module | UI | API | DB | Integration | Status |
|--------|----|-----|----|-------------|--------|
| **Dashboard** | 🟢 YES | 🟡 PARTIAL | 🟡 PARTIAL | ⚪ NO | 🟡 PARTIAL |
| **Patients & Couples** | 🟢 YES | 🟢 YES | 🟢 YES | ⚪ NO | 🟢 REAL |
| **Appointments** | 🟢 YES | 🟢 YES | 🟢 YES | ⚪ NO | 🟢 REAL |
| **Legacy Doctors** | 🟢 YES | 🟢 YES | 🟢 YES | ⚪ NO | 🟢 REAL |
| **Staff & Roles** | 🟢 YES | ⚪ NO | ⚪ NO | ⚪ NO | 🔵 FRONTEND DEMO ONLY |
| **Clinical Diagnostics** | 🟢 YES | ⚪ NO | ⚪ NO | ⚪ NO | 🔵 FRONTEND DEMO ONLY |
| **Smart Discharge** | 🟢 YES | ⚪ NO | ⚪ NO | ⚪ NO | 🔵 FRONTEND DEMO ONLY |
| **Care Loop** | 🟢 YES | ⚪ NO | 🟡 PARTIAL | ⚪ NO | 🔵 MOCK UI / PARTIAL DB |
| **WhatsApp** | 🟢 YES | 🟡 PARTIAL | 🟢 YES | 🟡 PARTIAL | 🟡 PARTIAL |
| **Billing & Insurance** | 🟢 YES | ⚪ NO | 🟢 YES | ⚪ NO | 🟡 DB EXISTS, UI MOCK |
| **ABDM / Digital Health** | 🟢 YES | 🟢 YES | 🟢 YES | 🟡 PARTIAL | 🟡 SANDBOX VERIFIED |

---

## 4. Patient Data Flow

Patient flow represents the strongest real connection in the app:
- Can a patient be created? **CONNECTED** (via DB `Patient` model)
- Associated with a couple? **CONNECTED** (via DB `Couple` model)
- Can they have an appointment? **CONNECTED** (via DB `Appointment` model)
- Can consultation data be saved? **CONNECTED** (via DB `ConsultationNote` model)
- Can medications be attached? **PARTIAL** (DB models exist, UI disconnected)
- Can diagnostic results be attached? **MISSING** (No DB models for lab results)
- Can Care Loop tasks be generated? **MOCK** (Runs entirely off `demo-data.ts`)

---

## 5. IVF Data Flow

The IVF clinical journey has significant persistence gaps:
- Patient & Couple -> **REAL**
- IVF Cycle -> **REAL** (Model `IVFCycle` exists)
- Care Plan -> **REAL** (Model `CarePlan` exists)
- Blood Tests & Hormones -> **MISSING** (No DB schema)
- Ultrasound & Follicular -> **MISSING**
- Semen Analysis & Sperm Processing -> **MISSING**
- Oocytes & Fertilisation -> **MISSING**
- Embryology & Cryostorage -> **MISSING**

---

## 6. Clinical Diagnostics

**Status: FRONTEND DEMO ONLY**
- **UI:** Exists and is highly detailed (Vitals, Lab, Fertility, Semen Analysis, IVF Lab).
- **State:** React Local State only.
- **Data Source:** `clinical-diagnostics/demoData.ts`
- **Database:** Zero supporting Prisma models.
- **ABDM:** Isolated from ABDM. 

---

## 7. Staff / RBAC

**Status: FRONTEND DEMO ONLY**
- **Legacy Doctors:** Real. Connected to `User` and `Role` models.
- **New Staff Module:** Mock. Operates entirely off `staffDemoData.ts`.
- **RBAC Enforcement:** Not enforced via backend middleware for new roles (e.g., Lab Technician, Care Coordinator). 
- **Permissions:** Visual only. The Permission Matrix (View/Create/Edit) does not actually prevent API actions.

---

## 8. Care Loop

**Status: UI MOCK WITH DB POTENTIAL**
- **UI:** Exists and uses complex `clinical-15-stage-flow-viewer`.
- **Data Source:** Hardcoded `lib/demo-data.ts`.
- **Database:** `CarePlan`, `CareTask`, and `CarePlanTemplate` models exist, but the UI is bypassing them for the demo.
- **Background Workers:** None running to actually automate scheduling or escalations.

---

## 9. WhatsApp

**Status: PARTIAL (Database Exists)**
- **Database:** Rich schemas exist (`WhatsAppAccount`, `WhatsAppTemplate`, `Message`, `Conversation`).
- **UI:** Exists for Inbox, Broadcasts, Flows.
- **Integration:** Webhook references exist, but fully automated outbound messaging tied to clinical events is not yet production-ready.

---

## 10. Smart Discharge

**Status: FRONTEND DEMO ONLY**
- **UI:** Beautiful multi-step simulation.
- **Data Source:** `discharge/demoDischarges.ts`.
- **Database:** No `Discharge` or `DischargeSummary` models exist in Prisma.
- **AI Integration:** Simulated.

---

## 11. Billing / Pharmacy / Insurance

**Status: DB EXISTS, UI LIKELY DISCONNECTED**
- **Database:** Massive schema support (`PharmacyProduct`, `PharmacySale`, `BillingInvoice`, `InsuranceClaim`, etc.).
- **UI Status:** While routes exist, they lack full end-to-end API connections that tie a Patient's clinical encounter directly to automated billing generation.

---

## 12. Documents

**Status: PARTIAL**
- **Database:** `Document` and `DocumentCategory` models exist.
- **Storage:** Metadata is tracked, but actual secure object storage integration (S3/Vercel Blob) requires validation for production HIPAA/ABDM compliance.

---

## 13. AI

**Status: SIMULATED / PARTIAL**
- **Database:** `AIInteraction` model exists.
- **Smart Discharge:** Fake AI output (UI mock).
- **Outbound Voice/Bots:** Experimental API routes (`api/ai/outbound-call`) exist but lack deep system orchestration.

---

## 14. ABDM / ABHA (FROZEN ZONE)

**Status: SANDBOX VERIFIED / PROTECTED**
- **Infrastructure:** Complex certificates, crypto, and status tracking exist.
- **Routes:** `lib/abdm/*`, `api/integrations/route.ts`, and `digital-health/*`.
- **WARNING:** Do not modify these integrations without explicit ABDM-focused tasks.

---

## 15. NHCX

**Status: MISSING / UNKNOWN**
- Mentioned in requirements, but no concrete Prisma models (other than standard Insurance models) or dedicated NHCX connector services are actively in use.

---

## 16. Background Jobs

**Status: MISSING**
- There is no evidence of a robust background worker architecture (e.g., BullMQ, Redis Queues, Inngest) actively running recurring cron jobs for Care Loop escalations, WhatsApp reminders, or automated billing.

---

## 17. Orphaned Features & Duplicate Data

- **Duplicate Data:** We currently have `Ananya Rao` and `Rahul Menon` defined as hardcoded objects in:
  1. `lib/demo-data.ts`
  2. `clinical-diagnostics/demoData.ts`
  3. `discharge/demoDischarges.ts`
  4. `staff/staffDemoData.ts`
- **Orphaned Features:** The rich `CarePlan` and `CareTask` Prisma models are being ignored by the Care Loop UI.

---

## 18. Database Model Usage

| Model | Exists | Used | Source of Truth | Status |
|-------|--------|------|-----------------|--------|
| **Patient / Couple** | YES | YES | Database | 🟢 REAL |
| **Appointment** | YES | YES | Database | 🟢 REAL |
| **CareTask** | YES | NO | `demo-data.ts` | 🔴 ORPHANED |
| **LabResult** | NO | NO | `demoData.ts` | ⚪ MISSING |
| **Embryo** | NO | NO | `demoData.ts` | ⚪ MISSING |
| **Discharge** | NO | NO | `demoDischarges.ts` | ⚪ MISSING |

---

## 19. Recommended Build Order (Next Phase)

Priority must be connecting the existing gorgeous UI to a persistent clinical System of Record.

1. **Phase 1: Database Expansion (Clinical SoR)**
   - Create Prisma models for `LabOrder`, `LabSample`, `DiagnosticResult`, `SemenAnalysis`, and `Discharge`.
2. **Phase 2: API Integration for Clinical Diagnostics**
   - Hydrate the `clinical-diagnostics` module via API calls to the new database models, removing `demoData.ts`.
3. **Phase 3: Realize the Care Loop**
   - Connect the Care Loop UI to the existing `CarePlan` and `CareTask` database models.
   - Implement a lightweight background worker (or Vercel Cron) to handle task status transitions.
4. **Phase 4: Staff & RBAC Persistence**
   - Map the new Staff roles (Lab Tech, Care Coordinator) directly into the `Role` and `User` schemas to enforce actual API-level security.

---

## 20. ABDM Frozen Zone

These files must remain completely untouched during the next phase to avoid breaking the digital health integrations:
- `apps/web/src/lib/abdm/*`
- `apps/web/src/components/digital-health/*`
- `apps/web/src/app/(dashboard)/digital-health/*`
- `packages/database/prisma/schema.prisma` (Models: `AbdmTransaction`, `DigitalHealthIdentity`, `HealthRecordExchange`).

---

## FINAL VERDICT

1. **What is genuinely working?** Patient, Couple, Clinic, and basic Appointment CRUD.
2. **What is only UI?** Clinical Diagnostics, Smart Discharge, Staff Management, Care Loop, and advanced IVF Embryology workflows.
3. **What is missing for a real fertility clinic?** Database models for Lab Results, Semen Analysis, Embryology tracking, and Discharge Summaries. 
4. **What should we build next?** Expand the Prisma schema to support the Clinical Diagnostics workflows, then connect the UI.
5. **What must remain untouched?** ABDM, ABHA, and existing DB migrations.
