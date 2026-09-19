# SMRKoMed Doctor Mobile App — Complete API Reference

**Target Platform:** iOS & Android (React Native, Flutter, Swift, Kotlin)  
**API Version:** `v1`  
**Base URL:**
- **Development (API Server):** `http://<YOUR_LOCAL_IP>:4000/api/v1`
- **Development (Web Proxy):** `http://<YOUR_LOCAL_IP>:3000/api/v1`
- **Production:** `https://app.smrkomed.com/api/v1`

---

## 1. Authentication & Common Conventions

### 1.1 Doctor Login
- **Endpoint:** `POST /api/auth/callback/credentials`
- **Host:** Web App (`https://app.smrkomed.com` or `http://localhost:3000`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "doctor@smrkomed.com",
  "password": "DoctorSecurePassword123"
}
```
- **Response (`200 OK`):**
```json
{
  "user": {
    "id": "usr_01",
    "email": "doctor@smrkomed.com",
    "name": "Dr. Ananya Rao",
    "role": "DOCTOR"
  }
}
```
*Note: The response sets the `authjs.session-token` cookie or returns a JWT bearer token.*

### 1.2 Authenticated Request Headers
On all `/api/v1/*` requests, send the session token:
```http
Authorization: Bearer <session_token>
Cookie: authjs.session-token=<session_token>
Content-Type: application/json
x-clinic-id: <clinic_id>   (Optional; automatically inferred from user session)
```

### 1.3 Response Envelopes
All responses provide dual-field compatibility (`ok` and `success`):

#### Success Response (`200 OK` / `201 Created`):
```json
{
  "ok": true,
  "success": true,
  "data": { ... }
}
```

#### Error Response (`400` / `401` / `403` / `404` / `500`):
```json
{
  "ok": false,
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": null
  }
}
```

---

## 2. Doctor Context & Clinic Profile

### 2.1 Get Current Doctor Profile
- **Endpoint:** `GET /api/v1/users/me`
- **Response Data:**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "id": "cmu6rkn080000njfo34n9spvq",
    "name": "Dr. Ananya Rao",
    "email": "doctor@smrkomed.com",
    "phone": "+919876543210",
    "role": "DOCTOR",
    "clinic": {
      "id": "cmu3nmx310026jy04gsi21hxl",
      "name": "Hospex · Kochi",
      "timezone": "Asia/Kolkata"
    },
    "organization": {
      "id": "org_01",
      "name": "Hospex Healthcare"
    }
  }
}
```

### 2.2 Get Current Clinic Details
- **Endpoint:** `GET /api/v1/clinics/current`
- **Response Data:**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "id": "cmu3nmx310026jy04gsi21hxl",
    "name": "Hospex · Kochi",
    "city": "Kochi",
    "address": "Marine Drive, Kochi 682031",
    "phone": "+919606654032",
    "email": "kochi@hospex.com",
    "timezone": "Asia/Kolkata"
  }
}
```

---

## 3. Tab 1: Home ("Prepare My Day")

### 3.1 Daily Clinical Briefing
Aggregates today's appointments, pending report reviews, clinical escalations, and active IVF treatments.

- **Endpoint:** `GET /api/v1/doctors/prepare-my-day`
- **Auth:** `DOCTOR` role

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "doctorId": "cmu6rkn080000njfo34n9spvq",
    "doctorName": "Dr. Ananya Rao",
    "date": "2026-09-19",
    "metrics": {
      "todayAppointmentsCount": 8,
      "pendingReportsCount": 3,
      "careLoopExceptionsCount": 2,
      "activeTreatmentsCount": 14
    },
    "urgentExceptions": [
      {
        "taskId": "task_991",
        "title": "Severe abdominal cramping reported post-OPU",
        "patientName": "Pooja Verma",
        "severity": "CRITICAL",
        "reportedAt": "2026-09-19T06:30:00.000Z"
      }
    ],
    "scheduleToday": [
      {
        "id": "appt_101",
        "time": "09:00 AM",
        "patientName": "Vijay",
        "coupleSlug": "c-y7e0mtp2-mu7195yr",
        "type": "CONSULTATION",
        "status": "CONFIRMED",
        "treatmentBadge": "IVF · Stage 7 (Ovarian Stimulation)"
      }
    ],
    "reportsToReview": [
      {
        "orderId": "diag_331",
        "testName": "Serum Estradiol (E2)",
        "patientName": "Vijay",
        "status": "VERIFIED"
      }
    ]
  }
}
```

### 3.2 Real-Time Event Stream (SSE)
Listens for incoming patient messages, urgent task escalations, and appointment updates.

- **Endpoint:** `GET /api/v1/realtime/events`
- **Headers:** `Accept: text/event-stream`
- **Event Types:** `task.escalated`, `message.received`, `report.verified`, `appointment.created`

---

## 4. Tab 2: Schedule & Consultations

### 4.1 Doctor Agenda (Day / Week)
- **Endpoint:** `GET /api/v1/doctors/schedule`
- **Query Params:**
  - `view`: `day` | `week` (default: `day`)
  - `date`: `YYYY-MM-DD` (default: today)

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "view": "day",
    "date": "2026-09-19",
    "appointments": [
      {
        "id": "appt_101",
        "startsAt": "2026-09-19T03:30:00.000Z",
        "endsAt": "2026-09-19T04:00:00.000Z",
        "type": "CONSULTATION",
        "status": "CONFIRMED",
        "patient": {
          "id": "cmu7195y9003vn010y7e0mtp2",
          "name": "Vijay",
          "phone": "+918095423222"
        },
        "couple": {
          "id": "cmu7195ys003zn010f9wt3g01",
          "slug": "c-y7e0mtp2-mu7195yr"
        },
        "treatment": {
          "kind": "IVF",
          "stage": "Ovarian Stimulation",
          "stageIndex": 6
        }
      }
    ]
  }
}
```

### 4.2 Start Consultation
- **Endpoint:** `POST /api/v1/doctors/consultations/:appointmentId/start`
- **Response (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "appointmentId": "appt_101",
    "status": "IN_PROGRESS",
    "startedAt": "2026-09-19T03:32:00.000Z"
  }
}
```

### 4.3 Complete Consultation (SOAP Notes & Prescriptions)
- **Endpoint:** `POST /api/v1/doctors/consultations/:appointmentId/complete`
- **Auth:** `DOCTOR` role strictly enforced

**Request Body:**
```json
{
  "chiefComplaint": "Follicular scan review Day 8 of stimulation",
  "examinationNotes": "Right ovary: 4 follicles (14-16mm). Left ovary: 3 follicles (13-15mm). Endometrium: 8.4mm.",
  "diagnosis": "Adequate ovarian response",
  "clinicalPlan": "Continue rFSH 225 IU for 2 days. Trigger shot scheduled for Day 11.",
  "prescriptions": [
    {
      "medicineName": "Gonal-F (rFSH)",
      "dosage": "225 IU",
      "frequency": "Once daily (Morning)",
      "instructions": "Administer subcutaneously at 09:00 AM"
    }
  ]
}
```

### 4.4 Doctor Consultation History
- **Endpoint:** `GET /api/v1/doctors/me/consultations` (or `GET /api/v1/doctors/:id/consultations`)
- **Query Params:** `limit` (default: 50), `coupleId` (optional)

### 4.5 General Appointments Management
- **List Appointments:** `GET /api/v1/appointments?date=YYYY-MM-DD&status=CONFIRMED`
- **Get Appointment:** `GET /api/v1/appointments/:id`
- **Book Appointment:** `POST /api/v1/appointments`
  ```json
  {
    "coupleId": "cmu7195ys003zn010f9wt3g01",
    "doctorId": "cmu6rkn080000njfo34n9spvq",
    "type": "CONSULTATION",
    "startsAt": "2026-09-22T04:00:00.000Z",
    "durationMin": 30,
    "notes": "Follicular ultrasound scan"
  }
  ```
- **Cancel Appointment:** `POST /api/v1/appointments/:id/cancel`
- **Reschedule Appointment:** `POST /api/v1/appointments/:id/reschedule`

---

## 5. Tab 3: Patients & IVF Journeys

### 5.1 Patient 360 Full Context
Returns the full patient dossier (demographics, active treatment, care plan, medications, invoices, and timeline).

- **Endpoint:** `GET /api/v1/couples/:id/360`
- **Param:** `:id` (Couple ID or slug `c-y7e0mtp2-mu7195yr`)

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "header": {
      "patientName": "Vijay",
      "partnerName": "Priya",
      "assignedDoctor": "Dr. Ananya Rao",
      "currentTreatment": {
        "id": "cmu7195zm0041n010kddq6gew",
        "kind": "IVF",
        "label": "IVF / ICSI Treatment",
        "status": "ACTIVE",
        "stageIndex": 6,
        "stageName": "Ovarian Stimulation",
        "cycleNumber": 1
      },
      "currentCarePlan": {
        "id": "cp_01",
        "stageIndex": 6,
        "stageName": "07. Ovarian Stimulation"
      }
    },
    "primaryPatient": {
      "id": "cmu7195y9003vn010y7e0mtp2",
      "name": "Vijay",
      "phone": "+918095423222",
      "dateOfBirth": "2001-01-01T00:00:00.000Z",
      "gender": "FEMALE"
    },
    "partnerPatient": {
      "id": "cmu7195ym003xn010500hfiqv",
      "name": "Priya",
      "phone": "+917795559724",
      "gender": "MALE"
    },
    "operationalAttention": [
      {
        "title": "Follicular scan due in 24 hours",
        "level": "MEDIUM"
      }
    ],
    "timeline": [ ... ]
  }
}
```

### 5.2 List Couples / Patients
- **Endpoint:** `GET /api/v1/couples`
- **Query Params:** `doctorId`, `status=ACTIVE`, `limit=50`, `search=Vijay`

### 5.3 Patient Unified Timeline
- **Endpoint:** `GET /api/v1/couples/:id/timeline`
- **Query Params:** `limit=50`

### 5.4 List Treatments
- **Endpoint:** `GET /api/v1/treatments`
- **Query Params:** `coupleId`, `status` (`ACTIVE` | `COMPLETED` | `CANCELLED`), `kind` (`IVF` | `IUI` | `FET` | `EVALUATION`), `limit`

### 5.5 Get Treatment Details
- **Endpoint:** `GET /api/v1/treatments/:id`

### 5.6 Create Treatment Protocol
- **Endpoint:** `POST /api/v1/treatments`
- **Request Body:**
```json
{
  "coupleId": "cmu7195ys003zn010f9wt3g01",
  "kind": "IVF",
  "label": "IVF / ICSI Protocol A",
  "status": "ACTIVE",
  "stageIndex": 0,
  "stageName": "Lead / Appointment",
  "cycleNumber": 1,
  "notes": "Antagonist protocol"
}
```

### 5.7 Update Treatment Protocol & Cycle Stage
- **Endpoint:** `PATCH /api/v1/treatments/:id`
- **Request Body:**
```json
{
  "kind": "IVF",
  "label": "IVF / ICSI Treatment",
  "status": "ACTIVE",
  "stageIndex": 6,
  "stageName": "Ovarian Stimulation",
  "cycleNumber": 1,
  "notes": "Antagonist protocol. rFSH 225 IU daily."
}
```
*Note: Advancing `stageIndex` (0 to 14) automatically updates the linked Care Plan and sets prior steps to `DONE`, the active step to `CURRENT`, and future steps to `PENDING`.*

---

## 6. Tab 4: Messages & Clinical Chat

### 6.1 Priority Clinical Inbox
- **Endpoint:** `GET /api/v1/doctors/messages` (or `GET /api/v1/whatsapp-automation/inbox`)
- **Query Params:** `unreadOnly=true|false`, `limit=30`

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": [
    {
      "conversationId": "conv_01",
      "patientName": "Vijay",
      "phone": "+918095423222",
      "lastMessage": "Doctor, should I take the injection before or after breakfast?",
      "lastMessageAt": "2026-09-19T07:15:00.000Z",
      "unreadCount": 1,
      "requiresDoctorReview": true
    }
  ]
}
```

### 6.2 Get Conversation History
- **Endpoint:** `GET /api/v1/whatsapp-automation/conversations/:id`
- **Query Params:** `limit=50`

### 6.3 Send Doctor WhatsApp Message
- **Endpoint:** `POST /api/v1/whatsapp-automation/messages`
- **Request Body:**
```json
{
  "conversationId": "conv_01",
  "content": "Please take the injection 30 minutes after food at 09:00 AM.",
  "senderType": "DOCTOR"
}
```

### 6.4 Mark Thread Read
- **Endpoint:** `POST /api/v1/whatsapp-automation/conversations/:id/read`

---

## 7. Tab 5: Reports Review & Sign-Off

### 7.1 Diagnostic Reports Review Queue
- **Endpoint:** `GET /api/v1/doctors/reports`
- **Query Params:** `status`: `PENDING` | `REVIEWED` (default: `PENDING`)

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": [
    {
      "orderId": "diag_01",
      "patientName": "Vijay",
      "testName": "Serum Estradiol (E2)",
      "category": "Fertility Lab",
      "collectedAt": "2026-09-19T04:00:00.000Z",
      "resultValue": "1850 pg/mL",
      "referenceRange": "150 - 2500 pg/mL",
      "status": "VERIFIED"
    }
  ]
}
```

### 7.2 Doctor Sign Off Report
- **Endpoint:** `POST /api/v1/doctors/reports/:orderId/sign-off`
- **Request Body:**
```json
{
  "clinicalNote": "E2 level optimal for trigger. Approved to proceed with OPU.",
  "status": "REVIEWED"
}
```

### 7.3 Diagnostic Orders Management
- **List All Orders:** `GET /api/v1/diagnostics/orders?patientId=...`
- **Order Details:** `GET /api/v1/diagnostics/orders/:id`
- **Place Lab/Ultrasound Order:** `POST /api/v1/diagnostics/orders`
  ```json
  {
    "patientId": "cmu7195y9003vn010y7e0mtp2",
    "coupleId": "cmu7195ys003zn010f9wt3g01",
    "testName": "AMH (Anti-Müllerian Hormone)",
    "category": "Fertility Lab",
    "priority": "Routine"
  }
  ```
- **Review Diagnostic Order (Generic):** `POST /api/v1/diagnostics/orders/:id/doctor-review`
  ```json
  {
    "reviewNotes": "AMH 2.8 ng/mL reflects good ovarian reserve.",
    "action": "APPROVED"
  }
  ```

---

## 8. Care Loop & Clinical Exceptions

### 8.1 Care Loop Overview
- **Endpoint:** `GET /api/v1/care-loop`
- **Response:** Summary metrics, urgent tasks, escalations, and active care plans.

### 8.2 Doctor Exceptions Filter
- **Endpoint:** `GET /api/v1/care-loop/exceptions`
- **Response:** Returns strictly clinical escalations and overdue tasks.

### 8.3 Care Tasks Management
- **List Tasks:** `GET /api/v1/care-tasks?coupleId=...&status=WAITING`
- **Get Task:** `GET /api/v1/care-tasks/:id`
- **Update Task:** `PATCH /api/v1/care-tasks/:id`
  ```json
  {
    "status": "COMPLETED",
    "responsePayload": { "source": "DOCTOR_APP", "patientResponse": "DONE" }
  }
  ```
- **Escalate Task:** `POST /api/v1/care-tasks/:id/escalate`
  ```json
  {
    "reason": "Patient reported adverse reaction to medication"
  }
  ```
- **Resolve Task:** `POST /api/v1/care-tasks/:id/resolve`
  ```json
  {
    "resolutionNotes": "Medication switched to alternative dosage. Patient stable."
  }
  ```

### 8.4 Care Plans
- **Get Active Care Plan:** `GET /api/v1/care-plans/:id` (Returns all 15 stages and task steps)

---

## 9. E-Prescriptions & Pharmacy Formulary

### 9.1 Issue Electronic Prescription
- **Endpoint:** `POST /api/v1/pharmacy/prescriptions`
- **Auth:** `DOCTOR` role

**Request Body:**
```json
{
  "patientId": "cmu7195y9003vn010y7e0mtp2",
  "coupleId": "cmu7195ys003zn010f9wt3g01",
  "notes": "Ovarian stimulation protocol Day 2 to Day 8",
  "items": [
    {
      "medicineName": "Gonal-F 450 IU (rFSH)",
      "dosage": "225 IU",
      "frequency": "Once daily",
      "timeOfDay": "Morning",
      "beforeAfterFood": "After food",
      "quantityPrescribed": 3,
      "instructions": "Inject subcutaneously at 09:00 AM"
    }
  ]
}
```

### 9.2 List Prescriptions
- **Endpoint:** `GET /api/v1/pharmacy/prescriptions?patientId=...`

### 9.3 Search Formulary / Drug Inventory
- **Endpoint:** `GET /api/v1/pharmacy/products?search=Gonal`
- **Response:** Returns matching medication names, strengths, formulations, and stock status.

---

## 10. Discharge Queue & Graduation

### 10.1 Get Discharge Queue
- **Endpoint:** `GET /api/v1/doctors/discharge-queue`
- **Response:** Lists couples with completed cycles ready for clinical discharge sign-off.

### 10.2 Sign Off Discharge
- **Endpoint:** `POST /api/v1/doctors/discharge-queue/:coupleId/sign-off`
- **Request Body:**
```json
{
  "outcome": "PREGNANT",
  "clinicalDischargeSummary": "Positive beta-hCG (1250 mIU/mL). Intrauterine gestational sac confirmed on ultrasound at 6 weeks. Graduated to routine obstetric care.",
  "followUpInstructions": "Schedule first trimester anomaly scan at 11-13 weeks. Continue progesterone support as prescribed."
}
```

---

## 11. Doctor Availability & Slot Schedule

### 11.1 Get Availability
- **Endpoint:** `GET /api/v1/doctors/me/availability` (or `GET /api/v1/doctors/:id/availability`)

**Response Data (`200 OK`):**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "doctorId": "cmu6rkn080000njfo34n9spvq",
    "doctorName": "Dr. Ananya Rao",
    "slotDuration": 20,
    "workingDays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "schedule": [
      { "day": "Mon", "active": true, "timeRange": "09:00 AM – 04:00 PM", "focus": "General Fertility OPD" },
      { "day": "Tue", "active": true, "timeRange": "09:00 AM – 04:00 PM", "focus": "General Fertility OPD" },
      { "day": "Sun", "active": false, "timeRange": "", "focus": "Off Day" }
    ]
  }
}
```

### 11.2 Update Availability
- **Endpoint:** `POST /api/v1/doctors/me/availability`
- **Request Body:**
```json
{
  "slotDuration": 20,
  "schedule": [
    {
      "day": "Mon",
      "active": true,
      "timeRange": "09:00 AM – 04:00 PM",
      "focus": "General Fertility OPD"
    }
  ]
}
```

### 11.3 Web Slot Management Synchronization
- **Get Slots:** `GET /api/doctors/slot-management` (Requires authenticated session)
- **Save Slots:** `POST /api/doctors/slot-management`

---

## 12. Smrko AI Clinical Copilot

*Disclaimer: Smrko AI provides assistive drafting only. The attending doctor holds sole clinical authority.*

### 12.1 Generate SOAP Notes from Clinical Impression
- **Endpoint:** `POST /api/v1/ai/consultation-summary`
- **Request Body:**
```json
{
  "appointmentId": "appt_101",
  "clinicalImpressionNotes": "Day 8 stim scan. Right ovary 4 follicles 14-16mm, left ovary 3 follicles 13-15mm. Endo 8.4mm. Patient feels mild fullness, no pain.",
  "vitals": { "bp": "118/76", "pulse": "74" }
}
```
- **Response Data:**
```json
{
  "ok": true,
  "success": true,
  "data": {
    "chiefComplaint": "Follicular monitoring (Cycle Day 8)",
    "examination": "Endometrium 8.4mm trilaminar. Bilateral follicular development (7 leading follicles 13-16mm).",
    "assessment": "Adequate, symmetric response to rFSH stimulation",
    "suggestedPlan": "Continue rFSH 225 IU. Target hCG trigger Day 11."
  }
}
```

### 12.2 Draft Patient Clinical WhatsApp Message
- **Endpoint:** `POST /api/v1/ai/draft-message`
- **Request Body:**
```json
{
  "patientId": "cmu7195y9003vn010y7e0mtp2",
  "intent": "MEDICATION_REMINDER",
  "customContext": "Remind patient to take Ovitrelle 250 mcg trigger injection at exactly 09:30 PM tonight."
}
```
- **Response:** Returns draft text with doctor approval button.

---

## 13. Standard 15 IVF Stages Index Mapping

All cycle milestones use **`0`-indexed** numbers:

| Index | Name in API (`stageIndex`) | Milestone Display Name |
| :--- | :--- | :--- |
| `0` | Lead / Appointment | 01. Lead / Appointment |
| `1` | Initial Consultation | 02. Initial Consultation |
| `2` | Fertility Investigation / Workup | 03. Fertility Investigation / Workup |
| `3` | IVF Decision | 04. IVF Decision |
| `4` | Treatment Planning & Consent | 05. Treatment Planning & Consent |
| `5` | Cycle Preparation | 06. Cycle Preparation |
| `6` | Ovarian Stimulation | 07. Ovarian Stimulation |
| `7` | Follicular Monitoring | 08. Follicular Monitoring |
| `8` | Trigger | 09. Trigger |
| `9` | OPU (Oocyte Pick-Up) | 10. OPU (Oocyte Pick-Up) |
| `10` | Embryology | 11. Embryology |
| `11` | Transfer / FET | 12. Transfer / FET |
| `12` | Post-Transfer (Two-Week Wait) | 13. Post-Transfer Care |
| `13` | Pregnancy Test | 14. Pregnancy Test (Beta-hCG) |
| `14` | Outcome | 15. Outcome & Follow-up |

---

## 14. Status Codes & Error Handling

| Code | Status | Meaning | Action for Mobile Client |
| :--- | :--- | :--- | :--- |
| **`200`** | `OK` | Request succeeded. | Parse `response.data`. |
| **`201`** | `Created` | Entity created. | Parse `response.data`. |
| **`400`** | `Bad Request` | Validation failure (schema mismatch). | Display field validation errors. |
| **`401`** | `Unauthorized` | Invalid or expired token. | Redirect to Doctor Login screen. |
| **`403`** | `Forbidden` | Role violation (non-doctor attempting clinical action). | Display permission denied alert. |
| **`404`** | `Not Found` | Entity does not exist or belongs to another clinic. | Refresh local list or notify user. |
| **`500`** | `Server Error` | Internal exception. | Prompt user to retry. |
