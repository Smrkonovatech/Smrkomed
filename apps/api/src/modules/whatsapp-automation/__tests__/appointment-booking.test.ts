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

test("updateFlowSchema validates full appointment booking flow with visual builder node types", async () => {
  const { updateFlowSchema } = await import("../schemas");

  const appointmentFlowDef = {
    nodes: [
      { id: "n_trigger", type: "TRIGGER", label: "Patient Message", config: { triggerType: "INCOMING_WHATSAPP" }, position: { x: 250, y: 30 } },
      { id: "n_detect", type: "DETECT_INTENT", label: "Detect Intent", config: {}, position: { x: 250, y: 130 } },
      { id: "n_welcome", type: "SEND_TEXT", label: "Welcome", config: { body: "Welcome!" }, position: { x: 250, y: 230 } },
      { id: "n_get_docs", type: "GET_DOCTORS", label: "Get Doctors", config: {}, position: { x: 250, y: 330 } },
      { id: "n_list_docs", type: "SEND_LIST", label: "Doctor List", config: { body: "Select doctor", buttonText: "Doctors", dataSource: "doctors", waitForReply: true }, position: { x: 250, y: 430 } },
      { id: "n_doc_card", type: "SEND_DOCTOR_CARD", label: "Doctor Profile", config: { doctorId: "doc_1", waitForReply: true }, position: { x: 250, y: 530 } },
      { id: "n_get_dates", type: "GET_AVAILABLE_DATES", label: "Get Dates", config: { daysAhead: 7 }, position: { x: 250, y: 630 } },
      { id: "n_get_slots", type: "GET_AVAILABLE_SLOTS", label: "Get Slots", config: {}, position: { x: 250, y: 730 } },
      { id: "n_buttons", type: "SEND_BUTTONS", label: "Buttons", config: { body: "Choose slot", buttons: [{ id: "b1", title: "10 AM" }], waitForReply: true }, position: { x: 250, y: 830 } },
      { id: "n_wait_reply", type: "WAIT_FOR_REPLY", label: "Wait for Reply", config: { timeoutHours: 24 }, position: { x: 250, y: 930 } },
      { id: "n_summary", type: "BOOKING_SUMMARY", label: "Booking Summary", config: {}, position: { x: 250, y: 1030 } },
      { id: "n_book", type: "BOOK_APPOINTMENT", label: "Book Appointment", config: {}, position: { x: 250, y: 1130 } },
      { id: "n_task", type: "CREATE_CARE_TASK", label: "Create Care Task", config: { title: "Follow-up" }, position: { x: 250, y: 1230 } },
      { id: "n_handoff", type: "HUMAN_HANDOFF", label: "Human Handoff", config: { reason: "Assistance" }, position: { x: 250, y: 1330 } },
      { id: "n_end", type: "END", label: "End Flow", config: {}, position: { x: 250, y: 1430 } },
    ],
    edges: [
      { id: "e1", source: "n_trigger", target: "n_detect" },
      { id: "e2", source: "n_detect", target: "n_welcome" },
      { id: "e3", source: "n_welcome", target: "n_get_docs" },
      { id: "e4", source: "n_get_docs", target: "n_list_docs" },
      { id: "e5", source: "n_list_docs", target: "n_doc_card" },
      { id: "e6", source: "n_doc_card", target: "n_get_dates" },
      { id: "e7", source: "n_get_dates", target: "n_get_slots" },
      { id: "e8", source: "n_get_slots", target: "n_buttons" },
      { id: "e9", source: "n_buttons", target: "n_wait_reply" },
      { id: "e10", source: "n_wait_reply", target: "n_summary" },
      { id: "e11", source: "n_summary", target: "n_book" },
      { id: "e12", source: "n_book", target: "n_task" },
      { id: "e13", source: "n_task", target: "n_handoff" },
      { id: "e14", source: "n_handoff", target: "n_end" },
    ],
  };

  const parsed = updateFlowSchema.safeParse({
    name: "Appointment Booking Flow",
    definition: appointmentFlowDef,
  });

  assert.ok(parsed.success, `Expected updateFlowSchema to succeed, error: ${JSON.stringify(parsed.error?.flatten())}`);
  assert.equal(parsed.data.name, "Appointment Booking Flow");
  assert.equal(parsed.data.definition?.nodes.length, 15);
  assert.equal(parsed.data.definition?.edges.length, 14);
});

test("updateFlowSchema permits draft flows with incomplete / unconfigured nodes and ReactFlow metadata", async () => {
  const { updateFlowSchema } = await import("../schemas");

  const draftDefWithIncompleteNodes = {
    nodes: [
      { id: "node_1", type: "SEND_TEXT", label: "", config: {}, position: { x: 10, y: 20 }, selected: true, dragging: false },
      { id: "node_2", type: "GET_DOCTORS", label: "Get Doctors", config: null, positionX: 50, positionY: 100 },
      { id: "node_3", type: "SEND_DOCTOR_CARD", label: "Doctor Card" },
    ],
    edges: [
      { id: "e_1_2", source: "node_1", target: "node_2", sourceHandle: "yes", targetHandle: "in", label: "YES", style: { strokeWidth: 2 } },
    ],
  };

  const parsed = updateFlowSchema.safeParse({
    name: "Draft Flow In Progress",
    description: null,
    definition: draftDefWithIncompleteNodes,
  });

  assert.ok(parsed.success, `Draft with incomplete nodes should parse, error: ${JSON.stringify(parsed.error?.flatten())}`);
  assert.equal(parsed.data.definition?.nodes[0]?.config && typeof parsed.data.definition.nodes[0].config, "object");
  assert.equal(parsed.data.definition?.nodes[1]?.config && typeof parsed.data.definition.nodes[1].config, "object");
});

test("updateFlowSchema allows partial updates without definition (e.g. rename only)", async () => {
  const { updateFlowSchema } = await import("../schemas");

  const renameOnly = updateFlowSchema.safeParse({
    name: "Renamed Flow",
  });
  assert.ok(renameOnly.success);
  assert.equal(renameOnly.data.name, "Renamed Flow");
  assert.equal(renameOnly.data.definition, undefined);
});



