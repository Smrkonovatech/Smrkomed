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

test("SEND_DOCTOR_CARD node type is valid in flow definition", () => {
  const def = {
    nodes: [
      { id: "trigger", type: "TRIGGER" as const, label: "Trigger", config: { triggerType: "INCOMING_WHATSAPP" } },
      { id: "doc_card", type: "SEND_DOCTOR_CARD" as const, label: "Doctor Profile", config: { doctorId: "doc_1" } },
      { id: "end", type: "END" as const, label: "End", config: {} },
    ],
    edges: [
      { id: "e1", source: "trigger", target: "doc_card" },
      { id: "e2", source: "doc_card", target: "end" },
    ],
  };
  const issues = validateFlowDefinition(def);
  const typeErrors = issues.filter((i) => i.code === "INVALID_NODE_TYPE");
  assert.equal(typeErrors.length, 0, "SEND_DOCTOR_CARD should be a valid node type");
});

test("testFlowSchema accepts both SIMULATION and LIVE_WHATSAPP modes and aliases", async () => {
  const { testFlowSchema } = await import("../schemas");

  // Mode 1: Simulator with alias
  const simResult = testFlowSchema.safeParse({
    mode: "SIMULATOR",
    event: "APPOINTMENT_REQUEST",
    patientId: "",
  });
  assert.ok(simResult.success, "SIMULATOR mode should parse successfully");
  assert.equal(simResult.data.mode, "SIMULATION");
  assert.equal(simResult.data.patientId, undefined);
  assert.equal(simResult.data.event, "APPOINTMENT_REQUEST");

  // Mode 2: Live WhatsApp with phoneNumber alias and confirmation
  const liveResult = testFlowSchema.safeParse({
    mode: "LIVE_WHATSAPP",
    phoneNumber: "+91 86607 17328",
    confirmed: true,
    patientId: "pat_test_123",
  });
  assert.ok(liveResult.success, "LIVE_WHATSAPP mode should parse successfully");
  assert.equal(liveResult.data.mode, "LIVE_WHATSAPP");
  assert.equal(liveResult.data.phoneNumber, "+91 86607 17328");
  assert.equal(liveResult.data.confirmed, true);
});

test("normalizeWhatsAppPhone normalizes various Indian phone formats consistently", async () => {
  const { normalizeWhatsAppPhone, maskPhone } = await import(
    "../../../integrations/providers/whatsapp/phone"
  );

  assert.equal(normalizeWhatsAppPhone("+91 8660717328"), "918660717328");
  assert.equal(normalizeWhatsAppPhone("918660717328"), "918660717328");
  assert.equal(normalizeWhatsAppPhone("8660717328"), "918660717328");
  assert.equal(normalizeWhatsAppPhone("08660717328"), "918660717328");

  // Masked phone format
  const masked = maskPhone("918660717328");
  assert.equal(masked, "+91••••••7328");
});


