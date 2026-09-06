# SmrkoMed WhatsApp Appointment Booking Automation

## 1. Executive Summary

This document describes the production implementation of SmrkoMed's first real, editable, node-based automation: **WhatsApp Appointment Booking**.

The system enables clinic administrators to visually inspect, edit, configure, reconnect, test, and publish node-based WhatsApp appointment flows, backed by SmrkoMed's existing:
- Meta WhatsApp Cloud API integration (`apps/api/src/integrations/providers/whatsapp/`)
- Authoritative appointment availability & booking engine (`apps/api/src/modules/appointments/`)
- NLU intent classifier & preference extractor (`apps/api/src/modules/whatsapp-ai/`)
- Care Loop task tracking (`apps/api/src/modules/care/`)
- Realtime event broadcasting (`apps/api/src/modules/realtime/`)
- Clinic multi-tenancy, RBAC, and audit logging.

---

## 2. Architectural Principles & Separation of Concerns

```
                           SMRKOMED AUTOMATION
                                    |
                           Appointment Flow
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
      Workflow Logic          AI Interpreter             WhatsApp
      (Engine State)         (NLU / Intent)         (Interactive UI)
            |                       |                       |
            ↓                       ↓                       ↓
    Appointment Engine       Preferences/Slot       Native Buttons/Lists
 (Authoritative DB Truth)       Extraction              Card Payloads
            |
            ↓
    Prisma / Postgres
```

1. **Automation Engine owns the WORKFLOW**: Manages node state machines, edges, branching, conditions, and persistent execution state.
2. **Appointment Engine owns the TRUTH**: Retrieves real clinic doctors, active schedules, working hours, validated slots, and executes transactional booking with concurrency checks.
3. **WhatsApp owns the CHANNEL**: Delivers native interactive buttons and interactive lists within the 24-hour service window. All WhatsApp access tokens remain strictly server-side.
4. **AI owns the NLU**: Converts unstructured patient phrases into structured parameters (`preferredDate`, `preferredTimeRange`, `doctorPreference`). **The LLM NEVER directly mutates appointments or invents slots/availability.**

---

## 3. Node Types

The appointment automation uses the following node types:

| Category | Node Type | Purpose | Configuration Options |
|---|---|---|---|
| **TRIGGER** | `TRIGGER` | Initiates flow on inbound WhatsApp event or keyword intent | `triggerType: "INBOUND_MESSAGE"` |
| **AI** | `DETECT_INTENT` | Classifies patient intent (booking, reschedule, cancel) | Strict heuristic + fallback allowlist |
| **AI** | `EXTRACT_PREFERENCES` | Parses natural language date/time/doctor choices | Heuristic date/time window parser |
| **COMMUNICATION** | `SEND_TEXT` | Sends personalized copy with variable interpolation | Text body, safe variable tags (`{{patient.name}}`, etc.) |
| **COMMUNICATION** | `SEND_BUTTONS` | Dispatches native WhatsApp quick-reply buttons (up to 3) | Body text, button titles, target node mapping |
| **COMMUNICATION** | `SEND_LIST` | Dispatches native WhatsApp interactive list bottom-sheet (up to 10 items) | Header, body, button title, dynamic doctor/slot rows |
| **APPOINTMENT** | `GET_DOCTORS` | Fetches active clinic providers with medical photos | Specialty filter, branch scoping |
| **APPOINTMENT** | `GET_DOCTOR_DETAILS`| Loads rich doctor profile (specialty, experience, clinic) | Formatting template |
| **APPOINTMENT** | `GET_AVAILABLE_DATES`| Queries real upcoming schedule dates with open slots | Search window (e.g. 7-14 days) |
| **APPOINTMENT** | `GET_AVAILABLE_SLOTS`| Queries authoritative slots segmented by morning/afternoon | Selected doctor ID, selected calendar date |
| **APPOINTMENT** | `BOOKING_SUMMARY` | Formats preview card with doctor, date, time, location | Copy template |
| **APPOINTMENT** | `BOOK_APPOINTMENT` | Revalidates slot in DB, executes transactional booking | Idempotency key, CareTask trigger |
| **CARE LOOP** | `CREATE_TASK` | Generates or updates associated patient CareTask | Task category, priority, due date |
| **HUMAN** | `HUMAN_HANDOFF` | Escalates to clinic staff inbox when patient asks or slots fail | Escalation reason, staff notification |
| **LOGIC** | `CONDITION` | Evaluates branching rules | Variable operators (`equals`, `contains`, etc.) |
| **LOGIC** | `WAIT_FOR_REPLY` | Pauses flow execution in DB until patient responds | Timeout duration, allowed reply types |
| **LOGIC** | `END` | Terminates workflow execution | Exit message, terminal status |

---

## 4. Execution Lifecycle & Persistent Wait State

Executions NEVER rely on server in-memory timers or process state:

1. **Inbound Message Arrives**: Meta Webhook delivers inbound message to `apps/api/src/integrations/providers/whatsapp/webhook.ts`.
2. **Interactive Payload Normalization**: `extractInboundMessage` extracts button IDs or list row IDs into machine-readable format (`appt_doctor_<id>`, `appt_date_<date>`, `appt_slot_<id>`, `appt_confirm`, `appt_cancel`).
3. **Wait-State Resolution**: `resumeWaitForReplyExecutions` inspects the clinic DB for executions paused at `WAIT_FOR_REPLY` for this patient/conversation.
4. **Version Pinning (`definitionSnapshot`)**: When an execution starts, its complete `FlowDefinition` is snapshot into `execution.context.definitionSnapshot`. Even if clinic administrators edit or publish flow v2 or v3, in-flight bookings continue deterministically on v1.
5. **Node Execution Cycle**: The engine runs synchronous nodes in a loop, records step outputs into execution context, and pauses immediately upon encountering `WAIT_FOR_REPLY`.

---

## 5. WhatsApp Interactive Message Abstraction

Raw Meta Graph API payloads are encapsulated in `apps/api/src/integrations/providers/whatsapp/graph.ts` and `messaging.ts`:

- `sendWhatsAppInteractiveButtons({ tenant, recipientPhone, bodyText, buttons, headerText, footerText })`: Formats Meta `interactive.type = "button"`.
- `sendWhatsAppInteractiveList({ tenant, recipientPhone, bodyText, buttonText, sections, headerText, footerText })`: Formats Meta `interactive.type = "list"`.

### Button & List ID Convention
Stable, validated machine IDs:
- `appt_doctor_<doctorId>`
- `appt_doctor_profile_<doctorId>`
- `appt_date_<YYYY-MM-DD>`
- `appt_slot_<slotId>`
- `appt_confirm`
- `appt_cancel`
- `appt_reschedule`
- `appt_handoff`

All IDs are validated against tenant clinic boundaries before processing.

---

## 6. Authoritative Slot Revalidation & Idempotency

1. **Slot Presentation**: Slots retrieved by `getAvailableAppointmentSlots` are assigned encoded identifiers incorporating doctor, date, start time, and duration.
2. **Pre-Booking Revalidation**: Before invoking `bookAppointmentFromSlot`, `engine.ts` executes `validateSlotStillAvailable`. If another patient booked the slot in the interim, the flow transitions to the `UNAVAILABLE` branch and presents fresh slots.
3. **Idempotency**: All booking requests pass clinic-scoped idempotency keys (`appt_booking_<clinicId>_<patientId>_<slotId>`). Duplicate webhook retries from Meta will never generate duplicate appointments.

---

## 7. Natural Language & Intent Precedence (Bug Fix)

Previously, messages like *"Show available slots next Monday"* or *"Can I see a doctor"* could be intercepted by generic AI chatbot fallbacks that replied *"I don't have published slots..."*.

The pipeline now enforces strict precedence:
1. `resumeWaitForReplyExecutions` executes before AI dispatch.
2. `classifyPatientIntent` checks for appointment keywords first (`book`, `doctor`, `slots`, `appointment`, `reschedule`, `cancel`).
3. If appointment intent is detected, it enters the deterministic appointment flow rather than the general LLM knowledge pipeline.

---

## 8. Visual Editor & Live Phone Simulator

1. **Visual Canvas** (`apps/web/src/components/whatsapp/flow-canvas.tsx`):
   - Categorized node palette with drag-and-drop.
   - Interactive zoom, pan, mini-map, and auto-layout.
   - Color-coded badges and icons for Trigger, AI, Communication, Appointment, Care Loop, Logic, and Human nodes.
2. **Node Inspector** (`apps/web/src/app/(dashboard)/whatsapp/flows/[id]/page.tsx`):
   - Detailed inspection forms for button configurations, list sections, doctor rosters, date queries, and booking triggers.
   - Variable substitution guide (`{{patient.name}}`, `{{doctor.name}}`, etc.).
3. **Live WhatsApp Phone Simulator** (`apps/web/src/components/whatsapp/whatsapp-phone-simulator.tsx`):
   - Native WhatsApp mobile frame with clinic header, verified badge, and chat bubbles.
   - Real interactive buttons and interactive list bottom-sheet picker.
   - Step-by-step synchronization highlighting the active node on the canvas.
   - Multi-turn testing for the entire booking journey from trigger to booking confirmation without risking production data or sending live WhatsApp messages.

---

## 9. Verification Summary

| Stage | Status | Notes |
|---|---|---|
| **Code Verification** | **CODE VERIFIED** | TypeScript clean compile on both API (`apps/api/tsconfig.json`) and Web (`apps/web/tsconfig.json`). |
| **Automated Tests** | **AUTOMATED TEST VERIFIED** | 22/22 unit tests passing in `whatsapp-automation.test.ts`; 5/5 integration tests passing in `appointment-booking.test.ts`. |
| **Production E2E** | **PENDING LIVE CLINIC PROVISIONING** | Requires live Meta Cloud API phone number and verified clinic webhook token in target production environment. |
