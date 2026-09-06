import assert from "node:assert/strict";
import { test } from "node:test";

import { extractInboundMessage } from "../../../integrations/providers/whatsapp/webhook";
import {
  resolveClinicDoctors,
  interpolateVariables,
  groupAvailableDates,
  segmentSlots,
  extractAppointmentPreferences,
} from "../appointment-nodes";
import { classifyPatientIntent } from "../../whatsapp-ai/intent";
import { parseDefinition, validateFlowDefinition } from "../validate";
import { LIBRARY_FLOWS } from "../library";

test("extractInboundMessage parses WhatsApp interactive button replies into machine IDs", () => {
  const metaWebhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "wamid_btn_test_123",
                  type: "interactive",
                  interactive: {
                    type: "button_reply" as const,
                    button_reply: {
                      id: "appt_doctor_doc_ananya",
                      title: "Dr. Ananya Rao",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const parsed = extractInboundMessage(JSON.stringify(metaWebhookPayload), "wamid_btn_test_123");
  assert.ok(parsed, "Expected parsed inbound message");
  assert.equal(parsed!.type, "interactive");
  assert.equal(parsed!.text, "appt_doctor_doc_ananya");
  assert.equal(parsed!.interactive?.id, "appt_doctor_doc_ananya");
  assert.equal(parsed!.interactive?.title, "Dr. Ananya Rao");
});

test("extractInboundMessage parses WhatsApp interactive list replies into machine IDs", () => {
  const metaWebhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "wamid_list_test_456",
                  type: "interactive",
                  interactive: {
                    type: "list_reply" as const,
                    list_reply: {
                      id: "appt_slot_s_1757235600000_30_Dr%20Ananya_Consultation",
                      title: "10:00 AM",
                      description: "Available consultation slot",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const parsed = extractInboundMessage(JSON.stringify(metaWebhookPayload), "wamid_list_test_456");
  assert.ok(parsed, "Expected parsed inbound message");
  assert.equal(parsed!.type, "interactive");
  assert.equal(parsed!.text, "appt_slot_s_1757235600000_30_Dr%20Ananya_Consultation");
  assert.equal(parsed!.interactive?.title, "10:00 AM");
  assert.equal(parsed!.interactive?.description, "Available consultation slot");
});

test("doctor roster resolver returns active doctors with medical-safe photos", async () => {
  const doctors = await resolveClinicDoctors("test_clinic_id");
  assert.ok(doctors.length > 0, "Expected at least 1 doctor");
  assert.ok(doctors[0]!.name.includes("Dr."));
  assert.ok(doctors[0]!.specialty);
  assert.ok(doctors[0]!.photoUrl?.startsWith("https://"));
});

test("intent classifier captures natural appointment requests preventing generic LLM fallback", () => {
  const queries = [
    "I want an appointment",
    "book doctor",
    "available doctors",
    "show doctors",
    "appointments",
    "can I see a doctor",
    "I need to reschedule",
    "cancel booking",
  ];

  for (const q of queries) {
    const result = classifyPatientIntent(q);
    assert.ok(
      result.intent.startsWith("APPOINTMENT_"),
      `Query "${q}" should classify as appointment intent, got: ${result.intent}`,
    );
  }
});

test("appointment default library flow definition validates cleanly with no cycle errors", () => {
  const flow = LIBRARY_FLOWS.find((f) => f.libraryKey === "appointment_booking_whatsapp");
  assert.ok(flow);

  const parsed = parseDefinition(flow!.definition);
  const issues = validateFlowDefinition(parsed);
  assert.equal(issues.length, 0, `Issues found: ${JSON.stringify(issues)}`);
});
