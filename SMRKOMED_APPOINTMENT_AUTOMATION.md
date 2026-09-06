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
| **TRIGGER** | `TRIGGER` | Initiates flow on inbound WhatsApp event or keyword intent | `triggerType: "INCOMING_WHATSAPP"` |
| **AI** | `DETECT_INTENT` | Classifies patient intent (booking, reschedule, cancel) | Strict heuristic + fallback allowlist |
| **AI** | `EXTRACT_PREFERENCES` | Parses natural language date/time/doctor choices | Heuristic date/time window parser |
| **MESSAGES** | `SEND_TEXT` | Sends personalized copy with variable interpolation | Text body, safe variable tags (`{{patient.name}}`, etc.) |
| **MESSAGES** | `SEND_BUTTONS` | Dispatches native WhatsApp quick-reply buttons (up to 3) | Body text, button titles, target node mapping |
| **MESSAGES** | `SEND_LIST` | Dispatches native WhatsApp interactive list bottom-sheet (up to 10 items) | Header, body, button title, dynamic doctor/slot rows |
| **MESSAGES** | `SEND_DOCTOR_CARD` | Formatted doctor profile card with photo, bio, languages & CTA | Doctor selector, header, CTA buttons |
| **APPOINTMENT** | `GET_DOCTORS` | Fetches active clinic providers with medical photos | Specialty filter, branch scoping |
| **APPOINTMENT** | `GET_DOCTOR_DETAILS`| Loads rich doctor profile (specialty, experience, clinic) | Formatting template |
| **APPOINTMENT** | `GET_AVAILABLE_DATES`| Queries real upcoming schedule dates with open slots | Search window (e.g. 7-14 days) |
| **APPOINTMENT** | `GET_AVAILABLE_SLOTS`| Queries authoritative slots segmented by morning/afternoon | Selected doctor ID, selected calendar date |
| **APPOINTMENT** | `BOOKING_SUMMARY` | Formats preview card with doctor, date, time, location | Copy template |
| **APPOINTMENT** | `BOOK_APPOINTMENT` | Revalidates slot in DB, executes transactional booking | Idempotency key, CareTask trigger |
| **CARE LOOP** | `CREATE_TASK` | Generates or updates associated patient CareTask | Task category, priority, due date |
| **HUMAN** | `HUMAN_HANDOFF` | Escalates to clinic staff inbox when patient asks or slots fail | Escalation reason, staff notification |
| **LOGIC** | `CONDITION` | Evaluates branching rules | Variable operators (`equals`, `truthy`, `falsy`) |
| **LOGIC** | `WAIT_FOR_REPLY` | Pauses flow execution in DB until patient responds | Timeout duration, allowed reply types |
| **CONTROL** | `END` | Terminates workflow execution | Exit message, terminal status |

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

## 6. Flow Lifecycle Management & Cleanup

1. **Flow List Operations**:
   - `Create Flow`: Starter templates (Appointment Booking recommended with 17-node graph, Follow-up, Escalation, Blank).
   - `Edit Flow`: Opens the 3-column node builder.
   - `Duplicate`: Duplicates flow definition as an independent draft.
   - `Activate / Pause`: Sets flow status to `ACTIVE` or `PAUSED`.
   - `Archive`: Soft-deletes flow to `ARCHIVED`.
   - `Delete`: Permanent deletion via `DELETE /flows/:id` with confirmation modal.
     - **Active flow protection**: An active flow cannot be permanently deleted; it must be paused or archived first.
     - **Execution history protection**: If a flow has recorded execution steps, the system automatically transitions it to `ARCHIVED` to preserve audit records.
2. **Canonical Main Flow**:
   - Every clinic is pre-seeded with the canonical **Appointment Booking — WhatsApp** flow.

---

## 7. Dual Test Modes: Phone Simulator & Live WhatsApp

The builder provides two distinct testing workflows:

### Mode A: Phone Simulator
- In-browser interactive WhatsApp phone mockup.
- Interactive quick-reply buttons, interactive list bottom-sheet picker, and message input.
- Real-time step highlighting synchronized with the React Flow canvas.
- Safe testing without consuming Meta API messaging credits or sending live messages.

### Mode B: Live WhatsApp Testing
- Dispatches actual native WhatsApp interactive messages via Meta Cloud API.
- Recipient picker: Select from active clinic patients or input a designated clinic test phone number.
- Masked phone number preview (`+91 ••••••7328`).
- Safety confirmation modal requiring explicit user confirmation before dispatching.
- Connects through `POST /api/v1/whatsapp-automation/flows/:id/test` with `mode: "LIVE_WHATSAPP"`.
- Validates Meta credentials (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`) and presents clear actionable error messages if unconfigured.

---

## 8. Verification Summary

| Stage | Status | Notes |
|---|---|---|
| **Code Verification** | **CODE VERIFIED** | TypeScript clean compile on both API (`apps/api/tsconfig.json`) and Web (`apps/web/tsconfig.json`). |
| **Automated Tests** | **AUTOMATED TEST VERIFIED** | 22/22 unit tests passing in `whatsapp-automation.test.ts`; 7/7 integration tests passing in `appointment-booking.test.ts`. |
| **Simulator Verification** | **SIMULATOR VERIFIED** | Interactive multi-turn booking journey tested in `WhatsAppPhoneSimulator`. |
| **Live WhatsApp Testing** | **LIVE WHATSAPP READY** | Requires clinic test device number and Meta Cloud API credentials in target deployment. |
| **Production E2E** | **PENDING LIVE CLINIC PROVISIONING** | Pending end-to-end verification through registered WhatsApp test number. |
