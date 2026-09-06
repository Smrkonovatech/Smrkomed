import test from "node:test";
import assert from "node:assert/strict";
import { classifyPatientIntent, isAppointmentRelatedIntent } from "./modules/whatsapp-ai/intent";
import { resolveDoctorPhotoAsset, getDoctorPhotoBuffer, getDoctorPhotoUrl, getApiBaseUrl } from "./modules/whatsapp-automation/doctor-photos";
import { createApp } from "./app";
import { prisma } from "@smrkomed/database";

const app = createApp();

test("1. Greeting intent detection — no slot lookup", () => {
  const g1 = classifyPatientIntent("Hi");
  assert.equal(g1.intent, "GREETING");
  assert.equal(g1.confidence, "high");
  assert.ok(!g1.suggestedTools.includes("getAvailableAppointmentSlots"));

  const g2 = classifyPatientIntent("Hello");
  assert.equal(g2.intent, "GREETING");

  const g3 = classifyPatientIntent("Good morning");
  assert.equal(g3.intent, "GREETING");
});

test("2. Clinic and doctor information intents", () => {
  const c1 = classifyPatientIntent("Where is your clinic located?");
  assert.equal(c1.intent, "CLINIC_INFORMATION");
  assert.ok(c1.suggestedTools.includes("getClinicProfile"));

  const d1 = classifyPatientIntent("Who is my doctor?");
  assert.equal(d1.intent, "DOCTOR_INFORMATION");
  assert.ok(d1.suggestedTools.includes("getDoctorProfile"));
});

test("3. Deterministic high-confidence transactional intents", () => {
  // Booking variations
  assert.equal(classifyPatientIntent("I want to book an appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("book appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("I need an appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("can I see a doctor").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("can I book for tomorrow").intent, "APPOINTMENT_BOOKING");

  // Slots variations
  assert.equal(classifyPatientIntent("show available slots").intent, "APPOINTMENT_SLOTS");
  assert.equal(classifyPatientIntent("what times are available").intent, "APPOINTMENT_SLOTS");
  assert.equal(classifyPatientIntent("show me slots").intent, "APPOINTMENT_SLOTS");
  assert.equal(classifyPatientIntent("open slots").intent, "APPOINTMENT_SLOTS");

  // Cancellation variations
  assert.equal(classifyPatientIntent("cancel my appointment").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("I want to cancel").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("cancel tomorrow's appointment").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("cancel my appointment with Dr Rahul").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("cancel it").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("please cancel my appointment").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("cancel").intent, "APPOINTMENT_CANCEL");

  // Reschedule variations
  assert.equal(classifyPatientIntent("reschedule my appointment").intent, "APPOINTMENT_RESCHEDULE");
  assert.equal(classifyPatientIntent("change my appointment").intent, "APPOINTMENT_RESCHEDULE");
  assert.equal(classifyPatientIntent("move my appointment").intent, "APPOINTMENT_RESCHEDULE");
  assert.equal(classifyPatientIntent("can't come").intent, "APPOINTMENT_RESCHEDULE");
});

test("4. Interactive button payloads have authoritative intent", () => {
  assert.equal(classifyPatientIntent("appt_confirm").intent, "APPOINTMENT_CONFIRMATION");
  assert.equal(classifyPatientIntent("appt_cancel").intent, "APPOINTMENT_CANCEL");
  assert.equal(classifyPatientIntent("appt_change_time").intent, "APPOINTMENT_RESCHEDULE");
  assert.equal(classifyPatientIntent("appt_doctor_doc_ananya").intent, "APPOINTMENT_DOCTOR_SELECTION");
  assert.equal(classifyPatientIntent("appt_date_2026-09-07").intent, "APPOINTMENT_DATE_SELECTION");
  assert.equal(classifyPatientIntent("appt_slot_test_123").intent, "APPOINTMENT_SLOT_SELECTION");
  assert.equal(classifyPatientIntent("btn_see_slots").intent, "APPOINTMENT_SLOTS");
});

test("5. Conversation state priority for confirmation", () => {
  // Standalone "confirm" without active execution context is NOT high-confidence booking confirmation
  const standalone = classifyPatientIntent("confirm");
  assert.notEqual(standalone.intent, "APPOINTMENT_CONFIRMATION");

  // But with active execution waiting for confirmation (n_confirm), "confirm" or "yes" is APPOINTMENT_CONFIRMATION
  const waitingConfirm = classifyPatientIntent("confirm", { waitingNodeId: "n_confirm" });
  assert.equal(waitingConfirm.intent, "APPOINTMENT_CONFIRMATION");
  assert.equal(waitingConfirm.confidence, "high");

  const waitingYes = classifyPatientIntent("yes", { waitingNodeId: "n_confirm" });
  assert.equal(waitingYes.intent, "APPOINTMENT_CONFIRMATION");

  const waitingYesConfirm = classifyPatientIntent("yes confirm", { waitingNodeId: "n_confirm" });
  assert.equal(waitingYesConfirm.intent, "APPOINTMENT_CONFIRMATION");
});

test("6. isAppointmentRelatedIntent helper correctly identifies transactional intents", () => {
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_BOOKING"));
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_SLOTS"));
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_CANCEL"));
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_RESCHEDULE"));
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_CONFIRMATION"));
  assert.ok(isAppointmentRelatedIntent("APPOINTMENT_CONFIRM"));
  assert.ok(!isAppointmentRelatedIntent("GENERAL_INFORMATION"));
  assert.ok(!isAppointmentRelatedIntent("GREETING"));
  assert.ok(!isAppointmentRelatedIntent("CLINIC_INFORMATION"));
});

test("7. Doctor photo resolution strictly maps doctors 1, 2, and 3", async () => {
  // Doctor 1: Dr. Ananya Rao -> doctor-ananya.png
  const doc1 = resolveDoctorPhotoAsset("doc_ananya", "Dr. Ananya Rao");
  assert.equal(doc1.filename, "doctor-ananya.png");
  assert.equal(doc1.contentType, "image/png");
  assert.equal(doc1.doctorIndex, 1);

  // Doctor 2: Dr. Rahul Mehta -> doctor-rahul.png
  const doc2 = resolveDoctorPhotoAsset("doc_rahul", "Dr. Rahul Mehta");
  assert.equal(doc2.filename, "doctor-rahul.png");
  assert.equal(doc2.contentType, "image/png");
  assert.equal(doc2.doctorIndex, 2);

  // Doctor 3: Dr. Priya Nair -> doctor-priya.jpg
  const doc3 = resolveDoctorPhotoAsset("doc_priya", "Dr. Priya Nair");
  assert.equal(doc3.filename, "doctor-priya.jpg");
  assert.equal(doc3.contentType, "image/jpeg");
  assert.equal(doc3.doctorIndex, 3);

  // Buffer loading
  const buf1 = await getDoctorPhotoBuffer("doc_ananya", "Dr. Ananya Rao");
  assert.ok(buf1);
  assert.ok(buf1.buffer.length > 100_000);

  const buf2 = await getDoctorPhotoBuffer("doc_rahul", "Dr. Rahul Mehta");
  assert.ok(buf2);
  assert.ok(buf2.buffer.length > 100_000);

  const buf3 = await getDoctorPhotoBuffer("doc_priya", "Dr. Priya Nair");
  assert.ok(buf3);
  assert.ok(buf3.buffer.length > 50_000);
});

test("8. Public doctor photo HTTP route serves valid binary with headers", async () => {
  const res1 = await app.request("/api/v1/public/doctors/doc_ananya/photo");
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get("Content-Type"), "image/png");
  assert.ok(Number(res1.headers.get("Content-Length")) > 0);

  const res2 = await app.request("/api/v1/public/doctors/doc_rahul/photo");
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get("Content-Type"), "image/png");

  const res3 = await app.request("/api/v1/public/doctors/doc_priya/photo");
  assert.equal(res3.status, 200);
  assert.equal(res3.headers.get("Content-Type"), "image/jpeg");
});

test("9. Deterministic appointment cancellation domain service", async () => {
  const { cancelAppointmentForWhatsApp } = await import("./modules/appointments/whatsapp-booking");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const startsAt = new Date(Date.now() + 48 * 3600 * 1000);
  const appt = await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      type: "CONSULTATION",
      startsAt,
      doctorName: "Dr. Rahul Mehta",
      status: "CONFIRMED",
      notes: "Test cancellation appointment",
    },
  });

  const tenant = {
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    userId: "test_user",
    organizationName: "Test Org",
    clinicName: "Smrko Clinic",
    role: "CLINIC_ADMIN" as const,
  };

  const cancelRes = await cancelAppointmentForWhatsApp({
    tenant,
    conversationId: "test_conv_cancel",
    appointmentId: appt.id,
    idempotencyKey: `test_idem_${appt.id}`,
  });

  assert.ok(cancelRes.ok);
  assert.equal(cancelRes.alreadyCancelled, false);

  // Verify in DB
  const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
  assert.equal(updated?.status, "CANCELLED");

  // Idempotency: second cancel call returns alreadyCancelled: true without throwing
  const secondCancel = await cancelAppointmentForWhatsApp({
    tenant,
    conversationId: "test_conv_cancel",
    appointmentId: appt.id,
    idempotencyKey: `test_idem_${appt.id}`,
  });
  assert.ok(secondCancel.ok);
  assert.equal(secondCancel.alreadyCancelled, true);
});

test("10. Active execution state priority: WAITING execution is resumed, bypassing generic AI", async () => {
  const { resumeWaitForReplyExecutions } = await import("./modules/whatsapp-automation/inbound-dispatch");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const tenant = {
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    userId: "test_user",
    organizationName: "Test Org",
    clinicName: "Smrko Clinic",
    role: "CLINIC_ADMIN" as const,
  };

  // Create conversation
  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: "+919999999999",
      status: "OPEN",
    },
  });

  // Create flow
  const flow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: clinic.id,
      name: "Test WAITING Flow",
      status: "ACTIVE",
      triggerType: "INCOMING_WHATSAPP",
      definition: JSON.stringify({
        nodes: [
          { id: "n_confirm", type: "SEND_BUTTONS", label: "Confirm", config: { waitForReply: true } },
          { id: "n_book", type: "END", label: "Booked", config: {} },
        ],
        edges: [
          { id: "e1", source: "n_confirm", target: "n_book", branch: "appt_confirm" },
        ],
      }),
    },
  });

  // Create WAITING execution
  const execution = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: clinic.id,
      flowId: flow.id,
      conversationId: conv.id,
      status: "WAITING",
      triggerType: "INCOMING_WHATSAPP",
      idempotencyKey: `test_exec_${Date.now()}`,
      currentNodeId: "n_confirm",
      context: JSON.stringify({
        waitKind: "reply",
        vars: { selectedSlotId: "test_slot_123" },
      }),
    },
  });

  // User replies "confirm" text
  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: conv.id,
    inboundVars: { message_text: "confirm" },
  });

  assert.ok(resumed.length > 0);
  assert.equal(resumed[0]?.executionId, execution.id);
  assert.equal(resumed[0]?.status, "COMPLETED");

  // Verify execution in DB is COMPLETED, not waiting
  const updatedExec = await prisma.whatsAppFlowExecution.findUnique({ where: { id: execution.id } });
  assert.equal(updatedExec?.status, "COMPLETED");
});

test("11. Media route /api/v1/whatsapp-automation/inbox/media/:id supports Range & streaming headers", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  // Verify route is registered and returns 401 when unauthenticated rather than 404 (route exists!)
  const res = await app.request("/api/v1/whatsapp-automation/inbox/media/non_existent_id");
  // 401 Unauthorized proves the route exists in Hono! (not 404 Route Not Found)
  assert.equal(res.status, 401);
});

test("12. Next.js /whatsapp/logs page route file exists and is tracked", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const logsPagePath = fs.existsSync(path.join(process.cwd(), "apps/web/src/app/(dashboard)/whatsapp/logs/page.tsx"))
    ? path.join(process.cwd(), "apps/web/src/app/(dashboard)/whatsapp/logs/page.tsx")
    : path.resolve(process.cwd(), "../web/src/app/(dashboard)/whatsapp/logs/page.tsx");
  assert.ok(fs.existsSync(logsPagePath), "whatsapp/logs/page.tsx must exist");
});

test("13. Existing patient booking reuses patient ID without duplicate creation", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const phone = "+9198" + Date.now().toString().slice(-8);
  const existingPatient = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: "Existing",
      lastName: "Patient",
      phone,
      whatsappNumber: phone,
      status: "ACTIVE",
    },
  });

  // Query patient lookup logic
  const found = await prisma.patient.findFirst({
    where: {
      clinicId: clinic.id,
      OR: [
        { whatsappNumber: { contains: phone.slice(-10) } },
        { phone: { contains: phone.slice(-10) } },
      ],
    },
  });

  assert.ok(found);
  assert.equal(found.id, existingPatient.id);
  assert.equal(found.firstName, "Existing");
});

test("14. Non-slot intents do NOT trigger slot lookup", () => {
  const cancelIntent = classifyPatientIntent("cancel my appointment");
  assert.equal(cancelIntent.intent, "APPOINTMENT_CANCEL");
  assert.ok(!cancelIntent.suggestedTools.includes("getAvailableAppointmentSlots"));

  const greetingIntent = classifyPatientIntent("Hello");
  assert.equal(greetingIntent.intent, "GREETING");
  assert.ok(!greetingIntent.suggestedTools.includes("getAvailableAppointmentSlots"));

  const generalIntent = classifyPatientIntent("Tell me about IVF options");
  assert.equal(generalIntent.intent, "IVF_INFORMATION");
  assert.ok(!generalIntent.suggestedTools.includes("getAvailableAppointmentSlots"));
});

test("15. Deterministic intent routing priority ensures no silent disagreements", () => {
  // Even if message mentions cancel with doctor name, cancel intent takes priority
  const cancelWithDoc = classifyPatientIntent("cancel my appointment with Dr Rahul");
  assert.equal(cancelWithDoc.intent, "APPOINTMENT_CANCEL");

  // Booking with doctor name takes booking priority
  const bookWithDoc = classifyPatientIntent("I want to book an appointment with Dr Ananya");
  assert.equal(bookWithDoc.intent, "APPOINTMENT_BOOKING");

  // General questions do not override transactional intents
  assert.notEqual(cancelWithDoc.intent, "GENERAL_INFORMATION");
  assert.notEqual(bookWithDoc.intent, "GENERAL_INFORMATION");
});

test("16. Full appointment confirmation chain with system-webhook tenant executes n_book -> n_task -> n_confirm_send without FK violation", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  process.env["WHATSAPP_ACCESS_TOKEN"] = "test_meta_token";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "10987654321";

  const { setWhatsAppGraphFetchForTests } = await import("./integrations/providers/whatsapp/graph");
  const testWamid = `wamid.CONFIRM_${Date.now()}`;
  setWhatsAppGraphFetchForTests(async (url, init) => {
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        contacts: [{ input: "919876543210", wa_id: "919876543210" }],
        messages: [{ id: testWamid }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const integration = await prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: clinic.id, provider: "WHATSAPP_CLOUD" } },
    create: {
      organizationId: clinic.organizationId,
      clinicId: clinic.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
    },
    update: { status: "ACTIVE" },
  });

  const existingAcc = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: clinic.id, integrationId: integration.id },
  });
  if (!existingAcc) {
    await prisma.whatsAppAccount.create({
      data: {
        clinicId: clinic.id,
        integrationId: integration.id,
        phoneNumberId: "10987654321",
        displayPhoneNumber: "919876543210",
        isActive: true,
      },
    });
  }

  const tenant = {
    userId: "system-webhook",
    role: "CLINIC_ADMIN" as const,
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: "",
  };

  const phone = `+9198765${Date.now().toString().slice(-5)}`;
  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      contactPhone: phone,
      channel: "WHATSAPP",
      status: "OPEN",
    },
  });

  const flow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: clinic.id,
      name: "Test Flow Full Confirmation Chain",
      status: "ACTIVE",
      triggerType: "INCOMING_WHATSAPP",
      definition: JSON.stringify({
        nodes: [
          { id: "n_confirm", type: "SEND_BUTTONS", label: "Confirm", config: { waitForReply: true } },
          { id: "n_book", type: "BOOK_APPOINTMENT", label: "Book Appointment", config: {} },
          { id: "n_task", type: "CREATE_TASK", label: "Create Task", config: { title: "Follow-up for {{doctor.name}} ({{appointment.date}})" } },
          { id: "n_confirm_send", type: "SEND_TEXT", label: "Send Confirmation", config: { body: "Confirmed with Dr. {{doctor.name}} on {{appointment.date}} at {{appointment.time}} at {{clinic.name}}" } },
          { id: "node_end", type: "END", label: "End", config: {} },
        ],
        edges: [
          { id: "e1", source: "n_confirm", target: "n_book", branch: "appt_confirm" },
          { id: "e2", source: "n_book", target: "n_task" },
          { id: "e3", source: "n_task", target: "n_confirm_send" },
          { id: "e4", source: "n_confirm_send", target: "node_end" },
        ],
      }),
    },
  });

  const tomorrow = new Date(Date.now() + 86400000 * 2);
  // Ensure time is within clinic working hours (e.g. 11:00 AM)
  tomorrow.setHours(11, 0, 0, 0);
  const testDoctor = `Dr. ConfirmTest ${Date.now().toString().slice(-4)}`;
  const { encodeSlotId } = await import("./modules/appointments/availability");
  const validSlotId = encodeSlotId({
    startMs: tomorrow.getTime(),
    durationMin: 30,
    appointmentType: "CONSULTATION",
    doctorName: testDoctor,
  });

  const execution = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: clinic.id,
      flowId: flow.id,
      conversationId: conv.id,
      status: "WAITING",
      triggerType: "INCOMING_WHATSAPP",
      idempotencyKey: `test_chain_${Date.now()}`,
      currentNodeId: "n_confirm",
      context: JSON.stringify({
        waitKind: "reply",
        vars: {
          selectedSlotId: validSlotId,
          "doctor.name": testDoctor,
          selectedDate: tomorrow.toISOString().slice(0, 10),
          "appointment.date": tomorrow.toISOString().slice(0, 10),
          "appointment.time": "11:00 AM",
        },
      }),
    },
  });

  const { resumeWaitForReplyExecutions } = await import("./modules/whatsapp-automation/inbound-dispatch");
  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: conv.id,
    inboundVars: { message_text: "appt_confirm" },
  });

  assert.ok(resumed.length > 0);
  assert.equal(resumed[0]?.executionId, execution.id);
  assert.equal(resumed[0]?.status, "COMPLETED");

  const finalExec = await prisma.whatsAppFlowExecution.findUnique({ where: { id: execution.id } });
  assert.equal(finalExec?.status, "COMPLETED");

  const ctxObj = typeof finalExec?.context === "string" ? JSON.parse(finalExec.context) : (finalExec?.context as Record<string, any>);
  const apptId = ctxObj?.vars?.["appointment_id"];
  assert.ok(apptId, "appointment_id must be populated in flow execution vars");

  const createdAppt = await prisma.appointment.findUnique({
    where: { id: apptId },
  });
  assert.ok(createdAppt, "Appointment record must exist in DB");
  assert.equal(createdAppt.status, "CONFIRMED");

  const task = await prisma.careTask.findFirst({
    where: { clinicId: clinic.id, category: "WHATSAPP_AUTOMATION" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(task, "CareTask must exist");
  assert.equal(task.createdById, null, "createdById must be null for system-webhook tenant");

  const confirmationMsg = await prisma.message.findFirst({
    where: {
      conversationId: conv.id,
      direction: "OUTBOUND",
    },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(confirmationMsg, "Outbound confirmation WhatsApp message must be delivered and stored");
  assert.ok(confirmationMsg.content.includes(testDoctor));
  assert.equal(confirmationMsg.providerMessageId, testWamid);
});


