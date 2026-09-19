# SmrkoMed Comprehensive API Documentation

**Version:** 2.0 (Production Architecture)  
**Base URL (Hono API Server):** `http://localhost:3001` (or configured `API_URL`)  
**Base URL (Web App Proxy):** `http://localhost:3000/api/v1`  
**Web-Native Endpoints:** `http://localhost:3000/api/*`  
**ABDM Gateway Callbacks:** `/v0.5`, `/api/v3`, `/api/hiecm`

---

## 1. Architectural Principles & Conventions

### 1.1 Architecture & Topology
SmrkoMed follows a high-performance modular healthcare monorepo architecture:
- **`apps/api`**: Core backend API built with [Hono](https://hono.dev/) for high throughput, type safety, and microsecond latencies. Runs on Node.js / Bun / Edge.
- **`apps/web`**: Clinical, Administrative, and Patient Web Application built with Next.js App Router. Hosts specialized API routes (Auth.js session, AI streaming, Voice transcription) and acts as an authenticated reverse proxy (`/api/v1/[...path]`) to `apps/api`.
- **`packages/database`**: Authoritative PostgreSQL database schema managed via Prisma ORM, multi-tenant isolation helpers, and permission definitions.

### 1.2 Authentication & Tenant Isolation
All protected endpoints enforce multi-tenant isolation and role-based access control (RBAC):
- **Authentication**: Uses Auth.js (NextAuth) session tokens or Bearer JWT tokens.
- **Tenant Context (`tenantMiddleware`)**: Every request extracts `organizationId`, `clinicId`, `userId`, and `role` strictly from verified session claims. Requests cannot override `clinicId` via query parameters or body payloads.
- **Role Permissions**: Handlers verify granular permissions using `requirePermission(c, PERMISSIONS.*)`.
  - Roles: `ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `CARE_COORDINATOR`, `NURSE`, `RECEPTIONIST`, `LAB_TECH`, `EMBRYOLOGIST`, `PHARMACIST`, `ACCOUNTANT`.
  - Clinical Authority: Sensitive clinical actions (prescriptions, diagnostic approvals, consultation notes) strictly enforce medical authority (`DOCTOR`). AI cannot independently diagnose or prescribe.

### 1.3 Standard Response Format
#### Success Response (`200 OK` / `201 Created`)
```json
{
  "ok": true,
  "data": { ... }
}
```
*(Note: Select collection/proxy routes return the direct JSON entity or array for frontend compatibility)*

#### Error Response (`4xx` / `5xx`)
```json
{
  "ok": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested entity could not be found."
  },
  "requestId": "req_01j7xyz..."
}
```

---

## 2. API Module Catalog

### Summary of Modules

| Domain | Base Path | Description |
|---|---|---|
| **System & Health** | `/api/v1/health`, `/api/v1/activity`, `/api/v1/realtime` | Liveness, audit log feed, Server-Sent Events |
| **Identity & Organizations** | `/api/v1/organizations`, `/api/v1/clinics`, `/api/v1/users`, `/api/v1/admin` | Orgs, clinics, staff directory, platform admin |
| **Patients & Couples** | `/api/v1/patients`, `/api/v1/couples`, `/api/v1/treatments` | Patient 360, Couple 360, Care Calendar, Treatments |
| **Appointments & Doctors** | `/api/v1/appointments`, `/api/v1/doctors`, `/api/v1/appointment-booking` | Scheduling, Prepare My Day, Doctor App, AI booking |
| **Care Loop & Journeys** | `/api/v1/treatment-plan-templates`, `/api/v1/care-plans`, `/api/v1/care-tasks`, `/api/v1/care-loop` | 15-stage IVF journeys, tasks, exceptions, escalation |
| **Clinical Diagnostics** | `/api/v1/diagnostics`, `/api/v1/clinical-diagnostics` | Hormone panels, AMH, semen analysis, lab workflow |
| **Pharmacy & Inventory** | `/api/v1/pharmacy` | POS sales, stock, purchase orders, dispensing, alerts |
| **Insurance & TPA** | `/api/v1/insurance` | Providers, TPAs, policies, pre-auth claims, queries |
| **Billing & Payments** | `/api/v1/payments` | Invoices, payment links, Razorpay/Cashfree/PayU gateways |
| **CRM & Leads** | `/api/v1/leads`, `/api/v1/campaigns`, `/api/v1/crm`, `/api/v1/public` | Lead pipeline, marketing attribution, conversion |
| **WhatsApp Automation** | `/api/v1/whatsapp-automation`, `/api/v1/integrations/whatsapp` | Visual flows, triggers, executions, omnichannel inbox |
| **Digital Health (ABDM)** | `/api/v1/digital-health`, `/api/v3`, `/v0.5`, `/api/hiecm` | ABHA M1/M2/M3, HPR, HFR, HIP/HIU callbacks |
| **Analytics & Reporting** | `/api/v1/analytics` | Operational, clinical, fertility, financial analytics |
| **AI & Voice Services** | `/api/v1/ai`, `/api/ai/*`, `/api/voice/*` | Clinical copilot, SOAP notes, Whisper transcription |

---

## 3. Detailed Endpoint Reference

### 3.1 System & Base Services

#### `GET /api/v1/health`
- **Auth:** Public
- **Description:** Basic liveness and health probe.
- **Response:**
  ```json
  { "status": "ok", "timestamp": "2026-09-19T10:00:00.000Z" }
  ```

#### `GET /api/v1/activity`
- **Auth:** `patients:read` (Clinic Member)
- **Description:** Paginated system audit log feed.
- **Query Params:** `limit` (default 50), `entityType`, `entityId`
- **Response:** List of audit records with actor, action, entity, timestamp, and diff.

#### `GET /api/v1/realtime/events`
- **Auth:** Authenticated Clinic Member
- **Description:** Server-Sent Events (SSE) stream for real-time task updates, incoming WhatsApp messages, and notifications.

---

### 3.2 Organizations, Clinics & Users

#### `GET /api/v1/organizations/current`
- **Auth:** Authenticated Member
- **Description:** Retrieves organization details, subscription tier, and active modules.

#### `GET /api/v1/clinics/current`
- **Auth:** Authenticated Member
- **Description:** Retrieves the active clinic's profile, operational hours, address, and metadata.

#### `PATCH /api/v1/clinics/current`
- **Auth:** `clinics:write` / `CLINIC_ADMIN`
- **Body:** `{ name?: string, phone?: string, email?: string, address?: string, logoUrl?: string, timezone?: string }`

#### `GET /api/v1/users/me`
- **Auth:** Authenticated Member
- **Description:** Current user profile, role, clinic assignments, and permissions.

#### `GET /api/v1/users/staff`
- **Auth:** `patients:read`
- **Description:** Directory of doctors, coordinators, nurses, and embryologists available in the clinic.

#### `POST /api/v1/users/staff`
- **Auth:** `users:manage`
- **Body:** `{ name: string, email: string, role: string, phone?: string, department?: string }`

#### Platform Admin (`/api/v1/admin/*`)
- `GET /api/v1/admin/dashboard`: Platform-wide KPI overview across all clinics.
- `GET /api/v1/admin/organizations`: List all healthcare organizations.
- `GET /api/v1/admin/organizations/:id`: Organization details with clinics and user counts.
- `PATCH /api/v1/admin/organizations/:id`: Update organization subscription or status.
- `GET /api/v1/admin/clinics`: Global clinic directory.
- `GET /api/v1/admin/users`: Global user directory.
- `GET /api/v1/admin/system/health`: Service, database, and integration connection checks.

---

### 3.3 Patients & Couples

#### `GET /api/v1/patients`
- **Auth:** `patients:read`
- **Query Params:** `q` (search string), `includeArchived` (`1` or `0`)
- **Description:** Search and filter clinic patients.

#### `GET /api/v1/patients/:id`
- **Auth:** `patients:read`
- **Description:** Full patient demographic, contact, and identifier data.

#### `GET /api/v1/patients/:id/360`
- **Auth:** `patients:read`
- **Description:** Comprehensive 360-degree patient dossier: demographics, ABHA status, active couples, treatments, care tasks, diagnostics, prescriptions, and timeline.

#### `POST /api/v1/patients`
- **Auth:** `patients:write`
- **Body:**
  ```json
  {
    "firstName": "Ananya",
    "lastName": "Sharma",
    "phone": "+919876543210",
    "whatsappNumber": "+919876543210",
    "email": "ananya@example.com",
    "gender": "FEMALE",
    "dateOfBirth": "1994-05-12",
    "preferredLanguage": "en"
  }
  ```

#### `PATCH /api/v1/patients/:id`
- **Auth:** `patients:write`
- **Body:** Partial patient fields to update.

#### `DELETE /api/v1/patients/:id`
- **Auth:** `patients:write`
- **Query Params:** `permanent=true` (forces full relational purge) or `permanent=false` (archives record safely).

#### `GET /api/v1/couples`
- **Auth:** `patients:read`
- **Description:** List couples undergoing fertility evaluation or IVF treatment.

#### `GET /api/v1/couples/:id`
- **Auth:** `patients:read`
- **Description:** Retrieves couple record by UUID or custom `slug`.

#### `GET /api/v1/couples/:id/360`
- **Auth:** `patients:read`
- **Description:** Unified couple dossier: primary female patient, male partner, assigned doctor, care coordinator, active treatment plan, current IVF journey stage, care tasks, and billing balance.

#### `GET /api/v1/couples/:id/care-calendar`
- **Auth:** `patients:read`
- **Description:** Chronological timeline & calendar events of past consultations, upcoming ultrasound scans, medication schedule, and lab tests.

#### `POST /api/v1/couples`
- **Auth:** `patients:write`
- **Description:** Complete transactional onboarding flow: creates/links primary patient, partner, initial treatment plan, care tasks, and consent agreements.
- **Body:**
  ```json
  {
    "primaryPatient": { "firstName": "Priya", "lastName": "Mehta", "phone": "+919811122233", "gender": "FEMALE" },
    "partnerPatient": { "firstName": "Rahul", "lastName": "Mehta", "phone": "+919811122244", "gender": "MALE" },
    "assignedDoctorId": "usr_123",
    "treatmentType": "IVF",
    "templateId": "tpl_ivf_standard"
  }
  ```

---

### 3.4 Treatments & IVF Journeys

#### `GET /api/v1/treatments/:id`
- **Auth:** `patients:read`
- **Description:** Retrieves treatment cycle details, cycle type (`IVF`, `IUI`, `ICSI`, `FET`), protocol, start date, and status.

#### `PATCH /api/v1/treatments/:id`
- **Auth:** `patients:write`
- **Body:** `{ status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED", protocol?: string, notes?: string }`

#### `POST /api/v1/treatments`
- **Auth:** `patients:write`
- **Body:** `{ coupleId: string, kind: "IVF" | "IUI" | "ICSI" | "FET", label: string, protocol?: string }`

---

### 3.5 Care Loop & Clinical Journeys

SmrkoMed's core autonomous workflow engine tracks treatments through exactly 15 standard clinical stages.

#### Treatment Plan Templates (`/api/v1/treatment-plan-templates`)
- `GET /`: List all clinic and system care plan templates with stage and task definitions.
- `GET /:id`: Template detail including stages (`steps`) and preconfigured `tasks`.
- `POST /`: Create custom treatment plan template.
- `PATCH /:id`: Update template definition.
- `POST /:id/duplicate`: Clone an existing template.
- `POST /:id/toggle`: Activate/deactivate template.

#### Care Plans (`/api/v1/care-plans`)
- `GET /`: List active care plans for the clinic.
- `GET /:id`: Care plan detail.
- `GET /:id/journey`: Current journey execution state, completed stages, and next pending tasks.
- `GET /:id/next-action`: AI/Rule-computed next clinical or communication action.
- `POST /assign`: Assign a treatment plan template to a couple.
- `POST /:id/decision`: Record doctor IVF clinical decision (e.g. Trigger day, Transfer strategy).
- `POST /:id/outcome`: Record cycle outcome (`PREGNANCY_CONFIRMED`, `NEGATIVE`, `BIOCHEMICAL`).
- `POST /:id/branch`: Execute dynamic branch in the treatment pathway.
- `POST /:id/pause`: Pause active care plan with medical reason.
- `POST /:id/resume`: Resume paused care plan.

#### Care Tasks (`/api/v1/care-tasks`)
- `GET /`: List care tasks filtered by clinic, status, priority, or assigned user.
- `GET /:id`: Care task detail with couple and patient context.
- `POST /`: Create care task (manual or clinical order).
- `PATCH /:id`: Update task title, description, due date, assignee, or priority.
- `POST /:id/dispatch-whatsapp`: Manually dispatch interactive WhatsApp notification for this task.
- `POST /:id/complete`: Mark task complete with clinical evidence or verification notes.
- `POST /:id/simulate-response`: Simulate patient response (e.g., `DONE`, `NEED HELP`).
- `POST /:id/escalate`: Trigger escalation ladder to human coordinator or doctor.
- `POST /:id/verify-payment`: Verify payment prerequisite for task completion.

#### Care Loop Operations (`/api/v1/care-loop`)
- `GET /exceptions`: List open clinical escalations requiring human intervention.
- `POST /exceptions/:id/resolve`: Resolve escalation with resolution notes.
- `GET /analytics`: Care loop completion rate, overdue tasks, and stage distribution.
- `POST /dispatch-stage-whatsapp`: Send automated stage transition message to patient/partner.
- `POST /set-patient-stage`: Set couple's journey stage directly (1 to 15) with step state synchronization.

---

### 3.6 Doctor Operations & Doctor App (`/api/v1/doctors`)

#### `GET /api/v1/doctors/prepare-my-day`
- **Auth:** `PATIENTS_READ` / `DOCTOR`
- **Description:** Personalized clinical briefing for the doctor: today's consultations, urgent lab reports to review, active IVF stimulation cycles, and clinical escalations.

#### `GET /api/v1/doctors/schedule`
- **Auth:** `PATIENTS_READ`
- **Query Params:** `date` (YYYY-MM-DD), `range` (`day` | `week`)
- **Description:** Doctor's schedule filtered by assigned appointments, rooms, and patient treatment contexts.

#### `POST /api/v1/doctors/consultations/:appointmentId`
- **Auth:** `DOCTOR`, `CLINIC_ADMIN`, `CARE_COORDINATOR` (Clinical Authority Enforced)
- **Description:** Record formal clinical consultation notes (SOAP format: Subjective, Objective, Assessment, Plan) and advance appointment status to `COMPLETED`.
- **Body:**
  ```json
  {
    "notes": "Follicular scan shows leading follicle 18mm in right ovary.",
    "diagnosis": "Bilateral PCOD, Primary Subfertility",
    "recommendations": "Administer hCG trigger injection tonight at 21:30.",
    "prescriptions": [
      { "productName": "Ovitrelle 250mcg", "dosage": "1 syringe", "duration": "Single dose", "instructions": "Subcutaneous at 9:30 PM" }
    ]
  }
  ```

#### `GET /api/v1/doctors/reports`
- **Auth:** `DOCTOR`, `CLINIC_ADMIN`
- **Description:** Diagnostic and embryology reports queue awaiting clinical review.

#### `POST /api/v1/doctors/reports/:orderId/review`
- **Auth:** `DOCTOR` (Doctor role strictly enforced)
- **Description:** Clinical sign-off and review on a diagnostic report.
- **Body:** `{ action: "APPROVE" | "REQUIRE_REPEAT" | "AMEND", notes: string }`

#### `GET /api/v1/doctors/care-loop-exceptions`
- **Auth:** `DOCTOR`
- **Description:** Escalated clinical exceptions requiring doctor sign-off or action.

#### `GET /api/v1/doctors/messages`
- **Auth:** `DOCTOR`
- **Description:** Direct patient communication feed for the doctor's assigned patients.

#### `GET /api/v1/doctors`
- **Auth:** `PATIENTS_READ`
- **Description:** List active doctors in the clinic with specialties and qualifications.

#### Doctor Scheduling & Slots
- `GET /api/v1/doctors/slot-management` & `GET /:id/slot-management`: View doctor's recurring availability.
- `POST /api/v1/doctors/slot-management` & `POST /:id/slot-management`: Configure time slots, slot duration, and max bookings.
- `POST /api/v1/doctors/apply-schedule-template`: Bulk apply a recurring weekly schedule template.

---

### 3.7 Clinical Diagnostics & Lab Orders (`/api/v1/diagnostics`)

#### `GET /api/v1/diagnostics`
- **Auth:** `PATIENTS_READ`
- **Query Params:** `category` (`PATHOLOGY` | `ULTRASOUND` | `ANDROLOGY` | `EMBRYOLOGY`), `status`, `patientId`, `coupleId`, `reviewPending`
- **Description:** List diagnostic orders across the clinic.

#### `GET /api/v1/diagnostics/review-queue`
- **Auth:** `PATIENTS_READ` (Doctor / Coordinator)
- **Description:** Queue of completed lab results awaiting doctor evaluation.

#### `POST /api/v1/diagnostics`
- **Auth:** `DIAGNOSTICS_WRITE` / `DOCTOR`
- **Description:** Place a new diagnostic investigation order.
- **Body:**
  ```json
  {
    "patientId": "pat_123",
    "coupleId": "cpl_456",
    "testName": "Serum AMH + Follicular Ultrasound",
    "category": "PATHOLOGY",
    "priority": "HIGH",
    "clinicalIndication": "Day 2 baseline fertility assessment"
  }
  ```

#### `POST /api/v1/diagnostics/:id/sample`
- **Auth:** `LAB_TECH` / `NURSE`
- **Description:** Record specimen/sample collection details.
- **Body:** `{ sampleBarcode: string, specimenType: "BLOOD" | "SEMEN" | "URINE", collectedAt: string }`

#### `POST /api/v1/diagnostics/:id/results`
- **Auth:** `LAB_TECH` / `EMBRYOLOGIST`
- **Description:** Record quantitative/qualitative parameters and upload report document.
- **Body:**
  ```json
  {
    "parameters": {
      "amhValue": 3.8,
      "unit": "ng/mL",
      "referenceRange": "1.5 - 4.0",
      "interpretation": "Normal ovarian reserve"
    },
    "documentId": "doc_789",
    "notes": "Verified against Roche Cobas e411 analyzer."
  }
  ```

#### `POST /api/v1/diagnostics/:id/verify`
- **Auth:** `LAB_TECH` (Biochemist / Pathologist)
- **Description:** Technical lab verification of test parameters.

#### `POST /api/v1/diagnostics/:id/review`
- **Auth:** `DOCTOR`
- **Description:** Clinical review, remarks, and doctor sign-off.

---

### 3.8 Pharmacy & Medication Management (`/api/v1/pharmacy`)

#### Dashboard & Operations
- `GET /dashboard`: KPIs (total products, low stock count, expiring batches, today's sales, pending Rx).
- `GET /settings` & `PATCH /settings`: Expiry alert thresholds, GST rules, inventory preferences.
- `GET /alerts`: Real-time stock shortage and expiry warning alerts.
- `GET /reports`: Sales, consumption, and margin reports.

#### Products & Inventory
- `GET /products`: Filterable drug formulary and catalog.
- `POST /products`: Add medication to catalog (brand, generic name, HSN, composition, schedule).
- `GET /products/:id`: Product detail with batch breakdown.
- `PATCH /products/:id`: Update product pricing, reorder levels, or status.
- `GET /inventory`: Batch-level stock balances.
- `POST /inventory`: Receive stock batches.
- `POST /inventory/adjust`: Stock reconciliation and damage adjustments.
- `GET /inventory/movements`: Audit log of all stock movements.

#### Prescriptions & Dispensing
- `GET /prescriptions`: List pending, dispensed, or cancelled prescriptions.
- `GET /prescriptions/:id`: Prescription detail with medication line items.
- `GET /prescriptions/:id/availability`: Check real-time inventory availability for all prescribed items.
- `POST /prescriptions`: Record new prescription from consultation.
- `POST /prescriptions/:id/dispense`: Dispense drugs, deduct batches (FIFO/FEFO), and generate pharmacy invoice.
- `POST /prescriptions/:id/cancel`: Cancel prescription.

#### POS Sales & Cashiering
- `GET /sales`: List counter sales.
- `POST /sales`: Execute point-of-sale checkout (walk-in or patient).
- `GET /sales/:id`: View POS invoice.

#### Medication Reminders
- `GET /reminders`: Scheduled WhatsApp medication adherence reminders.
- `POST /reminders/:id/simulate`: Trigger immediate adherence simulation.

---

### 3.9 Insurance & TPA Claims (`/api/v1/insurance`)

#### Providers & TPAs
- `GET /providers`: List registered health insurance carriers.
- `POST /providers` & `PATCH /providers/:id`: Manage insurance carriers.
- `GET /tpas`: Third-Party Administrators directory.
- `POST /tpas` & `PATCH /tpas/:id`: Manage TPAs.

#### Policies & Coverage
- `GET /policies`: Active patient insurance policies.
- `POST /policies`: Register policy (sum insured, copay, maternity/IVF sub-limits).
- `GET /policies/by-patient/:patientId` & `by-couple/:coupleId`: Patient-linked insurance policies.

#### Pre-Auth & Claims Workflow
- `GET /claims`: Cashless and reimbursement claim tracker.
- `POST /claims`: Initiate pre-authorization or claim request.
- `GET /claims/:id`: Claim status, approved amounts, settlement tracker.
- `POST /claims/:id/preauth`: Submit pre-authorization request to insurer/TPA.
- `GET /claims/:id/queries` & `POST /claims/:id/queries`: Manage insurer deficiency queries.
- `POST /queries/:id/respond`: Submit query response and supporting documents.
- `POST /queries/:id/resolve`: Mark query resolved.

---

### 3.10 Billing, Invoices & Payments (`/api/v1/payments`)

#### Payment Gateways
- `GET /gateways`: Gateway catalog (Razorpay, Cashfree, PayU) and connection statuses.
- `POST /gateways/:provider/connect`: Configure API keys and webhook secrets (AES-256 encrypted at rest).
- `POST /gateways/:provider/test`: Test live gateway credentials.
- `POST /gateways/:provider/set-default`: Designate default gateway for payment links and QR codes.
- `POST /gateways/:provider/disconnect`: Revoke and delete credentials.

#### Invoices & Payments
- `GET /invoices`: Filterable clinic invoices.
- `POST /invoices`: Create itemized invoice (treatment package, consultation, lab test).
- `GET /invoices/:id`: Invoice detail with tax breakdown and payment ledger.
- `POST /payments/:id/link`: Generate hosted payment link with SMS/WhatsApp dispatch.
- `POST /payments/:id/verify`: Verify payment status against payment gateway API.
- `GET /payments`: List all payments received.
- `GET /receipts/:paymentId`: Formatted tax receipt data.
- `POST /pharmacy-sales/:saleId/invoice`: Promote a pharmacy POS transaction to unified clinic invoice.

#### Patient & Couple Financials
- `GET /patients/:patientId/financials`: Invoiced, paid, and outstanding balance for patient.
- `GET /couples/:coupleId/financials`: Consolidated couple ledger.
- `GET /treatments/:treatmentId/package-summary`: Package utilization, included vs. add-on procedures.

#### Webhooks (Public)
- `POST /payments/webhooks/razorpay`: Razorpay payment capture/refund webhook.
- `POST /payments/webhooks/cashfree`: Cashfree payment status webhook.
- `POST /payments/webhooks/payu`: PayU instant payment notification.

---

### 3.11 CRM, Leads & Marketing (`/api/v1/leads`, `/crm`)

#### Lead Management (`/api/v1/leads`)
- `GET /`: Filterable CRM lead list (status, stage, source, assigned coordinator).
- `POST /`: Create lead.
- `GET /:id`: Lead details with timeline and communication history.
- `PATCH /:id`: Update lead contact info, budget, or interest.
- `POST /:id/stage`: Move lead through pipeline (`NEW` → `CONTACTED` → `CONSULTATION_BOOKED` → `WON` / `LOST`).
- `POST /:id/convert`: Convert qualified lead into active Couple and Patient records.
- `POST /:id/activities`: Log calls, notes, or visits.
- `POST /:id/tasks`: Create coordinator follow-up tasks.
- `POST /:id/whatsapp`: Send direct template or session WhatsApp message.

#### Public Lead Ingestion
- `POST /api/v1/public/leads`: Unauthenticated endpoint for landing page lead forms.
- `POST /api/v1/public/leads/adapters/:provider`: Webhook adapter for Facebook Lead Ads, Google Ads, or third-party aggregators.

#### CRM Aggregates (`/api/v1/crm`)
- `GET /summary`: Inbound volume, conversion rate, and pipeline velocity.
- `GET /pipeline`: Leads grouped by pipeline stage.
- `GET /sources`: Marketing attribution breakdown (Instagram, Google, Referral, Walk-in).
- `GET /follow-ups`: Coordinator pending follow-ups due today.

---

### 3.12 WhatsApp Automation & Omnichannel Inbox (`/api/v1/whatsapp-automation`)

#### Visual Workflow Engine
- `GET /overview`: Automation KPIs (messages sent, delivery rate, read rate, active flows).
- `GET /flows`: List configured automation flows.
- `POST /flows`: Create new workflow (trigger: appointment booked, stage transition, lab result ready).
- `GET /flows/:id` & `PATCH /flows/:id`: Manage workflow nodes, conditions, and actions.
- `POST /flows/:id/activate`: Publish and enable workflow.
- `POST /flows/:id/pause`: Temporarily pause workflow.
- `POST /flows/:id/test`: Dry-run flow against a test phone number.
- `POST /flows/:id/trigger`: Manually execute flow for a specific patient.

#### Workflow Executions
- `GET /executions`: Log of automated flow executions with step status.
- `GET /executions/:id`: Detailed execution trace, node latencies, and variable payloads.
- `POST /executions/:id/retry`: Retry failed execution.

#### Omnichannel Live Inbox
- `GET /inbox`: Active 2-way conversation threads.
- `GET /inbox/:id`: Complete message history (inbound, outbound, templates, media, bot replies).
- `GET /inbox/:id/context`: Quick patient drawer: clinical status, next appointment, active care tasks.
- `POST /inbox/:id/reply`: Staff direct message reply.
- `POST /inbox/:id/media`: Send image, PDF report, or document.
- `POST /inbox/:id/assign`: Assign thread to coordinator or doctor.
- `PATCH /inbox/:id/status`: Change conversation status (`OPEN`, `RESOLVED`, `WAITING_ON_PATIENT`).
- `POST /inbox/:id/follow-up`: Schedule follow-up task directly from chat.

#### Webhooks & Bridge
- `GET /api/v1/webhooks/whatsapp`: Meta WhatsApp Cloud API verification challenge.
- `POST /api/v1/webhooks/whatsapp`: Incoming WhatsApp messages, delivery receipts, and button clicks.
- `POST /api/v1/internal/dispatch-outbound`: Secure background bridge for batching outbound notifications.

---

### 3.13 Digital Health & ABDM / ABHA Subsystem

SmrkoMed complies with National Health Authority (NHA) Ayushman Bharat Digital Mission (ABDM) standards:
- **Milestone 1 (M1)**: ABHA Creation & Verification (Aadhaar OTP, Mobile OTP, Demographics).
- **Milestone 2 (M2)**: Health Information Provider (HIP) - Linking care contexts, discovery, and FHIR bundle sharing.
- **Milestone 3 (M3)**: Health Information User (HIU) - Consent management, health record fetching, and data subscriptions.

#### ABHA Management (`/api/v1/digital-health`)
- `GET /abdm/status`: Bridge connectivity and gateway credential status.
- `POST /abdm/test-connection`: Perform live ping to ABDM sandbox/production gateway.
- `GET /patients/:patientId/abha`: Patient ABHA profile, ABHA Number, and ABHA Address.
- `POST /patients/:patientId/abha/verify`: Verify existing ABHA via OTP.
- `DELETE /patients/:patientId/abha`: Unlink ABHA profile from patient.
- `GET /patients/:patientId/consents`: List of active and historical consent requests.
- `POST /consents/:id/approve` & `reject` & `revoke`: Patient consent lifecycle management.
- `GET /patients/:patientId/health-records`: List of linked FHIR diagnostic and discharge records.

#### ABHA V3 Engine (`/api/v3/*` and `/api/v1/digital-health/v3/*`)
- `POST /enrol/aadhaar/request-otp`: Request Aadhaar OTP for new ABHA creation.
- `POST /enrol/aadhaar/verify`: Verify Aadhaar OTP and fetch demographic profile.
- `GET /enrol/suggestions`: Suggested unique ABHA addresses (e.g., `user@abdm`).
- `POST /enrol/abha-address`: Finalize ABHA address.
- `POST /auth/request-otp`: Authenticate existing ABHA user via Mobile/Aadhaar OTP.
- `POST /auth/verify-otp`: Exchange OTP for ABDM X-Token.
- `GET /profile/abha-card`: Download personalized SVG/PNG ABHA card.
- `GET /profile/qr-code`: Fetch patient ABHA QR code for express counter scan.

#### ABDM Gateway Webhooks (`/v0.5/*` and `/api/hiecm/*`)
- `/v0.5/users/auth/on-init`: Gateway callback on auth initiation.
- `/v0.5/hip/patient/care-context/discover`: Patient discovery by ABHA identifier.
- `/v0.5/hip/link/care-context/init`: Initiate OTP for linking care context.
- `/v0.5/hip/link/care-context/confirm`: Confirm linking of medical record.
- `/v0.5/consent/request/hip/notify`: Insurer/HIU consent notification to HIP.
- `/v0.5/hip/health-information/request`: Encrypted health data transfer request.
- `/v0.5/hiu/data/push`: Transfer encrypted FHIR health records to HIU.

#### Registry Services (HPR & HFR) (`/api/v1/digital-health/hpr/*`)
- `POST /registration/aadhaar/*`: Register doctor on Healthcare Professional Registry (HPR).
- `POST /facility/*`: Register and verify clinic branch on Health Facility Registry (HFR).
- `GET /masters/*`: Fetch standard Indian master directories (districts, councils, specialties).

---

### 3.14 Analytics & Reporting (`/api/v1/analytics`)

All analytics endpoints compute real metrics directly from persisted PostgreSQL records:
- `GET /overview`: Master dashboard metrics with custom time filtering (`7d`, `30d`, `90d`, or custom date range).
- `GET /summary`: Instant count aggregates (patients, appointments, plans, tasks, leads).
- `GET /organization`: Patient volume, appointment completion rates, retention.
- `GET /care-loop`: Workflow throughput, task overdue rates, escalation volume.
- `GET /patient-engagement`: WhatsApp delivery, read, and response metrics.
- `GET /clinical-operations`: Lab report turnaround times, doctor review queues, discharge status.
- `GET /fertility`: Active IVF stimulation cycles, follicle tracking workload, cycle outcomes.
- `GET /billing`: Gross revenue, collected revenue, receivables, package breakdown.
- `GET /staff`: Task resolution and operational performance per team member.
- `GET /export`: CSV / JSON export of clinical or financial datasets.

---

### 3.15 AI & Smart Clinical Assistant (`/api/v1/ai` & Web APIs)

SmrkoMed's clinical AI acts strictly as an assistant under medical authority.

#### Core AI Endpoints (`/api/v1/ai`)
- `GET /status`: Model status, enabled capabilities, and clinical safety guardrail verification.
- `POST /prepare-my-day`: Generates structured briefing for the doctor's day.
- `POST /patient-summary`: Synthesizes entire medical history, past cycles, and recent labs into concise clinical synopsis.
- `POST /conversation-summary`: Summarizes multi-day patient WhatsApp conversations for quick clinical handover.
- `POST /task-summary`: Contextual summary of a care task and why it was triggered.
- `POST /journey-summary`: IVF journey stage-by-stage status and key clinical milestones.
- `POST /report-summary`: Plain-language and clinical summaries of diagnostic findings.
- `POST /draft-message`: Generates compassionate, medically accurate message drafts for staff approval.
- `POST /consultation-assist`: Suggests differential considerations and SOAP note formatting (doctor must verify and commit).
- `POST /draft-discharge`: Generates draft IVF discharge summary with medication instructions.
- `POST /knowledge-retrieve`: Semantic search over clinic SOPs, drug protocols, and clinical guidelines.
- `POST /handoff`: Triggers automated handoff from AI bot to human coordinator.
- `POST /conditional-automation`: Evaluates clinical rules to propose next workflow actions.
- `GET /observability`: Model token usage, latencies, and success metrics.
- `GET /audit`: Compliance audit trail of all AI recommendations and human overrides.

#### Web-Native Voice & AI APIs (`/api/*` on Web App)
- `POST /api/ai/chat`: Interactive streaming copilot for clinic staff.
- `POST /api/ai/action`: Confirmed mutations executed via tool-calling (e.g., `createTask`, `bookSlot`).
- `POST /api/voice/transcribe`: Audio transcription using Whisper for dictation.
- `POST /api/voice/summarize`: Converts voice consultation audio into structured SOAP notes.
- `GET /api/voice/notes` & `POST /api/voice/notes`: Store and manage audio consultation notes.
- `POST /api/ai/outbound-call`: Automated voice call reminder via integrated telephony.

---

### 3.16 Web-Native & Public Front-End APIs

These endpoints are hosted directly by `apps/web`:
- `POST /api/auth/[...nextauth]`: Auth.js authentication provider (credentials, OTP, session renewal).
- `GET /api/auth/me`: Current session user and permissions.
- `GET /api/clinics/current` & `PATCH /api/clinics/current`: Clinic settings.
- `GET /api/doctors/availability`: Public doctor slot availability.
- `GET /api/qr/clinic-info`: Clinic metadata for patient QR code check-in.
- `POST /api/qr/register`: Express registration of walk-in patient from QR scan.
- `POST /api/qr/chat`: Automated check-in bot for scanned patients.
- `GET /api/pay/[id]` & `POST /api/pay/[id]/verify`: Patient self-service payment portal.
- `POST /api/onboarding`: Initial clinic setup wizard.
- `POST /api/demo/setup`: Instant seeding of demo data for evaluation and testing.
