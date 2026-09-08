# SmrkoMed — Appointment Booking Flow
> V1 blueprint for AI-powered appointment booking through WhatsApp and AI Call.
> This document is a product/UX and workflow blueprint for SmrkoMed V1 appointment booking. Rescheduling, cancellation, payments and advanced Care Loop workflows can plug into the same state-machine architecture later.

---

## 1. Core Principle

One appointment state machine, two channels. WhatsApp and AI Call use the same backend booking logic; only the interaction method changes.

| Stage | Next |
|---|---|
| **Appointment request** | Choose WhatsApp or Call |
| **Identify patient** | Existing or New |
| **Register if new** | Minimum patient + partner details |
| **Branch if needed** | Appointment type if needed |
| **Select doctor** | View doctor profile |
| **See slots** | Date → Time |
| **Re-check slot** | Final confirmation |
| **Confirm** | Create appointment |
| **Success** | Confirmation + reminders / Care Loop |

---

## 2. WhatsApp Appointment Flow

1. **Appointment intent** — User chooses Book an Appointment.
2. **Channel choice** — WhatsApp continues in chat; Call creates an AI callback.
3. **Identify patient** — Use WhatsApp number to search first; ask whether the user is already registered.
4. **Existing patient** — Show matched profile and confirm identity. If mismatch, search again or register.
5. **New patient** — Collect full name, mobile, DOB/age, gender; email/address if required; partner details when relevant.
6. **Consent** — Capture consent for registration and appointment communication.
7. **Branch** — Ask only when multiple branches or appointment rules require it.
8. **Appointment type** — Ask only when multiple appointment types exist.
9. **Doctor** — Show doctor list. Selecting one opens image, experience and specialization.
10. **Doctor action** — Offer See Slots or Choose Another Doctor.
11. **Date** — Show available dates; support natural-language dates.
12. **Time** — Show available slots.
13. **Live slot check** — Re-check availability immediately before booking.
14. **Confirmation** — Show patient, partner, doctor, clinic, date, time and appointment type.
15. **Book** — Create appointment transactionally and generate appointment ID.
16. **Success** — Send confirmation and trigger reminders/Care Loop if configured.

---

## 3. AI Call Appointment Flow

1. **Appointment intent** — Confirm the caller wants to book.
2. **Patient identification** — Use incoming phone number first; confirm existing profile.
3. **New registration** — Collect the same minimum details; don't repeat known information.
4. **Consent** — Confirm registration and appointment communication consent.
5. **Branch / type** — Ask only if required.
6. **Doctor** — Read available doctors and concise profile information.
7. **Date** — Accept natural speech such as tomorrow, Friday or next week.
8. **Time** — Read slots and accept natural-language selection.
9. **Live slot check** — Re-check immediately before booking.
10. **Confirmation** — Read complete summary and obtain explicit confirmation.
11. **Book** — Create appointment only after successful backend booking.
12. **Success** — Read confirmation and optionally send WhatsApp/SMS confirmation.

---

## 4. Bad Scenarios & Recovery

| Scenario | Expected behaviour |
|---|---|
| **Back** | Return to previous completed step. |
| **Start again** | Reset only temporary booking state; never delete patient data. |
| **Change doctor/date/time** | Return to that step and preserve other valid selections. |
| **Unrelated question** | Answer if supported, preserve booking state, then offer to continue. |
| **Human request** | Handoff to care coordinator with patient + booking context. |
| **Doctor unavailable** | Offer next available, another doctor, branch or coordinator. |
| **No slots** | Offer another date, doctor, branch or coordinator. |
| **Slot taken** | Never confirm; refresh availability and show alternatives. |
| **Booking API failure** | Never say confirmed; offer retry/alternatives. |
| **Duplicate confirm/webhook** | Use idempotency so only one appointment is created. |
| **Existing appointment** | Avoid accidental duplicate; offer relevant next action. |
| **Call disconnects** | Persist state and resume on callback/continuation. |
| **Silence** | WhatsApp: sensible reminder then pause. Call: reprompt then end politely. |
| **Payment failure (if required)** | Do not confirm; offer retry/cancel. |
| **Invalid date/time** | Clarify and return to relevant step. |
| **Wrong patient match** | Do not overwrite; search again or register new profile. |

---

## 5. Fertility-Specific Registration

| Data | V1 approach |
|---|---|
| **Patient name** | Required for a new patient |
| **Patient mobile** | Use WhatsApp/caller number; ask for another only if needed |
| **DOB / age** | Collect if required by clinic |
| **Gender** | Collect if required by clinic |
| **Partner name** | Collect for couple/fertility booking |
| **Partner mobile** | Collect when relevant |
| **Email / address** | Optional or clinic-dependent |
| **Medical history** | Don't make it a booking blocker; collect later during consultation/care |

---

## 6. Recommended Booking State Machine

### State Machine States
1. `IDENTIFY_PATIENT`
2. `REGISTER_PATIENT`
3. `SELECT_BRANCH`
4. `SELECT_APPOINTMENT_TYPE`
5. `SELECT_DOCTOR`
6. `VIEW_DOCTOR`
7. `SELECT_DATE`
8. `SELECT_SLOT`
9. `REVALIDATE_SLOT`
10. `CONFIRMATION`
11. `BOOKING`
12. `COMPLETED`
13. `HANDOFF`
14. `PAUSED`

### Suggested booking-session fields

| Field | Purpose |
|---|---|
| `channel` | `WHATSAPP` or `CALL` |
| `patientId` | Existing/new patient reference |
| `partnerId` | Fertility/couple context when applicable |
| `clinicId` / `branchId` | Appointment location |
| `appointmentType` | Consultation type |
| `doctorId` | Selected doctor |
| `selectedDate` | Requested date |
| `selectedSlot` | Requested time |
| `currentStep` | Current booking state |
| `status` | Active / paused / completed / handed off |
| `expiresAt` | Prevent stale booking sessions |

---

## 7. Critical V1 Rules

- **Channel Identity**: Don't ask WhatsApp users for their WhatsApp number again; use the channel identity.
- **Minimal Medical Info**: Don't collect unnecessary medical history just to book.
- **Ground Truth**: Never guess doctor information, availability, pricing or clinic details.
- **Revalidation**: Always re-check slot availability immediately before creating the appointment.
- **Transaction Safety**: Never say confirmed until the backend booking succeeds.
- **Idempotency**: Use idempotency to prevent duplicate appointments.
- **State Preservation**: Preserve booking state when users ask questions or change one selection.
- **Navigation Controls**: Support Back, Change, Start Again and Human Handoff at appropriate stages.
- **Security & Multi-Tenancy**: Keep authentication, tenant isolation and permissions intact.

---

## 8. V1 Golden Path

```
Appointment
   └── Channel
        └── Identify patient
             └── Register if new
                  └── Branch if needed
                       └── Appointment type if needed
                            └── Doctor
                                 └── Doctor profile
                                      └── See Slots
                                           └── Date
                                                └── Time
                                                     └── Live slot validation
                                                          └── Confirmation
                                                               └── Book
                                                                    └── Appointment ID
                                                                         └── Confirmation
                                                                              └── Care Loop / reminders
```
