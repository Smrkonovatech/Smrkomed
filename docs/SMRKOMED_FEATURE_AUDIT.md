# SMRKOMED Feature & Module Audit

**Date:** 2026-09-13
**Type:** Read-Only Complete Audit
**Method:** Static codebase inspection

**Legend:**
✅ COMPLETE
🟡 PARTIAL
🔵 UI ONLY
🟣 BACKEND ONLY
⚪ MOCK / DUMMY
🔴 MISSING
⚠️ BROKEN
❓ UNKNOWN

---

## 1. Executive Summary

This audit assesses the current state of the SmrkoMed platform, a multi-tenant fertility clinic application. The core foundations (authentication, database schema, multi-tenancy, primary CRUD operations) are robustly implemented. The application successfully integrates an Auth.js session architecture with a Hono API and a Postgres database managed via Prisma.

However, many flagship features designed to differentiate the product (such as the Care Loop automation, document storage, analytics, and specific integration points like WhatsApp production flow and Google Calendar) remain either UI-only mocks, partially implemented, or depend on backend services/workers that are not yet built or wired to the frontend.

A critical gap is the complete absence of a Discharge module, which is an urgent requirement.

## 2. Current Architecture

The codebase is structured as a monorepo containing:

- **Frontend Applications:** Next.js applications located in `apps/admin` (Admin) and `apps/web` (Doctor/Clinical). A marketing landing page exists in `apps/landing page` and `apps/web/(marketing)`.
- **API/Backend:** Hono-based API located in `apps/api/src`. Uses JWT-based authentication combined with NextAuth cookies.
- **Database/Prisma Models:** Located in `packages/database`. Provides a robust 69-model schema.
- **Shared Packages:** Contains types, utilities, and integrations.
- **Middleware/RBAC:** `authMiddleware` and `tenantMiddleware` enforce clinic isolation and role-based permissions (`users:manage`, `patients:read`, etc.).
- **Integrations:** Razorpay/Cashfree/PayU architecture for payments is present. Meta WhatsApp Cloud API is implemented but awaits credentials. OpenAI integration exists on the server side.
- **Background Workers/Cron:** 🔴 MISSING. Escalation workers, task reminders, and automation runners do not exist.
- **Webhooks:** Payment webhooks and WhatsApp webhooks are implemented (`/api/v1/payments/webhooks`, `/api/v1/integrations/whatsapp`).

## 3. Admin Feature Matrix

### Dashboard
- Clinic overview: 🔵 UI ONLY (Fake metrics)
- Patient metrics: 🔵 UI ONLY
- Appointment metrics: 🔵 UI ONLY
- IVF metrics: 🔵 UI ONLY
- Revenue: 🔵 UI ONLY
- Care Loop: ⚪ MOCK / DUMMY
- Communication: ⚪ MOCK / DUMMY
- Alerts: ⚪ MOCK / DUMMY
- Analytics: 🔵 UI ONLY
- Operational KPIs: 🔵 UI ONLY

### Patient Management
- Patient list: ✅ COMPLETE
- Search: ✅ COMPLETE
- Patient creation: ✅ COMPLETE
- Patient editing: ✅ COMPLETE
- Patient deletion/archive: 🟡 PARTIAL
- Patient 360: 🟡 PARTIAL (Timeline completeness varies)
- Couple management: ✅ COMPLETE
- Patient documents: 🟡 PARTIAL (Metadata only, no blob storage)
- Patient history: 🟡 PARTIAL

### Appointment Management
- Appointment list: ✅ COMPLETE
- Create appointment: ✅ COMPLETE
- Edit appointment: ✅ COMPLETE
- Cancel appointment: ✅ COMPLETE
- Reschedule: ✅ COMPLETE
- Calendar: 🟡 PARTIAL (Google Calendar missing)
- Doctor assignment: ✅ COMPLETE
- Appointment status: ✅ COMPLETE

### Doctor Management
- View doctors: ✅ COMPLETE
- Add doctor: 🟡 PARTIAL (Uses general staff UI)
- Edit doctor: 🟡 PARTIAL
- Activate/deactivate doctor: 🟡 PARTIAL
- Delete/archive doctor: 🟡 PARTIAL
- Assign doctor to clinic/branch: 🟡 PARTIAL
- Assign specialties: 🔴 MISSING
- Manage availability: ⚪ MOCK / DUMMY
- Manage permissions: 🟡 PARTIAL
- Reset/change access: 🟡 PARTIAL
- View doctor activity: 🟡 PARTIAL (Audit logs exist)
- Manage doctor profile: 🟡 PARTIAL

### Staff Management
- View staff: ✅ COMPLETE
- Add staff: 🟡 PARTIAL
- Edit staff: 🟡 PARTIAL
- Activate/deactivate staff: 🟡 PARTIAL
- Delete/archive staff: 🟡 PARTIAL
- Assign roles: ✅ COMPLETE
- Assign department: 🔴 MISSING
- Assign clinic/branch: 🟡 PARTIAL
- Manage permissions: ✅ COMPLETE
- Manage availability: ⚪ MOCK / DUMMY
- Reset access: 🟡 PARTIAL
- View staff activity: 🟡 PARTIAL

### Clinic / Branch Management
- Clinic details: 🟡 PARTIAL
- Branches: 🔵 UI ONLY (Admin sees them, but unused in patient data)
- Add branch: 🟣 BACKEND ONLY (No clinic-facing branch CRUD)
- Edit branch: 🟣 BACKEND ONLY
- Activate/deactivate branch: 🟣 BACKEND ONLY
- Clinic configuration: 🟡 PARTIAL
- Departments: 🔴 MISSING
- Operating hours: 🟡 PARTIAL

### Billing
- Invoices: ✅ COMPLETE
- Payments: ✅ COMPLETE
- Outstanding payments: ✅ COMPLETE
- Refunds: ✅ COMPLETE
- Payment status: ✅ COMPLETE
- Receipts: ✅ COMPLETE
- Packages: 🔴 MISSING
- IVF package/payment tracking: 🔴 MISSING

### Insurance / NHCX
- Insurance providers: ✅ COMPLETE (Manual Mode)
- Policies: ✅ COMPLETE
- Claims: ✅ COMPLETE
- Preauthorization: ✅ COMPLETE
- Claim status: ✅ COMPLETE
- Claim documents: 🟡 PARTIAL (Metadata only)
- NHCX integration: 🔴 MISSING
- NHCX transaction history: 🔴 MISSING
- Queries: ✅ COMPLETE
- Approval/rejection: ✅ COMPLETE
- Payment/settlement tracking: ✅ COMPLETE

### Pharmacy
- Medicines: ✅ COMPLETE
- Inventory: ✅ COMPLETE
- Stock: ✅ COMPLETE
- Low-stock alerts: ✅ COMPLETE
- Purchase: ✅ COMPLETE
- Dispensing: ✅ COMPLETE
- Prescription linkage: 🟡 PARTIAL (Rx -> Task link is weak)
- Expiry: ✅ COMPLETE
- Suppliers: ✅ COMPLETE

### CRM / Leads
- Leads: ✅ COMPLETE
- Lead source: ✅ COMPLETE
- Lead status: ✅ COMPLETE
- Follow-up: ✅ COMPLETE
- Conversion: ✅ COMPLETE
- Campaign/source tracking: ✅ COMPLETE
- Appointment conversion: ✅ COMPLETE

### Communication
- WhatsApp: 🟣 BACKEND ONLY (Awaiting credentials)
- WhatsApp inbox: ✅ COMPLETE
- Templates: ✅ COMPLETE
- AI replies: 🟡 PARTIAL
- AI calls: 🔴 MISSING
- Call history: 🔴 MISSING
- Callback requests: 🔴 MISSING
- Communication logs: ✅ COMPLETE
- Patient responses: ✅ COMPLETE

### Care Loop
- Workflow engine: 🔴 MISSING
- Tasks: ✅ COMPLETE (CRUD exists)
- Task assignment: ✅ COMPLETE
- Reminders: ⚪ MOCK / DUMMY
- Escalations: ⚪ MOCK / DUMMY
- Exceptions: ⚪ MOCK / DUMMY (UI seeded)
- WhatsApp actions: 🟣 BACKEND ONLY
- AI calls: 🔴 MISSING
- Staff actions: 🟡 PARTIAL
- Completion tracking: 🟡 PARTIAL
- Care Loop dashboard: ⚪ MOCK / DUMMY
- Care Loop configuration/builder: ⚪ MOCK / DUMMY

### Reports & Analytics
- Patient reports: 🔴 MISSING
- Appointment reports: 🔴 MISSING
- Revenue reports: 🔴 MISSING
- IVF reports: 🔴 MISSING
- Doctor performance: 🔴 MISSING
- Staff performance: 🔴 MISSING
- Care Loop performance: 🔴 MISSING
- Communication reports: 🔴 MISSING
- Insurance reports: 🔴 MISSING
- Pharmacy reports: 🔴 MISSING
- Custom reports: 🔴 MISSING
- Export/download: 🔴 MISSING

### Discharge (HIGH PRIORITY GAP)
- Discharge module: 🔴 MISSING
- Discharge queue: 🔴 MISSING
- Discharge readiness: 🔴 MISSING
- Discharge checklist: 🔴 MISSING
- Clinical summary: 🔴 MISSING
- Diagnosis: 🔴 MISSING
- Procedures/treatment: 🔴 MISSING
- Investigation summary: 🔴 MISSING
- Medication reconciliation: 🔴 MISSING
- Discharge instructions: 🔴 MISSING
- Follow-up plan: 🔴 MISSING
- Follow-up appointment: 🔴 MISSING
- Billing clearance: 🔴 MISSING
- Insurance clearance: 🔴 MISSING
- Pharmacy clearance: 🔴 MISSING
- Doctor approval: 🔴 MISSING
- Digital discharge summary: 🔴 MISSING
- PDF/document generation: 🔴 MISSING
- Patient discharge communication: 🔴 MISSING
- Discharge status: 🔴 MISSING
- Discharge history: 🔴 MISSING
- Discharge analytics: 🔴 MISSING

## 4. Doctor Website Feature Matrix

### Doctor Dashboard
- Today's appointments: 🟡 PARTIAL
- Patients under care: 🟡 PARTIAL
- Needs attention: ⚪ MOCK / DUMMY
- Active journeys: 🟡 PARTIAL
- Reports needing review: ⚪ MOCK / DUMMY
- Clinical concerns: ⚪ MOCK / DUMMY
- Care Loop exceptions: ⚪ MOCK / DUMMY
- Patient questions: ⚪ MOCK / DUMMY
- Prepare My Day: 🔴 MISSING
- Quick actions: 🟡 PARTIAL

### Schedule
- Today: ✅ COMPLETE
- Tomorrow: ✅ COMPLETE
- Week: ✅ COMPLETE
- Calendar: 🟡 PARTIAL
- Appointment details: ✅ COMPLETE
- Start consultation: 🟡 PARTIAL

### Patients
- Patient list: ✅ COMPLETE
- Search: ✅ COMPLETE
- Patient 360: 🟡 PARTIAL
- Couple information: ✅ COMPLETE
- Clinical history: 🟡 PARTIAL
- IVF journey: 🟡 PARTIAL
- Reports: 🟡 PARTIAL
- Medications: ✅ COMPLETE
- Documents: 🟡 PARTIAL
- Messages: ✅ COMPLETE

### IVF Journey
1. Appointment: ✅ COMPLETE
2. Consultation: 🟡 PARTIAL
3. Tests & Reports: 🟡 PARTIAL
4. Treatment Decision: 🟡 PARTIAL
5. Treatment Plan: ✅ COMPLETE
6. Get Ready: 🔴 MISSING
7. Stimulation: 🔴 MISSING
8. Monitoring: 🔴 MISSING
9. Trigger: 🔴 MISSING
10. Egg Retrieval: 🔴 MISSING
11. Embryology: 🔴 MISSING
12. Embryo Transfer: 🔴 MISSING
13. After Transfer: 🔴 MISSING
14. Pregnancy Test: 🔴 MISSING
15. Outcome: 🔴 MISSING

### Consultation
- Start consultation: 🟡 PARTIAL
- Clinical notes: ✅ COMPLETE
- Voice recording: ✅ COMPLETE (UI exists, transcription via OpenAI backend)
- Transcript: ✅ COMPLETE
- AI summary: ✅ COMPLETE
- Doctor review: ✅ COMPLETE
- Doctor editing: ✅ COMPLETE
- Approval: ✅ COMPLETE
- Save: ✅ COMPLETE
- Follow-up tasks: 🟡 PARTIAL
- Prescription: ✅ COMPLETE
- Reports/orders: 🔴 MISSING

### Reports
- Upload: ⚪ MOCK / DUMMY (Metadata only, no blob storage)
- View: 🔴 MISSING
- Review: 🔴 MISSING
- Doctor approval: 🔴 MISSING
- Report history: 🔴 MISSING
- Report comparison: 🔴 MISSING
- AI summary if available: 🔴 MISSING

### Medications
- Current medication: ✅ COMPLETE
- Prescription: ✅ COMPLETE
- Dose: ✅ COMPLETE
- Frequency: ✅ COMPLETE
- Start/end date: ✅ COMPLETE
- Medication history: ✅ COMPLETE
- Medication changes: ✅ COMPLETE
- Care Loop reminders: ⚪ MOCK / DUMMY

### Messages
- WhatsApp: 🟣 BACKEND ONLY
- Patient messages: ✅ COMPLETE
- Clinical messages: ✅ COMPLETE
- Unread: 🟡 PARTIAL
- Needs reply: 🟡 PARTIAL
- AI response: 🟡 PARTIAL
- Escalations: ⚪ MOCK / DUMMY

### AI
- Prepare My Day: 🔴 MISSING
- Patient summary: 🔴 MISSING
- Consultation summary: ✅ COMPLETE
- Report summary: 🔴 MISSING
- AI assistant: ✅ COMPLETE
- AI call information: 🔴 MISSING

### Care Loop
- View exceptions: ⚪ MOCK / DUMMY
- Review task: 🟡 PARTIAL
- Complete task: ✅ COMPLETE
- Escalate: ⚪ MOCK / DUMMY
- Message patient: ✅ COMPLETE
- Call patient: 🔴 MISSING
- View history: ✅ COMPLETE

### Discharge
- See pending discharge: 🔴 MISSING
- Review discharge: 🔴 MISSING
- Edit discharge summary: 🔴 MISSING
- Approve discharge: 🔴 MISSING
- Sign discharge: 🔴 MISSING
- Add follow-up: 🔴 MISSING
- Prescribe discharge medication: 🔴 MISSING

## 5. Doctor App/Mobile Feature Matrix
❓ UNKNOWN — REQUIRES VERIFICATION (No specific mobile app repository identified in root; assumes responsive PWA or React Native not in scope of codebase examined).

## 6. Database Feature Matrix

The schema is robust with 69 models.

- Patient: ✅ COMPLETE
- Couple: ✅ COMPLETE
- Doctor/User: ✅ COMPLETE
- Staff: ✅ COMPLETE
- Organization: ✅ COMPLETE
- Clinic: ✅ COMPLETE
- Branch: ✅ COMPLETE (ClinicBranch model exists)
- Appointment: ✅ COMPLETE
- Consultation: ✅ COMPLETE (ConsultationNote)
- IVF Cycle: 🟡 PARTIAL (Treatment model with kind IVF)
- IVF Journey: 🔴 MISSING
- Journey Stage: 🔴 MISSING
- Report: 🔴 MISSING
- Medication: ✅ COMPLETE (Pharmacy models)
- Prescription: ✅ COMPLETE (PharmacyPrescription)
- Task: ✅ COMPLETE (CareTask)
- Care Loop: ✅ COMPLETE (CarePlan, CarePlanStep, CarePlanTemplate)
- WhatsApp: ✅ COMPLETE (WhatsAppAccount, WhatsAppTemplate, Message)
- AI Call: 🔴 MISSING
- Communication: ✅ COMPLETE (Conversation, Message)
- Billing: ✅ COMPLETE (BillingInvoice, BillingPayment)
- Payment: ✅ COMPLETE
- Insurance: ✅ COMPLETE (InsuranceProvider, InsurancePolicy)
- Insurance Claim: ✅ COMPLETE (InsuranceClaim)
- NHCX: 🔴 MISSING
- Pharmacy: ✅ COMPLETE (PharmacyProduct, PharmacySale, etc.)
- Inventory: ✅ COMPLETE (PharmacyStockMovement)
- Lead/CRM: ✅ COMPLETE (Lead, Campaign, LeadActivity)
- Discharge: 🔴 MISSING
- Discharge Summary: 🔴 MISSING
- Audit Log: ✅ COMPLETE

## 7. API Feature Matrix

- API exists?: ✅ YES (Hono backend under `/api/v1`)
- API works?: 🟡 PARTIAL (Runtime needs verification)
- Authentication?: ✅ YES (JWT / Auth.js)
- Authorization/RBAC?: ✅ YES
- Tenant isolation?: ✅ YES
- Database connected?: ✅ YES
- UI connected?: 🟡 PARTIAL (Analytics and CareLoop board are mock/disconnected)
- Mock response?: 🟡 PARTIAL (e.g. Analytics UI, CareLoop exceptions)
- Error handling?: ✅ YES (e.g., `CREATE_COUPLE_FAILED`)
- Validation?: ✅ YES

## 8. Integration Status

### ABDM
- M1/M2/M3/M4/ABHA/Sandbox/Production: 🔴 MISSING (Catalog and enum only)

### WhatsApp / Meta
- Authentication: 🟣 BACKEND ONLY
- Sending messages: 🟣 BACKEND ONLY
- Receiving messages: 🟣 BACKEND ONLY
- Media: 🟣 BACKEND ONLY
- Templates: 🟣 BACKEND ONLY
- Webhooks: 🟣 BACKEND ONLY
- AI automation: 🟡 PARTIAL
- Appointment workflow: 🟡 PARTIAL
- Doctor communication: 🟡 PARTIAL
Status: 🟣 INTEGRATION READY - PROVIDER NOT CONNECTED

### Care Loop
- Trigger engine: 🔴 MISSING (No automation worker)
- Task engine: 🔴 MISSING
- WhatsApp: 🔴 MISSING
- AI calls: 🔴 MISSING
- Escalation: 🔴 MISSING
Status: 🔴 NOT STARTED

### AI
- Provider: 🟣 BACKEND ONLY (OpenAI server key config present)
- Prompts: 🟡 PARTIAL
- Patient context: 🟡 PARTIAL
- Consultation: ✅ IMPLEMENTED
- Summaries: ✅ IMPLEMENTED
- Guardrails: ✅ IMPLEMENTED
Status: 🟡 PARTIAL (Ready for key injection)

### NHCX
- Existing code/models/UI/Sandbox/Implementation: 🔴 MISSING
Status: 🔴 NOT STARTED

### UHI
- Existing implementation if any: 🔴 MISSING
Status: 🔴 NOT STARTED

## 9. Demo Readiness

### A. DOCTOR APP / MOBILE
❓ UNKNOWN — REQUIRES VERIFICATION

### B. DOCTOR WEBSITE
| FEATURE | STATUS | WORKING E2E? | MISSING PIECES | PRIORITY |
|---|---|---|---|---|
| Dashboard | 🔵 UI ONLY | NO | API connection | P0 |
| Patients | ✅ COMPLETE | YES | Deep clinical history | P1 |
| Consult/AI | 🟡 PARTIAL | YES (Mocked audio) | OpenAI Key | P1 |
| Care Loop | ⚪ MOCK | NO | Worker engine | P0 |
| Discharge | 🔴 MISSING | NO | Entire module | P0 |

### C. ADMIN WEBSITE
| FEATURE | STATUS | WORKING E2E? | MISSING PIECES | PRIORITY |
|---|---|---|---|---|
| Dashboard | 🔵 UI ONLY | NO | API connection | P0 |
| CRM | ✅ COMPLETE | YES | Ads integration | P1 |
| Pharmacy | ✅ COMPLETE | YES | CareTask link | P1 |
| Billing | 🟡 PARTIAL | NO | Payment Gateway keys | P1 |
| Insurance | ✅ COMPLETE | YES (Manual) | NHCX | P2 |
| Doctors/Staff | 🟡 PARTIAL | NO | Full CRUD UI | P1 |

## 10. Missing Features
- Discharge Module (End-to-End)
- IVF Journey specific tracking modules (Stimulation, Embryology, etc.)
- Care Loop Background Automation/Escalation Worker
- Document Blob Storage (S3/Multipart)
- NHCX Insurance Integration
- ABDM Integration
- Multi-specialty workflows
- Real Reports/Analytics computation

## 11. Partial Features
- Settings and Preferences (local saving only)
- Clinic Branch operations (models exist, admin sees them, not used for patient data)
- Multi-clinic user sessions (Auth picks first active membership)
- Doctor and Staff Management UI
- Voice notes (transcription works with API key, but audio files are not persisted)

## 12. Mock/Dummy Features
- Dashboard Analytics (`/analytics` page hardcoded)
- Care Loop Exceptions Board (`seedExceptions` used)
- Pharmacy Medication Reminders (always `demoMode`)

## 13. Broken/Disconnected Features
- **UI disconnected from backend:** `GET /api/v1/analytics/summary` exists but the UI uses hardcoded values.
- **Backend without UI:** AutomationRule, TaskReminder, Escalation models exist but have no backend worker or UI to manage them.

## 14. P0/P1/P2/P3 Priorities

- **P0 (Must Build):** Discharge Module, Care Loop Automation Worker, Document Blob Storage, Dashboard Analytics API wiring, Fix Multi-clinic Auth session bug.
- **P1 (Important):** WhatsApp Meta live verification, Pharmacy to Care Loop link, Staff Admin UI complete CRUD, Payment Gateway live testing, Voice/OpenAI operationalization.
- **P2 (Nice to Have):** Google Calendar, NHCX, ABDM, Ads Integration, Branch operationalization.
- **P3 (Later):** SMS/Email channels, Advanced data warehouse, Telehealth.

## 15. Recommended Build Sequence
1. **Fix Disconnected Data:** Wire Dashboard UI to the existing `/analytics/summary` API.
2. **Critical Clinical Operations:** Build the **Discharge Module** from database up to UI.
3. **Core Engine:** Implement the Care Loop background worker (cron/queues) for escalations and reminders.
4. **Data Integrity:** Implement S3/Multipart document uploads.
5. **Admin Operations:** Complete the Staff & Doctor management UI.
6. **Integrations Activation:** Add Meta and Razorpay test credentials and perform E2E verification.

---

## CONCISE SUMMARY

**CURRENTLY PRESENT:**
Authentication (Auth.js), robust database schema (69 models), Tenant isolation (clinics), API routing (Hono), CRUD for Patients, Couples, Tasks, Pharmacy, Manual Insurance, Billing architecture, CRM Leads/Campaigns, AI Chat/Action scaffolding.

**PARTIALLY PRESENT:**
Staff/Doctor Management, Voice Consultation (text only), Patient Documents (metadata only), Clinic Branches, Care Loop (tasks work, automation missing), WhatsApp (backend ready, awaiting credentials), Appointments.

**MISSING:**
Discharge Module, IVF Journey Specific Stages, Care Loop Automation Worker, Document Blob Storage, NHCX, ABDM, Real Reports engine, AI outbound calling.

**EVENT MUST BUILD:**
Discharge Module (P0), Care Loop Background Engine (P0), Analytics UI wiring (P0), Document Blob Storage (P0).

**DO NOT TOUCH:**
Authentication flows, tenant middleware, database schema resets, existing integrations (WhatsApp, Payments), environment variables.
