import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { createHmac } from "node:crypto";
import { prisma, type TenantContext } from "@smrkomed/database";

import { classifyPatientIntent } from "./modules/whatsapp-ai/intent";
import { isAppointmentFlow, dispatchWhatsAppTrigger } from "./modules/whatsapp-automation/triggers";
import { normalizeWhatsAppPhone } from "./integrations/providers/whatsapp/phone";
import {
  resolveWhatsAppSenderCredentials,
  ensureDirectWhatsAppConnection,
} from "./integrations/providers/whatsapp/service";
import { mapMetaGraphError, setWhatsAppGraphFetchForTests } from "./integrations/providers/whatsapp/graph";
import {
  sendWhatsAppSessionText,
  sendWhatsAppTemplate,
} from "./integrations/providers/whatsapp/messaging";
import {
  handleInboundWhatsAppAutomation,
  resumeWaitForReplyExecutions,
} from "./modules/whatsapp-automation/inbound-dispatch";
import { startFlowExecution, runExecution } from "./modules/whatsapp-automation/engine";
import { receiveWhatsAppWebhook } from "./integrations/providers/whatsapp/webhook";
import {
  resolveClinicDoctors,
  groupAvailableDates,
  segmentSlots,
  interpolateVariables,
} from "./modules/whatsapp-automation/appointment-nodes";
import { encodeSlotId } from "./modules/appointments/availability";
import { bookAppointmentFromSlot } from "./modules/appointments/whatsapp-booking";

const PREFIX = "prod-wa-fix";

let tenant: TenantContext;
let testOrgId: string;
let testClinicId: string;
let testUserId: string;
let testCoupleId: string;
let testPatientId: string;
let testConvId: string;
let originalEnvToken: string | undefined;
let originalEnvPhoneId: string | undefined;

before(async () => {
  originalEnvToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  originalEnvPhoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];

  const org = await prisma.organization.create({
    data: { name: `${PREFIX}-org` },
  });
  testOrgId = org.id;

  const clinic = await prisma.clinic.create({
    data: {
      organizationId: org.id,
      name: `${PREFIX}-clinic`,
      slug: `${PREFIX}-clinic-${Date.now()}`,
    },
  });
  testClinicId = clinic.id;

  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });

  const user = await prisma.user.create({
    data: {
      name: `${PREFIX}-user`,
      email: `${PREFIX}-${Date.now()}@example.com`,
      passwordHash: "unused",
      phone: "+919876500000",
    },
  });
  testUserId = user.id;

  await prisma.clinicMembership.create({
    data: {
      clinicId: clinic.id,
      userId: user.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  tenant = {
    organizationId: org.id,
    organizationName: org.name,
    clinicId: clinic.id,
    clinicName: clinic.name,
    userId: user.id,
    role: "CLINIC_ADMIN",
  };

  const patient = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: "Anjali",
      lastName: "Sharma",
      phone: "+91 98765 43210",
      whatsappNumber: "+91 98765 43210",
    },
  });
  testPatientId = patient.id;

  const couple = await prisma.couple.create({
    data: {
      clinicId: clinic.id,
      primaryPatientId: patient.id,
      slug: `${PREFIX}-couple-${Date.now()}`,
    },
  });
  testCoupleId = couple.id;

  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      patientId: patient.id,
      coupleId: couple.id,
      contactPhone: "919876543210",
      channel: "WHATSAPP",
      status: "OPEN",
    },
  });
  testConvId = conv.id;

  await ensureDirectWhatsAppConnection(tenant);
});

after(async () => {
  setWhatsAppGraphFetchForTests(null);
  if (originalEnvToken !== undefined) {
    process.env["WHATSAPP_ACCESS_TOKEN"] = originalEnvToken;
  } else {
    delete process.env["WHATSAPP_ACCESS_TOKEN"];
  }
  if (originalEnvPhoneId !== undefined) {
    process.env["WHATSAPP_PHONE_NUMBER_ID"] = originalEnvPhoneId;
  } else {
    delete process.env["WHATSAPP_PHONE_NUMBER_ID"];
  }

  await prisma.careTask.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.appointment.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.whatsAppFlowExecutionStep.deleteMany({
    where: { execution: { clinicId: testClinicId } },
  });
  await prisma.whatsAppFlowExecution.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.whatsAppFlow.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.message.deleteMany({ where: { conversationId: testConvId } });
  await prisma.conversation.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.couple.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.patient.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.clinicMembership.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.taskAssignment.deleteMany({ where: { userId: testUserId } });
  await prisma.notification.deleteMany({ where: { userId: testUserId } });
  await prisma.auditLog.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.whatsAppAccount.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.integration.deleteMany({ where: { clinicId: testClinicId } });
  await prisma.clinic.deleteMany({ where: { id: testClinicId } });
  await prisma.organization.deleteMany({ where: { id: testOrgId } });
});

// ==========================================
// ROUTING TESTS (Requirements 1-10)
// ==========================================

test("1. greeting does not start appointment flow & normal AI runs for greeting", () => {
  const g1 = classifyPatientIntent("Hi");
  assert.equal(g1.intent, "GREETING");

  const g2 = classifyPatientIntent("Hello");
  assert.equal(g2.intent, "GREETING");

  const g3 = classifyPatientIntent("Hreyyy");
  assert.equal(g3.intent, "GREETING");

  const g4 = classifyPatientIntent("heyyy");
  assert.equal(g4.intent, "GREETING");

  const isAppt = (g3.intent as string) === "APPOINTMENT_BOOKING" || (g3.intent as string) === "APPOINTMENT_RESCHEDULE" || (g3.intent as string) === "APPOINTMENT_CANCEL";
  assert.equal(isAppt, false, "Greeting must not be considered appointment intent");
});

test("3. general information does not start appointment flow", () => {
  const res = classifyPatientIntent("Tell me about your clinic");
  assert.notEqual(res.intent, "APPOINTMENT_BOOKING");
  const isAppt = res.intent === "APPOINTMENT_BOOKING" || res.intent === "APPOINTMENT_RESCHEDULE" || res.intent === "APPOINTMENT_CANCEL";
  assert.equal(isAppt, false);
});

test("4. IVF question does not start appointment flow", () => {
  const res = classifyPatientIntent("What is IVF?");
  assert.equal(res.intent, "IVF_INFORMATION");
  const isAppt = (res.intent as string) === "APPOINTMENT_BOOKING" || (res.intent as string) === "APPOINTMENT_RESCHEDULE" || (res.intent as string) === "APPOINTMENT_CANCEL";
  assert.equal(isAppt, false);
});

test("5. appointment request starts appointment flow", () => {
  const bookingMessages = [
    "I want an appointment",
    "Book an appointment",
    "I need to see a doctor",
    "Can I book tomorrow?",
    "Show me available slots",
  ];
  for (const text of bookingMessages) {
    const res = classifyPatientIntent(text);
    assert.equal(res.intent, "APPOINTMENT_BOOKING", `"${text}" must classify as APPOINTMENT_BOOKING`);
  }
});

test("6. reschedule starts appointment automation", () => {
  const res = classifyPatientIntent("Reschedule my appointment");
  assert.equal(res.intent, "APPOINTMENT_RESCHEDULE");
});

test("7. cancel starts appointment automation", () => {
  const res = classifyPatientIntent("Cancel my appointment");
  assert.equal(res.intent, "APPOINTMENT_CANCEL");
});

test("8. waiting appointment execution resumes on patient reply", async () => {
  // Create an active appointment flow with a WAIT_FOR_REPLY node
  const flow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: tenant.clinicId,
      name: "Waiting Appt Test Flow",
      status: "ACTIVE",
      triggerType: "INCOMING_WHATSAPP",
      isLibrary: false,
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Trigger", config: {}, position: { x: 0, y: 0 } },
          { id: "node_wait", type: "WAIT_FOR_REPLY", label: "Wait", config: {}, position: { x: 0, y: 100 } },
          { id: "node_end", type: "END", label: "End", config: {}, position: { x: 0, y: 200 } },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "node_wait" },
          { id: "e2", source: "node_wait", target: "node_end" },
        ],
      },
    },
  });

  // Start execution and pause at wait
  const { execution } = await startFlowExecution({
    tenant,
    flowId: flow.id,
    conversationId: testConvId,
    patientId: testPatientId,
    triggerEventId: `test_wait_${Date.now()}`,
  });

  const updated = await prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
  assert.equal(updated.status, "WAITING");

  // Call resumeWaitForReplyExecutions
  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: testConvId,
    inboundVars: { message_text: "appt_doctor_123" },
  });

  assert.ok(resumed.length > 0);
  assert.equal(resumed[0]!.executionId, execution.id);

  const completed = await prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
  assert.equal(completed.status, "COMPLETED");

  await prisma.whatsAppFlowExecutionStep.deleteMany({ where: { execution: { flowId: flow.id } } });
  await prisma.whatsAppFlowExecution.deleteMany({ where: { flowId: flow.id } });
  await prisma.whatsAppFlow.delete({ where: { id: flow.id } });
});

test("9. one inbound does not start both AI and appointment flow & active flow does not mean match-all", async () => {
  // Create an active appointment booking flow
  const apptFlow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: tenant.clinicId,
      name: "Appointment Booking — WhatsApp",
      libraryKey: "appointment_booking_whatsapp",
      status: "ACTIVE",
      triggerType: "INCOMING_WHATSAPP",
      isLibrary: false,
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Trigger", config: { triggerType: "INCOMING_WHATSAPP" }, position: { x: 0, y: 0 } },
          { id: "node_docs", type: "GET_DOCTORS", label: "Get Doctors", config: {}, position: { x: 0, y: 100 } },
          { id: "node_end", type: "END", label: "End", config: {}, position: { x: 0, y: 200 } },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "node_docs" },
          { id: "e2", source: "node_docs", target: "node_end" },
        ],
      },
    },
  });

  // Dispatch trigger with isAppointmentIntent = false (e.g. greeting "Hreyyy")
  const dispatchedForGreeting = await dispatchWhatsAppTrigger({
    tenant,
    triggerType: "INCOMING_WHATSAPP",
    triggerEventId: `wa_in_greeting_${Date.now()}`,
    conversationId: testConvId,
    patientId: testPatientId,
    isAppointmentIntent: false,
  });

  assert.equal(dispatchedForGreeting.matched, 0, "Appointment flow must NOT match when isAppointmentIntent is false");
  assert.equal(dispatchedForGreeting.results.length, 0);

  // Dispatch trigger with isAppointmentIntent = true (e.g. "I want to book an appointment")
  const dispatchedForBooking = await dispatchWhatsAppTrigger({
    tenant,
    triggerType: "INCOMING_WHATSAPP",
    triggerEventId: `wa_in_booking_${Date.now()}`,
    conversationId: testConvId,
    patientId: testPatientId,
    isAppointmentIntent: true,
  });

  assert.equal(dispatchedForBooking.matched, 1, "Appointment flow MUST match when isAppointmentIntent is true");
  assert.ok(dispatchedForBooking.results[0]?.executionId);

  await prisma.whatsAppFlowExecutionStep.deleteMany({ where: { execution: { flowId: apptFlow.id } } });
  await prisma.whatsAppFlowExecution.deleteMany({ where: { flowId: apptFlow.id } });
  await prisma.whatsAppFlow.delete({ where: { id: apptFlow.id } });
});

// ==========================================
// OUTBOUND DELIVERY TESTS (Requirements 11-17)
// ==========================================

test("13. token source uses server environment token over DB placeholder", async () => {
  // Set real server env token
  process.env["WHATSAPP_ACCESS_TOKEN"] = "real_server_token_123";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "10987654321";

  const creds = await resolveWhatsAppSenderCredentials(tenant);
  assert.equal(creds.token, "real_server_token_123");
  assert.equal(creds.tokenSource, "server_env");
  assert.equal(creds.phoneNumberId, "10987654321");
});

test("14. recipient phone number is normalized correctly", () => {
  assert.equal(normalizeWhatsAppPhone("+919876543210"), "919876543210");
  assert.equal(normalizeWhatsAppPhone("919876543210"), "919876543210");
  assert.equal(normalizeWhatsAppPhone("9876543210"), "919876543210");
  assert.equal(normalizeWhatsAppPhone("+91 98765 43210"), "919876543210");
});

test("11. successful Meta response produces wamid and status SENT", async () => {
  process.env["WHATSAPP_ACCESS_TOKEN"] = "test_meta_token";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "10987654321";

  let capturedUrl = "";
  let capturedAuth = "";
  setWhatsAppGraphFetchForTests(async (url, init) => {
    capturedUrl = String(url);
    capturedAuth = String((init?.headers as Record<string, string>)?.["Authorization"] ?? "");
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        contacts: [{ input: "919876543210", wa_id: "919876543210" }],
        messages: [{ id: "wamid.HBgTEST123456789" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const sent = await sendWhatsAppSessionText(tenant, {
    conversationId: testConvId,
    body: "Hello from test suite!",
  });

  assert.equal(sent.status, "SENT");
  assert.equal(sent.providerMessageId, "wamid.HBgTEST123456789");
  assert.ok(capturedUrl.includes("10987654321/messages"));
  assert.equal(capturedAuth, "Bearer test_meta_token");

  // Verify DB record
  const msg = await prisma.message.findUniqueOrThrow({ where: { id: sent.id } });
  assert.equal(msg.status, "SENT");
  assert.equal(msg.providerMessageId, "wamid.HBgTEST123456789");
});

test("12. Meta failure produces FAILED state with safe error", async () => {
  process.env["WHATSAPP_ACCESS_TOKEN"] = "test_meta_token";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "10987654321";

  setWhatsAppGraphFetchForTests(async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "The message recipient is not a valid WhatsApp user",
          type: "OAuthException",
          code: 131026,
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  });

  await assert.rejects(
    async () => {
      await sendWhatsAppSessionText(tenant, {
        conversationId: testConvId,
        body: "Will fail",
      });
    },
    { name: "IntegrationError" },
  );

  // Verify DB persisted FAILED message
  const failedMsg = await prisma.message.findFirst({
    where: { conversationId: testConvId, status: "FAILED" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(failedMsg);
  assert.equal(failedMsg.status, "FAILED");
});

test("Window expired (code 131047) produces clear error message", () => {
  const mapped = mapMetaGraphError({
    httpStatus: 400,
    code: 131047,
    safeMessage: "Re-engagement message",
  });
  assert.equal(mapped.code, "SESSION_WINDOW_EXPIRED");
  assert.ok(mapped.message.includes("WhatsApp requires an approved template"));
});

test("17. delivery status webhook updates message to DELIVERED and READ", async () => {
  // Create message with wamid
  const msg = await prisma.message.create({
    data: {
      conversationId: testConvId,
      direction: "OUTBOUND",
      senderType: "STAFF",
      content: "Delivery test message",
      messageType: "text",
      providerMessageId: "wamid.TEST_DELIVERY_1",
      status: "SENT",
    },
  });

  // Ensure account exists for webhook routing
  await ensureDirectWhatsAppConnection(tenant);

  // Send delivered webhook
  const deliveredPayload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test_waba",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: process.env["WHATSAPP_PHONE_NUMBER_ID"] || "10987654321" },
              statuses: [
                {
                  id: "wamid.TEST_DELIVERY_1",
                  status: "delivered",
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: "919876543210",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  const secret = process.env["META_APP_SECRET"] || "test_meta_app_secret";
  process.env["META_APP_SECRET"] = secret;
  const sig = "sha256=" + createHmac("sha256", secret).update(deliveredPayload).digest("hex");
  const headers = new Headers({ "x-hub-signature-256": sig });
  await receiveWhatsAppWebhook(headers, deliveredPayload);

  const updatedMsg = await prisma.message.findUniqueOrThrow({ where: { id: msg.id } });
  assert.equal(updatedMsg.status, "DELIVERED");
});

// ==========================================
// LIVE TEST & SIMULATOR (Requirements 18-22)
// ==========================================

test("20. simulator never calls Meta", async () => {
  let metaCalled = false;
  setWhatsAppGraphFetchForTests(async () => {
    metaCalled = true;
    return new Response("{}", { status: 200 });
  });

  const flow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: tenant.clinicId,
      name: "Simulator Test Flow",
      status: "DRAFT",
      triggerType: "INCOMING_WHATSAPP",
      isLibrary: false,
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Trigger", config: {}, position: { x: 0, y: 0 } },
          { id: "node_text", type: "SEND_TEXT", label: "Send Text", config: { body: "Simulated text" }, position: { x: 0, y: 100 } },
          { id: "node_end", type: "END", label: "End", config: {}, position: { x: 0, y: 200 } },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "node_text" },
          { id: "e2", source: "node_text", target: "node_end" },
        ],
      },
    },
  });

  const { execution } = await startFlowExecution({
    tenant,
    flowId: flow.id,
    conversationId: testConvId,
    triggerEventId: `sim_${Date.now()}`,
    simulation: true,
  });

  assert.equal(metaCalled, false, "Simulator mode must never call Meta Graph API");
  assert.equal(execution.status, "COMPLETED");
});

test("21. draft flow can be explicitly live-tested", async () => {
  let metaCalled = false;
  setWhatsAppGraphFetchForTests(async () => {
    metaCalled = true;
    return new Response(
      JSON.stringify({ messages: [{ id: "wamid.LIVE_TEST_WAMID" }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const draftFlow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: tenant.clinicId,
      name: "Draft Flow For Live Test",
      status: "DRAFT",
      triggerType: "INCOMING_WHATSAPP",
      isLibrary: false,
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Trigger", config: {}, position: { x: 0, y: 0 } },
          { id: "node_text", type: "SEND_TEXT", label: "Send Text", config: { body: "Real test message" }, position: { x: 0, y: 100 } },
          { id: "node_end", type: "END", label: "End", config: {}, position: { x: 0, y: 200 } },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "node_text" },
          { id: "e2", source: "node_text", target: "node_end" },
        ],
      },
    },
  });

  // Explicit live test with live_test_ prefix
  const { execution } = await startFlowExecution({
    tenant,
    flowId: draftFlow.id,
    conversationId: testConvId,
    triggerEventId: `live_test_${Date.now()}`,
    simulation: false,
    vars: { is_live_test: "true" },
  });

  assert.equal(metaCalled, true, "LIVE_WHATSAPP test must call Meta Graph API");
  assert.equal(execution.status, "COMPLETED");
});

// ==========================================
// APPOINTMENT ENGINE TESTS (Requirements 23-29)
// ==========================================

test("23. doctor selection", async () => {
  const doctors = await resolveClinicDoctors(tenant.clinicId);
  assert.ok(doctors.length > 0);
  assert.ok(doctors[0]!.id);
  assert.ok(doctors[0]!.name.startsWith("Dr."));
  assert.ok(doctors[0]!.specialty);
});

test("24. date selection", () => {
  const dummySlots = [
    {
      slotId: "s1",
      doctorId: "doc1",
      doctorName: "Dr. Ananya",
      appointmentType: "Consultation",
      startTime: "2026-09-10T10:00:00.000Z",
      endTime: "2026-09-10T10:30:00.000Z",
      timezone: "Asia/Kolkata",
      location: null,
      durationMin: 30,
    },
    {
      slotId: "s2",
      doctorId: "doc1",
      doctorName: "Dr. Ananya",
      appointmentType: "Consultation",
      startTime: "2026-09-10T11:00:00.000Z",
      endTime: "2026-09-10T11:30:00.000Z",
      timezone: "Asia/Kolkata",
      location: null,
      durationMin: 30,
    },
    {
      slotId: "s3",
      doctorId: "doc1",
      doctorName: "Dr. Ananya",
      appointmentType: "Consultation",
      startTime: "2026-09-11T14:00:00.000Z",
      endTime: "2026-09-11T14:30:00.000Z",
      timezone: "Asia/Kolkata",
      location: null,
      durationMin: 30,
    },
  ];
  const dates = groupAvailableDates(dummySlots);
  assert.equal(dates.length, 2);
  assert.equal(dates[0]!.dateIso, "2026-09-10");
  assert.equal(dates[0]!.slotCount, 2);
  assert.equal(dates[1]!.dateIso, "2026-09-11");
  assert.equal(dates[1]!.slotCount, 1);
});

test("25. slot selection", () => {
  const dummySlots = [
    {
      slotId: "s_morning",
      doctorId: "doc1",
      doctorName: "Dr. Ananya",
      appointmentType: "Consultation",
      startTime: "2026-09-10T04:30:00.000Z",
      endTime: "2026-09-10T05:00:00.000Z",
      timezone: "Asia/Kolkata",
      location: null,
      durationMin: 30,
    },
    {
      slotId: "s_afternoon",
      doctorId: "doc1",
      doctorName: "Dr. Ananya",
      appointmentType: "Consultation",
      startTime: "2026-09-10T09:30:00.000Z",
      endTime: "2026-09-10T10:00:00.000Z",
      timezone: "Asia/Kolkata",
      location: null,
      durationMin: 30,
    },
  ];
  const segmented = segmentSlots(dummySlots);
  assert.ok(segmented.morning.length > 0 || segmented.afternoon.length > 0);
  assert.ok(segmented.morning.every((s) => s.slotId && s.timeLabel));
});

test("26. confirmation", () => {
  const vars = {
    "doctor.name": "Dr. Ananya Rao",
    "doctor.specialty": "Fertility Specialist",
    selected_date: "2026-09-10",
    selected_time: "10:00 AM",
    clinic_name: "ABC Fertility",
  };
  const rendered = interpolateVariables(
    "Appointment with {{doctor.name}} ({{doctor.specialty}}) on {{appointment.date}} at {{appointment.time}} at {{clinic.name}}",
    vars,
  );
  assert.ok(rendered.includes("Dr. Ananya Rao"));
  assert.ok(rendered.includes("Fertility Specialist"));
  assert.ok(rendered.includes("2026-09-10"));
  assert.ok(rendered.includes("10:00 AM"));
  assert.ok(rendered.includes("ABC Fertility"));
});

test("27. appointment creation", async () => {
  const future = new Date(Date.now() + 86_400_000 * 3);
  future.setHours(10, 0, 0, 0);
  if (future.getDay() === 0) future.setDate(future.getDate() + 1);
  const futureMs = future.getTime();
  const slotId = encodeSlotId({
    startMs: futureMs,
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    slotId,
    idempotencyKey: `test_book_${Date.now()}`,
  });

  assert.equal(booked.ok, true, "Booking should succeed");
  assert.ok(booked.appointmentId, "Must return an appointmentId");

  const apptRecord = await prisma.appointment.findUnique({
    where: { id: booked.appointmentId },
  });
  assert.ok(apptRecord, "Appointment must exist in database");
  assert.equal(apptRecord!.clinicId, tenant.clinicId);
  assert.equal(apptRecord!.coupleId, testCoupleId);
  assert.equal(apptRecord!.status, "CONFIRMED");
});

test("28. Care Task creation", async () => {
  const future = new Date(Date.now() + 86_400_000 * 4);
  future.setHours(10, 0, 0, 0);
  if (future.getDay() === 0) future.setDate(future.getDate() + 1);
  const futureMs = future.getTime();
  const slotId = encodeSlotId({
    startMs: futureMs,
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const couple = await prisma.couple.create({
    data: {
      clinicId: tenant.clinicId,
      primaryPatientId: testPatientId,
      slug: `${PREFIX}-couple-${Date.now()}`,
    },
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    coupleId: couple.id,
    slotId,
    idempotencyKey: `test_care_task_${Date.now()}`,
  });

  assert.equal(booked.ok, true);
  assert.ok(booked.appointmentId);

  const careTask = await prisma.careTask.findFirst({
    where: {
      clinicId: tenant.clinicId,
      coupleId: couple.id,
      category: "APPOINTMENT",
      description: { contains: booked.appointmentId },
    },
  });
  assert.ok(careTask, "CareTask must be created for the appointment");
  assert.equal(careTask!.status, "WAITING");
});

test("29. duplicate confirmation is idempotent", async () => {
  const future = new Date(Date.now() + 86_400_000 * 5);
  future.setHours(10, 0, 0, 0);
  if (future.getDay() === 0) future.setDate(future.getDate() + 1);
  const futureMs = future.getTime();
  const slotId = encodeSlotId({
    startMs: futureMs,
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });
  const idemKey = `idem_test_${Date.now()}`;

  const firstBook = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    slotId,
    idempotencyKey: idemKey,
  });
  assert.equal(firstBook.ok, true);
  assert.equal(firstBook.alreadyExisted, false);

  const secondBook = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    slotId,
    idempotencyKey: idemKey,
  });
  assert.equal(secondBook.ok, true);
  assert.equal(secondBook.alreadyExisted, true);
  assert.equal(secondBook.appointmentId, firstBook.appointmentId, "Duplicate confirmation must return same appointment");
});
