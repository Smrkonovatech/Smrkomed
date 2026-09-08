# SMRKOMED
## Complete Product Requirements Document (PRD)

- **Product:** SmrkoMed
- **Parent Company:** Smrkonova Softech Solutions LLP
- **Product Category:** Modular Healthcare Technology Platform
- **Flagship Module:** Care Loop
- **Initial Specialty:** Fertility / IVF
- **Primary Market:** India
- **Product Model:** Multi-tenant SaaS
- **Primary Communication Channel:** WhatsApp
- **AI Layer:** Smrko AI
- **Core Product Philosophy:** Connect existing healthcare systems, automate operational work around clinicians, and keep patients continuously connected to their care journey.

---

## 1. PRODUCT OVERVIEW

### 1.1 What is SmrkoMed?
SmrkoMed is a modular healthcare technology platform designed for clinics, hospitals, fertility centres and healthcare organizations.

The platform allows healthcare organizations to adopt individual capabilities without being forced to replace their existing hospital management system, EMR, CRM, billing system, laboratory system or other software.

**The fundamental concept is:**
> Keep the systems you already use. Plug in the capabilities you need.

SmrkoMed should operate as a connected healthcare layer across patients, doctors, care teams, workflows, communication, documents, appointments, AI and external healthcare systems.

The platform begins with fertility and Care Loop, but its underlying architecture is designed to support multiple healthcare specialties and patient journeys.

The long-term vision is to evolve from a fertility-focused care coordination product into a modular operating layer for patient care.

---

## 2. PRODUCT VISION

### 2.1 Vision
Build a flexible healthcare technology platform where healthcare organizations can assemble their own digital ecosystem without replacing the systems they already use.

### 2.2 Mission
Make healthcare:
- More connected
- More patient-centric
- More operationally efficient
- More automated
- More measurable
- More accessible
- More coordinated

### 2.3 Product Philosophy
SmrkoMed should not attempt to automate the doctor.
It should automate the work surrounding the doctor.

```text
Doctor
  ↓
Clinical Decision
  ↓
Care Plan
  ↓
SmrkoMed
  ↓
Automation + AI
  ↓
Patient
  ↓
Completion / Response
  ↓
SmrkoMed
  ↓
Staff / Doctor when required
```

The product should continuously answer:
- What needs to happen next?
- Has it happened?
- If not, why?
- Can the system resolve it?
- If not, who needs to know?

This patient-journey approach is the central differentiation of SmrkoMed.

---

## 3. PRODUCT POSITIONING

### Primary Positioning
**SmrkoMed — The modular healthcare platform that works with the systems you already use.**

### Supporting Positioning
Plug in the capabilities you need. Remove what you don't. Scale when you are ready.

### Care Loop Positioning
**Care Loop — AI-powered patient care coordination.**

### Care Loop Promise
Doctors create the care plan. Care Loop makes sure the patient follows it.

---

## 4. PRODUCT STRATEGY

SmrkoMed will consist of three major layers.

### Layer 1 — Core Platform
Shared infrastructure used by every module.
Includes:
- Organizations
- Clinics
- Branches
- Users
- Roles
- Permissions
- Patients
- Couples / families
- Care journeys
- Workflow engine
- Task engine
- Notification engine
- AI layer
- Document system
- Communication system
- Consent
- Audit logs
- Integrations
- APIs
- Webhooks
- Security
- Reporting infrastructure

### Layer 2 — Product Modules
Clinics can activate the modules they require.
Primary modules:
1. Care Loop
2. Clinic OS
3. Patient Management
4. Patient Connect
5. Appointments
6. Documents & Reports
7. Clinical Records
8. Discharge Summary
9. CRM
10. Billing & Payments
11. Pharmacy & Inventory
12. Laboratory
13. Insurance & Claims
14. Analytics
15. Telehealth
16. Marketing & Growth
17. Communication / WhatsApp
18. AI
19. Integrations
20. Administration

### Layer 3 — Specialty / Care Journeys
The same platform should support specialty-specific workflows.

**Initial:**
- Fertility
- IVF
- IUI
- Fertility Evaluation

**Future:**
- Dental
- Dermatology
- Maternity
- Aesthetics
- Orthopedics
- Physiotherapy
- Ophthalmology
- Chronic Care
- General Clinics
- Specialty Hospitals
- Custom healthcare journeys

---

## 5. TARGET USERS

### 5.1 Clinic Owner
**Needs:**
- Overall visibility
- Operational efficiency
- Patient retention
- Staff productivity
- Revenue visibility
- Patient journey visibility
- Automation
- Analytics
- Multi-branch management

### 5.2 Doctor
**Needs:**
- Patient context
- Clinical history
- Care plans
- Reports
- Important patient messages
- Clinical escalations
- Consultation tools
- Documentation
- Discharge summaries
- Minimal operational noise

*The doctor dashboard should not become an overwhelming operational dashboard.*
The doctor should primarily see:
- Today's appointments
- Patients requiring attention
- Clinical issues
- Reports requiring review
- Active care journeys
- Pending clinical documentation
- Escalations
- Upcoming consultations

### 5.3 Care Coordinator
Primary operational user for Care Loop.
**Needs:**
- Patient follow-up
- Task management
- Communication
- WhatsApp inbox
- Automation
- Reports
- Escalations
- Appointment follow-up
- Patient status
- Care journey monitoring

### 5.4 Reception / Front Desk
**Needs:**
- Patient registration
- Appointment management
- Communication
- Basic patient information
- Follow-up
- Billing coordination
- Document collection

### 5.5 Nurse / Clinical Staff
**Needs:**
- Assigned tasks
- Patient information
- Care plans
- Medication-related workflows
- Reports
- Follow-ups
- Escalations
- Clinical documentation

### 5.6 Hospital / Clinic Administrator
**Needs:**
- Users
- Roles
- Branches
- Modules
- Settings
- Reports
- Integrations
- Audit logs
- Billing
- Operational analytics

### 5.7 Patient / Couple
**Needs:**
- Easy communication
- Clear next steps
- Reminders
- Appointment information
- Document sharing
- Report upload
- Questions and responses
- Payment information
- Care instructions
- Follow-up

The initial patient experience should remain WhatsApp-first rather than requiring a dedicated app.

---

## 6. CORE PRODUCT PRINCIPLES

- **6.1 Modular:** Clinics should activate only what they need.
- **6.2 Integration-first:** SmrkoMed should work with existing healthcare systems instead of forcing replacement.
- **6.3 Patient-journey-first:** The system should be organized around what needs to happen next, not only what has already happened.
- **6.4 Automation around clinicians:** Automate repetitive coordination work.
- **6.5 AI as coordinator:** AI assists with communication, information retrieval, coordination and escalation. AI is not the doctor.
- **6.6 Human control:** Healthcare teams must retain control over important decisions.
- **6.7 WhatsApp-first:** For patient communication, WhatsApp should be a major low-friction channel.
- **6.8 Progressive disclosure:** The interface should show important information first and deeper information when required.
- **6.9 Auditability:** Important healthcare and automation actions must be traceable.
- **6.10 Security by design:** Patient information must be isolated by organization and clinic.

---

## 7. MULTI-TENANT ARCHITECTURE

SmrkoMed must support:
```text
Organization
  ↓
Clinic
  ↓
Branch
  ↓
Departments
  ↓
Users
  ↓
Patients
```

A single organization may have multiple clinics or branches.
Each clinic can have:
- Separate staff
- Separate patients
- Separate WhatsApp configuration
- Separate workflows
- Separate templates
- Separate AI configuration
- Separate knowledge base
- Separate documents
- Separate reports
- Separate analytics

All data access must be scoped by organization and clinic. Cross-clinic access must be explicitly authorized.

---

## 8. USER MANAGEMENT AND RBAC

### Roles
Initial roles:
- Owner
- Admin
- Doctor
- Care Coordinator
- Nurse
- Receptionist
- Billing
- Pharmacy
- Lab
- Custom Staff

Permissions should be modular.
```text
WhatsApp
├── View Inbox
├── Send Message
├── Send Media
├── Send Template
├── Manage Templates
└── Configure WhatsApp

Care Loop
├── View
├── Create
├── Edit
├── Activate
└── Manage Automation

AI
├── View
├── Configure
├── Approve
└── Manage Knowledge Base
```

---

## 9. PATIENT MANAGEMENT

### 9.1 Patient Profile
Patient profile should include:
- Name
- Gender
- Date of birth
- Phone
- Email
- Address
- Emergency contact
- Registration information
- Communication preferences
- Assigned doctor
- Assigned coordinator
- Clinic
- Branch
- Medical identifiers where supported
- ABHA information where integrated
- Consent status
- Documents
- Appointments
- Care journeys
- Tasks
- Communications
- Reports
- Medications
- Billing information
- Clinical notes

### 9.2 Patient 360
Patient 360 should provide a unified view:
```text
Patient
  ↓
Clinical History
  ↓
Appointments
  ↓
Care Journey
  ↓
Tasks
  ↓
Reports
  ↓
Documents
  ↓
Medications
  ↓
Communication
  ↓
Billing
  ↓
AI Interactions
  ↓
Discharge Summaries
```
The interface should avoid repeating the same information across multiple cards.

---

## 10. COUPLE MANAGEMENT

For fertility, the primary care relationship can be a couple rather than an individual patient.
```text
Couple
├── Partner A
├── Partner B
├── Treatment
├── Care Journey
├── Appointments
├── Reports
├── Tasks
├── Communication
└── Clinical history
```
The couple record should allow authorized staff to view relevant combined information while maintaining individual patient privacy and permissions.

---

## 11. CARE JOURNEY MANAGEMENT

A journey represents the patient's current healthcare process.
```text
Consultation → Evaluation → Testing → Treatment → Procedure → Recovery → Follow-up → Outcome
```

Every journey should have:
- Journey type
- Patient / couple
- Start date
- Current stage
- Assigned doctor
- Assigned coordinator
- Tasks
- Appointments
- Documents
- Communications
- Events
- Escalations
- Completion status

---

## 12. CARE LOOP

Care Loop is the flagship SmrkoMed module.
Its purpose is to automatically coordinate patient care after a doctor-approved plan is created.

The core loop is:
```text
Doctor creates care plan
  ↓
Care Loop creates tasks
  ↓
Patient receives communication
  ↓
Patient responds
  ↓
AI / Automation processes response
  ↓
Task updates
  ↓
Next action triggered
  ↓
Exception if unresolved → Staff / Doctor
```
This is the central product experience.

---

## 13. CARE PLAN BUILDER

Doctor or authorized staff should create:
- Patient / couple
- Treatment
- Journey
- Stage
- Tasks
- Due dates
- Task owner
- Reminder rules
- Escalation rules
- Communication channel
- Required documents
- Required appointments
- Follow-up requirements

---

## 14. CARE TASK MANAGEMENT

Every task should have a lifecycle:
```text
Created → Scheduled → Reminder → Patient Response → Completed OR Pending → Escalation
```

**Task types:**
- Appointment
- Blood test
- Scan
- Medication reminder
- Report upload
- Procedure
- Follow-up
- Payment
- Consent
- Form
- Doctor review
- Staff callback
- Document collection
- Discharge documentation

**Tasks should support:**
- Due date
- Priority
- Owner
- Status
- Patient
- Journey
- Trigger
- Reminder
- Escalation
- Completion evidence
- Audit history

---

## 15. CARE LOOP AUTOMATION ENGINE

The automation engine should support visual workflow construction.
```text
Trigger
  ↓
Condition
  ↓
Send Template
  ↓
Wait
  ↓
Patient Reply
  ↓
AI
  ↓
Condition
├── Completed → Next Task
└── Needs Help → Staff
```

### Node Types
- **Trigger:** Incoming WhatsApp, Appointment created, Appointment changed, Appointment completed, Care task created, Care task due, Care task overdue, Care task completed, Journey stage changed, Document uploaded, Payment event, Discharge initiated, Discharge completed, Manual trigger
- **Communication:** Send text, Send WhatsApp template, Send media, Send document, Send reminder, Send notification
- **Logic:** Condition, Wait, Wait for reply, Branch, Delay
- **Care Operations:** Create task, Assign task, Complete task, Change task status, Escalate, Notify staff, Add tag, Remove tag
- **AI:** AI draft, AI response, AI classification, AI knowledge retrieval, AI handoff
- **End:** Complete workflow, Stop AI, Mark resolved

---

## 16. WHATSAPP INTEGRATION

WhatsApp should function as a complete communication layer rather than simply a messaging API.
The system should support:
- Inbound messages
- Outbound messages
- Templates
- Text
- Voice
- Audio
- Images
- Video
- Documents
- Stickers
- Delivery status
- Read status
- Realtime messaging
- Automation
- AI
- Human handoff

---

## 17. WHATSAPP INBOX

The inbox should be a premium communication workspace.

### Conversation list
Show:
- Patient / couple
- Latest message
- Time
- Unread count
- Conversation status
- Assigned staff
- AI status
- Priority
- Escalation status

### Conversation
Support:
- Text
- Emoji
- Voice
- Image
- Video
- PDF
- Documents
- Templates
- System messages
- AI messages
- Staff messages

### Realtime
New messages should appear without refresh. The interface should update:
- Incoming messages
- Outgoing messages
- Unread count
- Delivery status
- Read status
- Typing status
- AI handoff
- Escalations
- Media processing

---

## 18. WHATSAPP MESSAGE COMPOSER

The composer should support:
`[ + ] [ Message........................ ] [🎤] [Send]`

**Attachment menu:**
- Image
- Video
- Document
- Patient report
- Voice note

**Additional:**
- Template
- Emoji
- Reply
- Forward where permitted
- Retry failed message

---

## 19. OUTBOUND MEDIA

Doctors and staff should be able to send:
- Patient reports
- PDF documents
- Images
- Videos
- Voice notes
- Other supported WhatsApp media

Media must remain associated with the conversation and appropriate patient context.

---

## 20. INBOUND MEDIA

Patients should be able to send: Voice notes, Images, Videos, PDFs, Documents, Stickers.

The system should:
1. Receive media webhook
2. Persist message
3. Persist media metadata
4. Download media securely
5. Store media
6. Link it to conversation
7. Link to patient when identified
8. Update realtime inbox
9. Notify staff when appropriate

*Media should not automatically become permanent clinical records without staff action.*

---

## 21. WHATSAPP TEMPLATE MANAGEMENT

Templates should be synchronized with Meta. Only approved templates should be available for production sending.

**Template statuses:** Approved, Pending, Rejected, Disabled, Paused.
**Template components:** Header, Body, Footer, Buttons, Variables.

Templates should support variable mapping (e.g., `{{1}}` → Patient First Name, `{{2}}` → Doctor Name, `{{3}}` → Appointment Date, `{{4}}` → Appointment Time).

---

## 22. TEMPLATE VARIABLE ENGINE

Variables should be resolved at runtime from:
- **Patient:** First name, Last name, Full name, Phone, Email
- **Doctor:** Name, Specialty
- **Clinic:** Name, Phone, Address, Website
- **Appointment:** Date, Time, Doctor, Location
- **Treatment:** Type, Status
- **Journey:** Stage, Status
- **Care Loop:** Task, Due date, Status
- **Previous Automation Node:** Output values

*The system must not invent unavailable data.*

---

## 23. AUTOMATION TEMPLATE NODE

The `SEND_TEMPLATE` node must not depend on manually typed template names.
The node must validate:
- Template exists
- Template is approved
- Correct language
- Required variables exist
- Variables are mapped
- Runtime values are available

---

## 24. INCOMING WHATSAPP AUTOMATION

A patient message (e.g. "Hi") should trigger automation:
```text
Incoming WhatsApp → Identify patient → Identify conversation → Find active automation → AI → Knowledge Base → Response
```
Different messages trigger different actions:
- *"I want to book an appointment."* → Appointment workflow.
- *"I have uploaded my report."* → Report task.
- *"I need to speak to the doctor."* → Human escalation.

---

## 25. WAIT FOR REPLY

Automation must support persistent wait states:
```text
Send appointment confirmation → WAIT FOR REPLY → Patient replies → Resume automation
```
The system must not depend on server memory. Wait states must be persisted.

---

## 26. AUTOMATION EXECUTION

Every automation execution should maintain:
- Execution ID, Flow ID, Patient, Conversation, Clinic, Current node, Status, Started, Completed, Retry count, Error, Node history
- Statuses: `Pending`, `Running`, `Waiting`, `Completed`, `Failed`, `Cancelled`, `Escalated`

---

## 27. AUTOMATION CONDITIONS

Conditions should support real domain information: Patient, Appointment, Journey, Treatment, Care Task, Conversation, Message, Payment, Document, Discharge.
*(e.g. IF appointment.status = CANCELLED THEN send rescheduling template)*

---

## 28. CARE LOOP ESCALATION

Escalations should happen when automation cannot safely resolve an issue:
- Patient asks for doctor
- Patient reports concerning symptoms
- Patient cannot complete a task
- Appointment unavailable
- Missing report
- Payment problem
- AI cannot answer
- Patient complaint
- Patient requests callback
- Automation failure

**Escalation flow:** `AI / Automation → Exception → Care Loop Inbox → Staff → Doctor if required`

---

## 29. AI — SMRKO AI

Smrko AI is the intelligence layer of SmrkoMed.
AI should support: Patient conversations, Knowledge retrieval, Message drafting, Classification, Task extraction, Conversation summarization, Escalation, Workflow assistance, Staff assistance, Discharge summary assistance.
*AI should operate within defined permissions and safety boundaries.*

---

## 30. WHATSAPP AI

AI should retrieve authorized appointment information and respond to routine queries.
**Clinical safety rule:** AI should not diagnose. If patient expresses a clinical concern:
```text
Patient concern → AI identifies possible clinical concern → Human escalation → Staff / Doctor
```

---

## 31. AI HUMAN HANDOFF

AI should automatically hand over when:
- Patient requests a human
- Patient requests doctor
- Clinical uncertainty
- Emergency-related language
- Complaint
- Unsupported question
- Low confidence
- Sensitive clinical situation

Once handed over: `AI → PAUSED`, Staff takes control. AI only resumes after authorized staff action or configured policy.

---

## 32. AI KNOWLEDGE BASE

Knowledge Base provides controlled information for AI.
Knowledge articles should support: Title, Category, Specialty, Content, Status, Language, Clinic, Published date, Version, Source, Tags.
*AI should retrieve only relevant knowledge.*

---

## 33. INITIAL KNOWLEDGE BASE

Development/demo seed data should include three categories:
1. **SmrkoMed Knowledge:** What is SmrkoMed, Platform overview, Care Loop, WhatsApp, Patient communication, Appointments, Documents, AI, Automation, Clinic onboarding, Support, Integrations.
2. **Fertility Knowledge:** Fertility consultation, Fertility evaluation, IVF, IUI, FET, Fertility testing, Semen analysis, Follicular monitoring, Hormone testing, Embryo transfer, Appointment preparation, Common patient questions.
3. **Hospital / Clinic Knowledge:** OPD, Registration, Appointments, Departments, Billing, Pharmacy, Laboratory, Reports, Insurance, Claims, General patient FAQs.

*All initial seed data must be explicitly classified as demonstration/development content until clinically reviewed.*

---

## 34. AI SAFETY

AI must never independently:
- Diagnose
- Prescribe
- Change medication
- Recommend dosage
- Invent test results
- Invent doctor instructions
- Interpret clinical reports as a final medical opinion
- Make treatment decisions
- Override doctor instructions

*AI should coordinate. Doctors make clinical decisions.*

---

## 35. AI VOICE

AI voice can be used as a communication escalation channel (e.g. WhatsApp reminder → No response → AI voice call → Patient response → Care Loop).
Use cases: Appointment confirmation, Missed task, Routine follow-up, Report reminder, Callback request, Non-response recovery. Voice interactions should generate structured outcomes where possible.

---

## 36. VOICE CONSULTATION

Doctors should be able to start a consultation using voice:
```text
Start Consultation → Microphone → Doctor speaks → Transcription → Structured Summary → Doctor Review → Save
```
*The AI must not automatically finalize clinical notes without appropriate human review.*

---

## 37. CONVERSATION SUMMARY

AI should be able to summarize long patient conversations into structured sections: Patient asked about, Resolved, Pending, Escalation.

---

## 38. DOCUMENT MANAGEMENT

SmrkoMed should provide a central document layer.
**Document types:** Lab report, Scan report, Prescription, Medical history, Consent, Identity document, Insurance document, Billing document, Discharge summary, Referral, Clinical note, Patient-uploaded document.
**Attributes:** Patient, Clinic, Document type, Date, Uploaded by, Source, Status, Access permissions, Audit history.

---

## 39. DOCUMENT REVIEW

Documents can be: Uploaded, Received through WhatsApp, Generated, Reviewed, Approved, Rejected, Archived.
Clinical documents should support doctor/staff review.

---

## 40. DISCHARGE SUMMARY MODULE

### 40.1 Purpose
The Discharge Summary module will provide a structured workflow for creating, reviewing, approving and delivering patient discharge summaries across hospitals, clinics and day-care healthcare settings.

---

## 41. DISCHARGE SUMMARY OBJECTIVE

The module should answer:
- What happened during the patient's episode of care?
- What was the final clinical status?
- What treatment/procedure was performed?
- What instructions were given?
- What does the patient need to do next?

```text
Clinical Episode → Doctor Documentation → Discharge Summary → Patient / Care Team → Follow-up
```

---

## 42. DISCHARGE SUMMARY TYPES

Support: Inpatient discharge, Day-care discharge, Procedure discharge, Surgery discharge, Fertility procedure discharge, Emergency discharge where applicable, Outpatient episode summary, Treatment-cycle summary.

---

## 43. DISCHARGE SUMMARY CONTENT

- **Patient Information:** Name, Patient ID, Date of birth, Contact, Hospital / clinic, Department, Treating doctor
- **Episode Information:** Admission date, Discharge date, Episode type, Reason for admission / treatment, Primary diagnosis, Secondary diagnoses where applicable
- **Clinical Summary:** Presenting complaint, Relevant history, Clinical findings, Important investigations, Procedures performed, Treatment provided, Clinical course, Significant events
- **Medication:** Medication name, Dose, Frequency, Duration, Instructions (sourced from authorized clinical records and reviewed by clinician)
- **Discharge Condition:** Stable, Improved, Requires follow-up, Other structured options
- **Instructions:** Diet, Activity, Wound / procedure care, Medication instructions, Restrictions, Warning signs, Follow-up instructions
- **Follow-up:** Follow-up date, Doctor, Department, Appointment, Required investigations
- **Documents:** Reports, Prescriptions, Supporting documents
- **Doctor:** Name, Designation, Signature / approval, Date

---

## 44. AI-ASSISTED DISCHARGE SUMMARY

AI may assist the doctor by generating a draft from authorized clinical information:
```text
Patient Episode → Clinical Records → Investigations → Procedures → Medications → Care Journey → AI Draft → Doctor Review → Doctor Edit → Doctor Approval → Final Discharge Summary
```
*AI must never independently finalize the discharge summary.*

---

## 45. DISCHARGE SUMMARY AI RULES

**AI should:** Summarize existing information, Organize information, Identify missing sections, Draft patient-friendly instructions, Identify inconsistencies for review, Suggest follow-up information based on existing records.
**AI should not:** Invent diagnoses, Invent medications, Invent procedures, Invent investigation results, Invent dates, Infer unsupported clinical facts, Automatically approve the summary.

---

## 46. DISCHARGE SUMMARY WORKFLOW

```text
Discharge Initiated → Collect Clinical Data → Generate Draft → Doctor Review → Edit → Approve → Generate PDF / Document → Save to Patient Documents → Send to Patient → Create Follow-up Tasks
```

---

## 47. DISCHARGE + CARE LOOP

The Discharge Summary module should integrate directly with Care Loop:
```text
Discharge Approved → Create Follow-up Task → Send Discharge Summary → WhatsApp Message → Reminder → Patient Response → Follow-up Appointment → Care Loop
```

---

## 48. DISCHARGE SUMMARY DELIVERY

After doctor approval, the patient may receive: PDF, Secure document link, WhatsApp document, Email where enabled, Patient portal in future.
The system must record: Generated date, Approved by, Sent date, Delivery status, Recipient, Version.

---

## 49. DISCHARGE SUMMARY VERSION CONTROL

A discharge summary must maintain versions (Draft v1 → Doctor Edited v2 → Approved v3 → Final). If an approved summary is modified: create a new version, preserve previous version, record who modified it and why.

---

## 50. APPOINTMENTS

Support: Create, Reschedule, Cancel, Confirm, Check-in, Complete, No-show, Follow-up.
Connects to: Patient, Doctor, Department, Journey, Care Loop, WhatsApp, Billing.

---

## 51. APPOINTMENT AUTOMATION

```text
Appointment created → WhatsApp confirmation → 24-hour reminder → Patient confirmation → Appointment → Post-appointment follow-up
```

---

## 52. CLINIC OPERATIONS

Clinic OS should eventually support: Departments, Rooms, Doctors, Staff, Branches, Working hours, Holidays, Appointment slots, Services, Queues, Patient registration, Check-in, Operational tasks.

---

## 53. CRM

Manage patient lifecycle before and around treatment:
`Lead → Enquiry → Counselling → Appointment → Consultation → Treatment Decision → Active Patient`

---

## 54. BILLING & PAYMENTS

Future billing capabilities: Invoices, Packages, Treatment packages, Payments, Outstanding balances, Refunds, Discounts, Receipts, Payment reminders, Payment links, Billing reports. Integrates with Care Loop.

---

## 55. PHARMACY & INVENTORY

Medicines, Stock, Batch, Expiry, Purchase, Sales, Dispensing, Inventory adjustments, Low-stock alerts, Pharmacy reporting. Fertility-specific: treatment consumables, procedure supplies.

---

## 56. LABORATORY

Test ordering, Sample collection, Sample status, Results, Report generation, Doctor review, Patient notification, Document integration. Connects with Care Loop.

---

## 57. INSURANCE & CLAIMS

Insurance information, Policy, Claim, Preauthorization, Documents, Requested/approved/paid amounts, Claim status, Queries, Settlement. Support ABDM/NHCX where applicable and payer APIs.

---

## 58. ANALYTICS

Multi-level analytics:
- **Clinic:** Total patients, Active patients, Appointments, Revenue, Follow-ups, Task completion, Staff workload
- **Care Loop:** Active journeys, Tasks created/completed, Overdue tasks, Escalations, AI conversations, Patient response rate, Automation completion
- **WhatsApp:** Messages, Response rate, Delivery, Read rate, Template usage, AI conversations, Human handoffs
- **Clinical Operations:** Reports pending, Doctor reviews, Follow-up completion, Discharge completion

---

## 59. CARE LOOP ANALYTICS

Key metrics: Care plans created, Active journeys, Tasks created/completed, Task completion rate, Overdue tasks, Patient response rate, Automated resolution rate, Escalation rate, AI handoff rate, Reports collected, Appointment adherence.
*The objective is not merely message volume. The objective is: Did the patient complete the required next step?*

---

## 60. PATIENT CONNECT

Future patient experience: Patient profile, Appointments, Care plan, Tasks, Documents, Reports, Payments, Messages, Follow-ups, Consent, Telehealth. WhatsApp remains the primary low-friction channel.

---

## 61. PATIENT SELF-SERVICE

Future capabilities: Book appointment, Reschedule, Cancel, Upload report, Download report, Pay, Request callback, Complete forms, Give consent, View instructions, Ask questions.

---

## 62. FERTILITY MODULE

Fertility EMR (Consultation, Medical history, Couple history, Diagnosis, Treatment, Clinical notes, Prescriptions), Fertility Journey (Evaluation, IUI, IVF, FET, Monitoring, Procedures, Follow-up, Outcome), Cycle Management.

---

## 63. IVF MODULE

IVF cycle, Stimulation, Follicular monitoring, Hormone monitoring, Trigger, Retrieval, Fertilization, Embryo development, Transfer, Freeze, Thaw, Outcome.

---

## 64. EMBRYOLOGY

Oocyte records, Sperm records, Fertilization, Culture, Embryo records, Grading, Transfer, Freeze, Thaw, Embryo history.

---

## 65. CRYOSTORAGE

Tank, Rack, Canister, Location, Sample, Freeze date, Thaw date, Movement history, Storage status.

---

## 66. FERTILITY BILLING

Treatment packages, IVF packages, Milestone billing, Payments, Outstanding amount, Refunds, Package utilization.

---

## 67. FERTILITY CRM

`Lead → Enquiry → Counselling → Consultation → Treatment Decision → Cycle`

---

## 68. OTHER SPECIALTIES

Architecture supports pluggable specialty modules: Dental, Dermatology, Maternity, Aesthetics.

---

## 69. INTEGRATION PLATFORM

Standardized integration layer: WhatsApp, ABDM, ABHA, NHCX, EMR/HMS, CRM, Laboratory, Payment gateways, SMS, Email, Voice providers, Storage, Identity systems, External APIs.

---

## 70. ABDM

Progressive integration: ABHA creation/capture, ABHA verification, Health record linking, Health information exchange, Consent-based access, HIP functionality, HIU functionality, HPR/HFR integration.

---

## 71. CONSENT MANAGEMENT

First-class platform concept: Consent request, Purpose, Data scope, Duration, Status, Grant, Reject, Withdraw, Audit history.

---

## 72. TELEHEALTH

Video consultation, Appointment link, Waiting room, Consultation, Clinical notes, Follow-up, Compliant recording. Integrates with Care Loop.

---

## 73. NOTIFICATION ENGINE

Channels: WhatsApp, SMS, Email, In-app, Push, AI voice. Supports templates, scheduling, retry, delivery status, preferences, quiet hours, audit logs.

---

## 74. EVENT-DRIVEN ARCHITECTURE

Reusable system events: `PatientCreated`, `AppointmentCreated`, `AppointmentCompleted`, `AppointmentCancelled`, `CareTaskCreated`, `CareTaskDue`, `CareTaskCompleted`, `CareTaskOverdue`, `DocumentUploaded`, `ReportReceived`, `PaymentCreated`, `PaymentCompleted`, `DischargeInitiated`, `DischargeCompleted`, `MessageReceived`, `MessageSent`, `AIHandoff`. Events trigger Care Loop, WhatsApp, AI, Notifications, Analytics, Tasks, Escalations.

---

## 75. REALTIME PLATFORM

Realtime sync for Messages, Media updates, Delivery status, Unread counts, Typing, AI responses, Escalations, Care task updates, Automation status without manual refresh.

---

## 76. SECURITY

Tenant isolation, Clinic isolation, RBAC, Authentication, Authorization, Encrypted credentials, Server-side secrets, Secure media access, Audit logs, Session security, API authorization, Input/file/MIME validation, Size limits, Secure storage, No executable uploads. Secrets never exposed to client/logs/URLs.

---

## 77. MEDIA SECURITY

All media validated, sanitized, stored securely, tenant-scoped, access-controlled. Endpoints verify Authenticated User → Clinic → Media Ownership → Permission before serving file. Cross-clinic access rejected.

---

## 78. AUDIT LOGGING

Auditable actions: Patient created/updated, Document uploaded/viewed, Message/template sent, Automation activated/executed, AI response, Human handoff, Care task changed, Discharge summary generated/approved/modified, User permission changed. Entries record: Actor, Action, Entity, Timestamp, Clinic, Relevant metadata.

---

## 79. CLINICAL GOVERNANCE

Clinical responsibility remains with authorized healthcare professionals. Platform preserves clinician approval, maintains auditability, clearly distinguishes AI content, avoids autonomous diagnosis/prescription/treatment decisions.

---

## 80. PATIENT COMMUNICATION GOVERNANCE

- **Operational (Can generally be automated):** Appointment reminder/confirmation, Document request, Payment reminder, Routine follow-up, Task reminder.
- **Clinical (Requires caution & human escalation):** Symptoms, Medication concerns, Test results, Treatment decisions, Side effects, Complications.

---

## 81. ADMIN PORTAL

Internal super-admin layer separate from clinic users for Organizations, Clinics, Subscriptions, Users, Feature flags, Module activation, System health, Integrations, Support, Audit, Configuration, Usage, AI configuration. Never exposes unnecessary patient data.

---

## 82. CLINIC ONBOARDING

`Create Account → Create Organization → Create Clinic → Select Specialty → Configure Staff → Configure Modules → Connect WhatsApp → Configure Templates → Configure Knowledge Base → Configure Automation → Ready`

---

## 83. MODULE ACTIVATION

Clinic admin can toggle modules (Care Loop, WhatsApp, Appointments, Documents, CRM, Billing, Pharmacy, Analytics) on/off without rebuilding clinic environment.

---

## 84. CONFIGURATION

Per-clinic configuration: Clinic name, Logo, Branches, Doctors, Staff, Working hours, Communication, WhatsApp, Templates, AI, Knowledge Base, Automation, Notification rules, Specialty, Care journey templates.

---

## 85. SEARCH

Global search supporting: Patient, Couple, Appointment, Conversation, Document, Care journey, Task, Discharge summary, Invoice, Claim. Respects RBAC and clinic isolation.

---

## 86. PATIENT TIMELINE

Consolidated timeline: Consultation → Appointment → Task → WhatsApp → Report → Doctor Review → Treatment → Discharge → Follow-up. Events show Date/time, Event, Actor, Source, Status.

---

## 87. COMMUNICATION TIMELINE

Granular history: Patient message, Staff message, AI message, Template, Media, Voice, Delivery status, Escalation.

---

## 88. STAFF PRODUCTIVITY

Platform surfaces exceptions rather than requiring staff to manually monitor every patient. Staff can batch actions, send templates, assign tasks, review reports, respond to conversations, manage automations, and resolve escalations quickly.

---

## 89. CARE LOOP INBOX

Prioritizes exceptions by categories: Needs Attention, Clinical Review, No Response, Missing Reports, Appointment Issue, AI Escalation, Overdue Task, Patient Request, Discharge Follow-up.
Each item explains: **WHO, WHAT, WHY, WHEN, NEXT ACTION**.

---

## 90. AI STAFF ASSISTANT

Capabilities: Summarize patient, Summarize conversation, Prepare daily workload, Identify overdue patients, Draft response, Find patient information, Prepare consultation context, Prepare discharge summary draft, Identify missing documentation, Explain why an automation failed.

---

## 91. DOCTOR DAILY WORKSPACE

Doctor home focuses on today's clinical needs: Today's Appointments, Patients requiring review, Reports, Clinical escalations, Active journeys. Quick actions: Start consultation, Open patient, Review report, Review escalation, Start voice consultation. Avoids excessive non-clinical operational noise.

---

## 92. CARE COORDINATOR WORKSPACE

Coordinator dashboard: Today's Tasks, Needs Attention, Overdue, Patient Replies, Missing Reports, Upcoming Appointments, AI Escalations. Rapid transition: `Exception → Patient → Conversation → Action → Resolution`.

---

## 93. REPORTING

Patient reports, Lab reports, Imaging, Procedures, Discharge summaries, Uploaded documents with status tracking (`Pending review`, `Reviewed`, `Requires action`, `Archived`).

---

## 94. DOCUMENT-TO-TASK LINKING

Documents link to care tasks (e.g., patient uploads PDF for blood test → task marked evidence received → doctor review task created).

---

## 95. CARE LOOP + DOCUMENTS

Document events trigger workflows (e.g., patient uploads report → Care Loop identifies task → task completed → doctor review task created → doctor reviews → patient follow-up).

---

## 96. CARE LOOP + DISCHARGE

Discharge becomes another journey transition:
`Treatment Completed → Discharge → Summary Approved → Summary Delivered → Follow-up Task → WhatsApp Reminder → Patient Response → Care Loop`

---

## 97. AUTOMATION TEMPLATES

Reusable automation templates: Appointment Reminder, Report Collection, Discharge Follow-up.

---

## 98. WORKFLOW VERSIONING

Published automations are versioned (e.g. Fertility Follow-up v1, v2). Existing executions remain tied to the version under which they started unless explicitly migrated.

---

## 99. ERROR HANDLING

- **Temporary failure:** Network error, Timeout, Provider outage, Rate limit → Retry automatically where safe.
- **Permanent failure:** Invalid template, Invalid recipient, Permission issue, Invalid configuration → Stop and notify staff.

---

## 100. IDEMPOTENCY

Prevent duplicate webhooks, duplicate messages, duplicate automations, duplicate template sends, duplicate documents, duplicate tasks, duplicate discharge notifications.

---

## 101. NOTIFICATION PREFERENCES

Staff notification frequency options: Immediate, Daily summary, Critical only, Assigned-only. Patient communication preferences supported.

---

## 102. SEARCHABLE AUDIT TRAIL

Administrators can search by User, Patient, Action, Date, Module, Entity.

---

## 103. DATA RETENTION

Configurable retention policies, archiving, deletion workflows, data export, audit preservation.

---

## 104. DATA EXPORT

Authorized role-based export of Patient info, Documents, Clinical records, Communications, Care journey, Discharge summaries, Billing, Audit info.

---

## 105. API PLATFORM

Secure, authenticated, authorized, versioned, tenant-scoped, audited APIs across all resources.

---

## 106. WEBHOOK PLATFORM

Inbound and outbound webhooks for system lifecycle events (`PatientCreated`, `AppointmentChanged`, `TaskCompleted`, `DocumentUploaded`, `MessageReceived`, `DischargeCompleted`, `PaymentReceived`).

---

## 107. OBSERVABILITY

Monitor API health, Database, Queue/worker, WhatsApp, Webhooks, Automation, AI, Media processing, Storage, Realtime connections without exposing sensitive PHI.

---

## 108. PERFORMANCE REQUIREMENTS

Fast dashboard loads, dataset pagination, minimal redundant API calls, realtime updates, asynchronous large media processing, non-blocking webhooks (Meta webhooks respond immediately, job processes in background).

---

## 109. SCALABILITY

Multi-organization, multi-clinic, multi-branch architecture supporting thousands of patients and millions of messages. Avoid single-tenant/single-account assumptions.

---

## 110. PRODUCTION WHATSAPP REQUIREMENTS

Connection, Verification, Template sync & sending, Text & Media sending/inbound, Delivery status, Realtime sync, Automation, AI, Human handoff, Full conversation history.

---

## 111. WHATSAPP CONNECTION STATUS

Visual status indicators: Connected, Not connected, Authentication error, Permission error, Phone issue, Template issue, Webhook issue. Never expose raw Meta API tokens to staff.

---

## 112. WHATSAPP TEMPLATE LIFECYCLE

`Meta Template → Pending → Meta Approval → Approved → Sync to SmrkoMed → Available in Chat & Automation → Send → Delivery Status`

---

## 113. AI + WHATSAPP + CARE LOOP

Doctor creates plan → Care Loop schedules tasks → WhatsApp notification → Patient replies naturally → AI interprets with Knowledge Base → AI responds & updates task → Non-response/concern escalates to AI voice or staff.

---

## 114. FERTILITY CARE LOOP EXAMPLE

```text
Patient: Priya + Rahul | Journey: IVF | Stage: Pre-treatment evaluation
Task: Complete blood tests
  ↓
WhatsApp: "Hi Priya, your blood tests are due tomorrow."
  ↓
Patient: "Okay, I'll do them tomorrow."
  ↓
Care Loop: Task remains scheduled
  ↓
Patient uploads report
  ↓
Care Loop: Task completed
  ↓
Doctor review task → Doctor reviews → Next task: Ultrasound → Automation continues
```

---

## 115. COMPLETE PATIENT JOURNEY

`Lead → CRM → Appointment → Consultation → Patient Record → Care Journey → Care Plan → Care Loop → WhatsApp → Tasks → Reports → Doctor Review → Treatment → Billing → Discharge → Follow-up → Outcome → Analytics`

---

## 116. CLINICAL DOCUMENTATION ROADMAP

Unified clinical documentation sharing patient context: Consultation notes, Progress notes, Procedure notes, Treatment notes, Prescriptions, Reports, Consent, Discharge summaries, Follow-up notes.

---

## 117. DISCHARGE SUMMARY → FOLLOW-UP

Discharge is not the end of care; it transitions directly into Care Loop follow-up instructions, document sharing, medication adherence, and follow-up visits.

---

## 118. FUTURE CARE JOURNEY BUILDER

No-code journey builder for clinics (e.g., Post-Procedure Follow-up: Stage 1 Discharge, Stage 2 24h check, Stage 3 48h check, Stage 4 Follow-up appointment, Stage 5 Outcome).

---

## 119. CUSTOM SPECIALTY WORKFLOWS

Configurable Specialty → Journey → Stages → Tasks → Templates → Automation → AI Knowledge, enabling multi-specialty expansion.

---

## 120. PRODUCT DIFFERENTIATORS

1. **Patient Journey:** Answers "What needs to happen next — and has the patient actually done it?"
2. **Modular Architecture:** Keep existing systems; plug in SmrkoMed where needed.
3. **Care Coordination:** Connects Doctor → Care Plan → AI → Patient → Completion / Exception → Staff.
4. **AI + Human:** AI handles routine; staff handles exceptions; doctor handles clinical decisions.
5. **Communication as a Workflow:** WhatsApp connects directly to clinical tasks, automations, and records.

---

## 121. WHAT SMRKOMED SHOULD NOT TRY TO DO INITIALLY

SmrkoMed should NOT attempt to immediately become:
- A complete hospital information system
- A full EMR replacement
- A complete pharmacy system
- A complete laboratory system
- A full embryology platform
- A complete insurance platform
- An autonomous medical AI
- A replacement for every clinic's existing system

*The strategy is to first own the layer between healthcare teams and patients.*

---

## 122. MVP PRIORITY

- **P0 — Core:** Authentication, Clinic, Users, Roles, Patients, Couples, Care plans, Care tasks, Care Loop, WhatsApp, Conversations, Templates, Automation, Reports, Documents, Realtime, Escalations.
- **P1 — Intelligence:** AI, Knowledge Base, Human handoff, AI voice, Conversation summaries, Staff AI assistant, Discharge summary draft.
- **P2 — Clinical / Operational Expansion:** Appointments, Clinical documentation, Billing, CRM, Analytics, Patient Connect, Discharge workflow.
- **P3 — Healthcare Ecosystem:** ABDM, ABHA, NHCX, Insurance, Lab, Pharmacy, Telehealth, External integrations.
- **P4 — Specialty Expansion:** IVF, Embryology, Cryostorage, Dental, Dermatology, Maternity, Aesthetics, Other specialties.

---

## 123. PRODUCT DEVELOPMENT PHASES

- **Phase 1 — Core Platform:** Foundation, multi-tenancy, users, roles, patients, couples, documents, tasks, notifications, audit.
- **Phase 2 — Care Loop:** Care plans, journey, tasks, automation, escalations, staff inbox.
- **Phase 3 — WhatsApp:** Text, templates, variables, media, realtime, delivery status, outbound media, communication.
- **Phase 4 — Automation:** Triggers, conditions, template nodes, wait, wait-for-reply, execution history, retry.
- **Phase 5 — AI:** AI conversations, Knowledge Base, AI automation, human handoff, AI voice, staff assistant.
- **Phase 6 — Clinical Documentation:** Consultation notes, reports, clinical documents, discharge summaries, AI-assisted drafts, approvals.
- **Phase 7 — Operational Platform:** Appointments, CRM, billing, analytics, Patient Connect.
- **Phase 8 — Healthcare Integrations:** ABDM, ABHA, NHCX, Lab, Insurance, Payment, External HMS/EMR.
- **Phase 9 — Specialty Expansion:** Specialty-specific journeys and modules.

---

## 124. SUCCESS METRICS

- **Product:** Active clinics, Active users, Active patients, Care plans, Care tasks, Completed tasks, Automation executions, WhatsApp conversations, AI conversations, Reports collected, Discharge summaries completed.
- **Patient Engagement:** Response rate, Task completion rate, Appointment adherence, Report submission rate, Follow-up completion, AI resolution rate, Human escalation rate.
- **Operational:** Staff time saved, Overdue tasks, Response time, Escalation resolution time, Automation failure rate.

---

## 125. NORTH STAR METRIC

> **Percentage of planned patient care actions successfully completed.**
> 
> *Supporting metric:* Percentage of patient care actions completed without manual intervention.

---

## 126. PRODUCT QUALITY PRINCIPLES

Every major feature must be: Reliable, Secure, Auditable, Tenant-isolated, Realtime where appropriate, Mobile-friendly, Easy to understand, Clinically safe, Human-controlled, Modular, Extensible.

---

## 127. DESIGN PRINCIPLES

Premium healthcare SaaS experience:
- Clean, Modern, Calm, Professional
- Information-dense without being overwhelming
- Fast, Responsive, Accessible
- Emphasize patient context, next action, exceptions, workflow, clinical relevance. Avoid unnecessary visual complexity.

---

## 128. CHAT DESIGN PRINCIPLES

WhatsApp inbox must feel significantly better than generic messaging: typography, clear hierarchy, voice player, media previews, document cards, template preview, AI indicators, human handoff badge, embedded patient & journey context, delivery status, realtime updates.

---

## 129. PATIENT CONTEXT IN CHAT

Side context panel inside conversation: Patient name, Journey, Stage, Next Task, Appointment, Assigned Doctor & Coordinator, preventing need to switch tabs.

---

## 130. AI CONTEXT IN CHAT

AI accesses strictly scoped task context: Conversation, Patient summary, Appointment, Journey, Care Loop, Knowledge Base. Sensitive unrelated information excluded.

---

## 131. HUMAN HANDOFF UI

When AI hands over:
```text
AI Escalation
Reason: Patient requested doctor
Status: Waiting for staff
[Take Conversation] [Assign] [Resolve]

Once staff takes over:
AI Paused | Human Agent: Meera
```

---

## 132. DISCHARGE SUMMARY UI

- **Header:** Patient, Episode, Doctor, Date, Status
- **Sections:** Clinical Summary, Diagnosis, Investigations, Procedures, Treatment, Medication, Condition at Discharge, Instructions, Follow-up, Documents
- **AI Action:** Generate Draft
- **Review:** Doctor Review, Edit, Approve
- **Delivery:** Generate PDF, Send to Patient via WhatsApp

---

## 133. DISCHARGE SUMMARY STATUS

`Not Started` → `Draft` → `AI Drafted` → `Under Review` → `Changes Requested` → `Approved` → `Sent` → `Amended` → `Archived`

---

## 134. DISCHARGE AUTOMATION EXAMPLE

`Doctor marks episode complete → Discharge initiated → System gathers authorized data → AI prepares draft → Doctor reviews → Doctor approves → PDF generated → Saved to patient documents → WhatsApp sent → Care Loop follow-up created`

---

## 135. DEMO / DEVELOPMENT MODE

Support safe demonstration environments with synthetic data, clearly tagged demo states, blocked real-patient communication, simulated WhatsApp & AI responses.

---

## 136. PRODUCTION READINESS

Features must be classified as:
- `CODE VERIFIED` (Implementation & types complete)
- `AUTOMATED TEST VERIFIED` (Tests pass)
- `PRODUCTION VERIFIED` (Deployed & verified in staging/production)
- `REAL WHATSAPP VERIFIED` (Tested with actual Meta API)
- `CLINICALLY REVIEWED` (Clinical content reviewed by authorized stakeholders)

---

## 137. TESTING REQUIREMENTS

Unit tests, Integration tests, API tests, Permission tests, Tenant isolation tests, Error tests, Realtime tests, Production smoke tests.

---

## 138. WHATSAPP END-TO-END TEST

End-to-end coverage:
- Patient → Text, Voice, Image, Video, Document, Sticker
- Doctor → Text, Voice, Image, Document, Template
- Automation → Template, Wait, Patient Reply, Resume
- Patient → AI, Knowledge Base, Response, Human Handoff
- Discharge → Summary, WhatsApp, Follow-up

---

## 139. END-TO-END CARE LOOP

Definitive workflow:
`Patient → Consultation → Doctor creates care plan → Care Loop → Task created → WhatsApp → Patient reminder → Patient responds → AI understands → Knowledge Base → Task updated → Patient uploads document → Doctor reviews → Next task → Non-response → Reminder → AI voice → Exception → Staff → Doctor → Treatment continues → Discharge → AI-assisted discharge summary → Doctor approval → Summary sent → Care Loop follow-up → Outcome`

---

## 140. LONG-TERM PRODUCT ARCHITECTURE

```text
               SMRKONOVA
                   │
                   ↓
               SMRKOMED
      (Modular Healthcare Platform)
                   │
  ┌────────────────┼────────────────┐
  ↓                ↓                ↓
CORE PLATFORM   AI LAYER     INTEGRATION LAYER
  │                │                │
  └────────────────┼────────────────┘
                   ↓
            PRODUCT MODULES
  ┌──────────┬─────┴──────┬────────────┬──────────┐
  ↓          ↓            ↓            ↓          ↓
Care Loop  Clinic OS   Patient Connect Clinical  Analytics
                       & Records
  ├── WhatsApp
  ├── Automation
  ├── AI
  ├── Knowledge Base
  ├── Tasks
  ├── Escalation
  ├── Documents
  └── Discharge
                   │
                   ↓
             CARE JOURNEYS
  ┌──────────┬─────┴──────┬────────────┬──────────┐
  ↓          ↓            ↓            ↓          ↓
Fertility  Dental     Dermatology   Maternity  Aesthetics
  ├── IVF
  ├── IUI
  ├── FET
  ├── Evaluation
  ├── Cycle Management
  ├── Embryology
  └── Cryostorage
```

---

## 141. THE SMRKOMED CARE MODEL

`PATIENT → JOURNEY → STAGE → CARE PLAN → TASK → COMMUNICATION → PATIENT RESPONSE → COMPLETION → NEXT ACTION → EXCEPTION → STAFF → DOCTOR → OUTCOME`

---

## 142. FINAL PRODUCT DEFINITION

SmrkoMed is **A modular operating layer for patient care**, connecting healthcare organizations, doctors, care teams, patients, communications, care journeys, tasks, AI, documents, clinical records, and discharge transitions.

---

## 143. CORE STRATEGIC PRINCIPLES

- Do not build an "all-in-one healthcare software." → **Build a modular healthcare platform.**
- Do not replace the clinic's existing systems. → **Build a connected layer around them.**
- Do not automate doctors. → **Build automation around doctors.**
- Do not make AI the doctor. → **Make AI the coordinator.**
- Do not make patients manage another complicated application. → **Make healthcare communication simple and accessible.**
- Do not build software around records alone. → **Build software around patient journeys.**
- Do not measure communication by messages sent. → **Measure care actions completed.**
- Do not make staff monitor every patient. → **Make the system surface the exceptions.**
- Do not make discharge the end of the workflow. → **Make discharge the transition into the next care journey.**

---

## 144. FINAL PRODUCT VISION

The ultimate SmrkoMed experience:
```text
               SMRKOMED
                  │
                  ↓
            Patient Journey
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
     CLINICAL          OPERATIONAL
     (Doctor)            (Staff)
        │                   │
        └─────────┬─────────┘
                  ↓
              CARE PLAN
                  ↓
              CARE LOOP
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    WhatsApp      AI      Tasks
        ↓         ↓         ↓
        └─────────┼─────────┘
                  ↓
               Patient
                  ↓
           Response / Action
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    Completed  Waiting  Exception
        │         │         ↓
        │         │       Staff
        │         │         ↓
        │         │       Doctor
        └─────────┴─────────┘
                  ↓
               Outcome
                  ↓
              Follow-up
                  ↓
              Discharge
                  ↓
          Next Care Journey
```

The long-term strategic asset of SmrkoMed is the **Care & Workflow Engine** connecting patients, care plans, tasks, communication, AI, documents, clinical workflows, discharge, and outcomes. Once this engine is mature, the same infrastructure can be configured for fertility and subsequently for any repetitive healthcare journey.
