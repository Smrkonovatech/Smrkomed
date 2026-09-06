import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@smrkomed/database";
import type { TenantContext } from "@smrkomed/database";

import {
  getAvailableAppointmentSlots,
  encodeSlotId,
  decodeSlotId,
  validateSlotStillAvailable,
} from "./modules/appointments/availability";
import {
  resolveDoctorPhotoAsset,
  getDoctorPhotoUrl,
  getDoctorAssetsDir,
} from "./modules/whatsapp-automation/doctor-photos";
import {
  DEMO_DOCTORS,
  resolveClinicDoctors,
  groupAvailableDates,
  segmentSlots,
} from "./modules/whatsapp-automation/appointment-nodes";
import {
  buildIncomingWhatsAppVars,
  resumeWaitForReplyExecutions,
} from "./modules/whatsapp-automation/inbound-dispatch";
import { parseExecutionContext } from "./modules/whatsapp-automation/context";
import { runExecution } from "./modules/whatsapp-automation/engine";
import { bookAppointmentFromSlot } from "./modules/appointments/whatsapp-booking";
import { LIBRARY_FLOWS } from "./modules/whatsapp-automation/library";
import { createApp } from "./app";

const PREFIX = `slot_test_${Date.now()}`;
let testClinicId: string;
let testOrgId: string;
let testPatientId: string;
let testCoupleId: string;
let testConvId: string;
let tenant: TenantContext;

test.before(async () => {
  const org = await prisma.organization.create({
    data: { name: `${PREFIX}-org` },
  });
  testOrgId = org.id;

  const clinic = await prisma.clinic.create({
    data: {
      organizationId: org.id,
      name: `${PREFIX}-clinic`,
      slug: `${PREFIX}-clinic`,
    },
  });
  testClinicId = clinic.id;

  const patient = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: "Meera",
      lastName: "Nair",
      phone: "+919876543210",
      whatsappNumber: "+919876543210",
      status: "ACTIVE",
    },
  });
  testPatientId = patient.id;

  const couple = await prisma.couple.create({
    data: {
      clinicId: clinic.id,
      primaryPatientId: patient.id,
      slug: `${PREFIX}-couple`,
    },
  });
  testCoupleId = couple.id;

  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}@smrkomed.com`,
      passwordHash: "hash123",
      name: "Dr. Ananya Rao",
    },
  });

  tenant = {
    userId: user.id,
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
    organizationId: org.id,
    clinicName: clinic.name,
    organizationName: org.name,
  };

  const { ensureDirectWhatsAppConnection } = await import("./integrations/providers/whatsapp/service");
  await ensureDirectWhatsAppConnection(tenant);

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
});

test.after(async () => {
  await prisma.careTask.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.appointment.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.message.deleteMany({ where: { conversation: { clinicId: testClinicId } } }).catch(() => {});
  await prisma.whatsAppFlowExecution.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.whatsAppFlow.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.conversation.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.whatsAppAccount.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.integration.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.couple.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.patient.deleteMany({ where: { clinicId: testClinicId } }).catch(() => {});
  await prisma.clinic.deleteMany({ where: { id: testClinicId } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { id: testOrgId } }).catch(() => {});
});

// Test A — Date selection: doctor selected -> date selected -> selectedDate persisted -> doctorId retained
test("Test A — Date selection: doctor selected -> date selected -> selectedDate persisted -> doctorId retained", async () => {
  const vars = buildIncomingWhatsAppVars({
    clinicId: testClinicId,
    conversationId: testConvId,
    messageId: `msg_${Date.now()}`,
    messageType: "interactive",
    messageText: "appt_date_2026-09-07",
    timestampIso: new Date().toISOString(),
  });

  assert.equal(vars["selectedDate"], "2026-09-07");
  assert.equal(vars["selected_date"], "2026-09-07");
  assert.equal(vars["appointment.date"], "2026-09-07");
});

// Test B — Slot lookup: 2026-09-07 -> 12 actual slots returned (Fix for days: 1 bug)
test("Test B — Slot lookup: 2026-09-07 -> 12 actual slots returned", async () => {
  const res = await getAvailableAppointmentSlots({
    clinicId: testClinicId,
    doctorName: "Dr. Ananya Rao",
    preferredDate: "2026-09-07",
    days: 1,
  });

  assert.equal(res.available, true, "Availability should be true for 2026-09-07");
  assert.equal(res.slots.length, 12, "Should return exactly 12 available slots for the day");
  assert.ok(res.slots[0]?.startTime.includes("2026-09-07"), "Slots must belong to preferredDate 2026-09-07");
});

// Test C — Slot display: 12 slots -> WhatsApp interactive message segmentation
test("Test C — Slot display: 12 slots segmented into morning and afternoon within Meta limit", async () => {
  const res = await getAvailableAppointmentSlots({
    clinicId: testClinicId,
    doctorName: "Dr. Ananya Rao",
    preferredDate: "2026-09-07",
    days: 1,
  });

  const segmented = segmentSlots(res.slots);
  assert.ok(segmented.morning.length > 0, "Morning slots should be populated");
  assert.ok(segmented.afternoon.length > 0, "Afternoon slots should be populated");
  assert.ok(segmented.morning.length + segmented.afternoon.length <= 10, "Total rows must not exceed Meta's 10-row limit");
  for (const s of segmented.morning) {
    assert.ok(s.slotId.startsWith("s_"), "Slot IDs must have valid s_ prefix");
    assert.ok(s.timeLabel.includes("AM") || s.timeLabel.includes("PM"), "Must format 12-hour AM/PM label");
  }
});

// Test D — Slot selection: slot selected -> decode slot start -> persist selectedSlotId & time
test("Test D — Slot selection: slot selected -> decode slot start -> persist selectedSlotId & time", async () => {
  const targetDate = new Date("2026-09-07T10:30:00.000Z");
  const slotId = encodeSlotId({
    startMs: targetDate.getTime(),
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const vars = buildIncomingWhatsAppVars({
    clinicId: testClinicId,
    conversationId: testConvId,
    messageId: `msg_${Date.now()}`,
    messageType: "interactive",
    messageText: `appt_slot_${slotId}`,
    timestampIso: new Date().toISOString(),
  });

  assert.equal(vars["selectedSlotId"], slotId);
  assert.ok(vars["selectedTime"], "selectedTime must be extracted");
  assert.ok(vars["appointment.time"], "appointment.time must be set");
});

// Test E — Booking: doctor + date + slot + confirmation -> appointment created in database
test("Test E — Booking: doctor + date + slot + confirmation -> appointment created", async () => {
  const targetDate = new Date("2026-09-07T11:00:00.000Z");
  const slotId = encodeSlotId({
    startMs: targetDate.getTime(),
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    coupleId: testCoupleId,
    slotId,
    idempotencyKey: `test_book_e_${Date.now()}`,
  });

  assert.equal(booked.ok, true, "Booking must succeed");
  assert.ok(booked.appointmentId, "Appointment ID must be returned");

  const apptRecord = await prisma.appointment.findUnique({
    where: { id: booked.appointmentId },
  });
  assert.ok(apptRecord, "Appointment record must exist in DB");
  assert.equal(apptRecord!.clinicId, testClinicId);
  assert.equal(apptRecord!.status, "CONFIRMED");
});

// Test F — Care Loop: appointment created -> CareTask created
test("Test F — Care Loop: appointment created -> CareTask created", async () => {
  const targetDate = new Date("2026-09-07T11:30:00.000Z");
  const slotId = encodeSlotId({
    startMs: targetDate.getTime(),
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    coupleId: testCoupleId,
    slotId,
    idempotencyKey: `test_book_f_${Date.now()}`,
  });

  assert.equal(booked.ok, true);
  const careTask = await prisma.careTask.findFirst({
    where: {
      clinicId: testClinicId,
      coupleId: testCoupleId,
      category: "APPOINTMENT",
      description: { contains: booked.appointmentId },
    },
  });
  assert.ok(careTask, "CareTask must exist for confirmed appointment");
  assert.equal(careTask!.status, "WAITING");
});

// Test G — No availability message on zero slots
test("Test G — No availability: zero slots returns clean reason without failure", async () => {
  // Sunday is closed in DEFAULT_HOURS
  const res = await getAvailableAppointmentSlots({
    clinicId: testClinicId,
    preferredDate: "2026-09-13", // Sunday
    days: 1,
  });

  assert.equal(res.available, false);
  assert.equal(res.slots.length, 0);
  assert.equal(res.reason, "NO_OPEN_SLOTS_IN_RANGE");
});

// Test H — Doctor images: Doctor 1 -> Image 1, Doctor 2 -> Image 2, Doctor 3 -> Image 3 strictly doctor-ID based
test("Test H — Doctor images: Doctor 1 -> Image 1, Doctor 2 -> Image 2, Doctor 3 -> Image 3", async () => {
  const asset1 = resolveDoctorPhotoAsset("doc_ananya");
  assert.equal(asset1.filename, "doctor-ananya.png");
  assert.equal(asset1.doctorIndex, 1);
  assert.equal(asset1.contentType, "image/png");

  const asset2 = resolveDoctorPhotoAsset("doc_rahul");
  assert.equal(asset2.filename, "doctor-rahul.png");
  assert.equal(asset2.doctorIndex, 2);
  assert.equal(asset2.contentType, "image/png");

  const asset3 = resolveDoctorPhotoAsset("doc_priya");
  assert.equal(asset3.filename, "doctor-priya.jpg");
  assert.equal(asset3.doctorIndex, 3);
  assert.equal(asset3.contentType, "image/jpeg");

  // Verify files exist on disk in assets directory
  const assetsDir = getDoctorAssetsDir();
  assert.ok(fs.existsSync(path.join(assetsDir, asset1.filename)), "Doctor 1 photo file must exist");
  assert.ok(fs.existsSync(path.join(assetsDir, asset2.filename)), "Doctor 2 photo file must exist");
  assert.ok(fs.existsSync(path.join(assetsDir, asset3.filename)), "Doctor 3 photo file must exist");

  // Verify public HTTP endpoint serves the image
  const app = createApp();
  const res1 = await app.request(`/api/v1/public/doctors/doc_ananya/photo`);
  assert.equal(res1.status, 200);
  assert.equal(res1.headers.get("content-type"), "image/png");

  const res2 = await app.request(`/api/v1/public/doctors/doc_rahul/photo`);
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get("content-type"), "image/png");

  const res3 = await app.request(`/api/v1/public/doctors/doc_priya/photo`);
  assert.equal(res3.status, 200);
  assert.equal(res3.headers.get("content-type"), "image/jpeg");
});

// Test I — Webhook continuation: interactive reply ID resumes waiting execution
test("Test I — Webhook continuation: interactive reply ID resumes waiting execution", async () => {
  const apptFlow = LIBRARY_FLOWS.find((f) => f.libraryKey === "appointment_booking_whatsapp");
  assert.ok(apptFlow);

  const flowRecord = await prisma.whatsAppFlow.create({
    data: {
      clinicId: testClinicId,
      name: "Test Appt Flow",
      status: "ACTIVE",
      triggerType: "INCOMING_WHATSAPP",
      definition: apptFlow!.definition as any,
    },
  });

  // Create an execution parked waiting on n_show_dates
  const execution = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: testClinicId,
      flowId: flowRecord.id,
      triggerType: "INCOMING_WHATSAPP",
      idempotencyKey: `exec_resume_${Date.now()}`,
      conversationId: testConvId,
      patientId: testPatientId,
      status: "WAITING",
      currentNodeId: "n_show_dates",
      context: JSON.stringify({
        waitKind: "reply",
        vars: {
          "doctor.id": "doc_ananya",
          "doctor.name": "Dr. Ananya Rao",
          "doctor.specialty": "Fertility Specialist",
        },
      }),
    },
  });

  // Simulate patient tapping "Mon, 7 Sep" (appt_date_2026-09-07)
  const vars = buildIncomingWhatsAppVars({
    clinicId: testClinicId,
    conversationId: testConvId,
    messageId: `msg_resume_${Date.now()}`,
    messageType: "interactive",
    messageText: "appt_date_2026-09-07",
    timestampIso: new Date().toISOString(),
  });

  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: testConvId,
    inboundVars: vars,
  });

  assert.ok(resumed.some((r) => r.executionId === execution.id), "Execution must be resumed");

  const updatedExec = await prisma.whatsAppFlowExecution.findUnique({
    where: { id: execution.id },
  });
  assert.ok(updatedExec);
  const updatedCtx = parseExecutionContext(updatedExec!.context);
  assert.equal(updatedCtx.vars?.["selectedDate"], "2026-09-07", "selectedDate must be persisted in execution state");
  assert.equal(updatedCtx.vars?.["doctor.name"], "Dr. Ananya Rao", "doctor.name must be preserved");
  assert.equal(updatedCtx.vars?.["availableSlotsCount"], "12", "Must calculate 12 available slots on resumed execution");
});

// Test J — Meta outbound: valid wamid = SENT, Meta error = FAILED
test("Test J — Meta outbound: valid wamid = SENT, Meta error = FAILED", async () => {
  const { setWhatsAppGraphFetchForTests } = await import("./integrations/providers/whatsapp/graph");
  const { sendWhatsAppInteractiveButtons } = await import("./integrations/providers/whatsapp/messaging");

  const origToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  const origPhoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  process.env["WHATSAPP_ACCESS_TOKEN"] = "EAAB_TEST_TOKEN";
  process.env["WHATSAPP_PHONE_NUMBER_ID"] = "1234567890";

  try {
    // 1. Success case
    setWhatsAppGraphFetchForTests(async () => {
      const payload = {
        messaging_product: "whatsapp",
        contacts: [{ input: "+919876543210", wa_id: "919876543210" }],
        messages: [{ id: "wamid.TEST_WAMID_12345" }],
      };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
      } as any;
    });

    const sentResult = await sendWhatsAppInteractiveButtons(tenant, {
      conversationId: testConvId,
      body: "Test Interactive Message",
      buttons: [{ id: "btn_test", title: "Test Button" }],
    });

    assert.equal(sentResult.providerMessageId, "wamid.TEST_WAMID_12345");
    const msgRecord = await prisma.message.findFirst({
      where: { providerMessageId: "wamid.TEST_WAMID_12345" },
    });
    assert.ok(msgRecord);
    assert.equal(msgRecord!.status, "SENT");

    // 2. Error case
    setWhatsAppGraphFetchForTests(async () => {
      const payload = {
        error: {
          message: "Invalid recipient",
          type: "OAuthException",
          code: 131026,
        },
      };
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
      } as any;
    });

    await assert.rejects(
      async () => {
        await sendWhatsAppInteractiveButtons(tenant, {
          conversationId: testConvId,
          body: "Test Error Message",
          buttons: [{ id: "btn_fail", title: "Fail Button" }],
        });
      },
      (err: any) => {
        assert.equal(err.code, "INVALID_RECIPIENT");
        return true;
      },
    );
  } finally {
    setWhatsAppGraphFetchForTests(null);
    if (origToken !== undefined) process.env["WHATSAPP_ACCESS_TOKEN"] = origToken;
    else delete process.env["WHATSAPP_ACCESS_TOKEN"];
    if (origPhoneId !== undefined) process.env["WHATSAPP_PHONE_NUMBER_ID"] = origPhoneId;
    else delete process.env["WHATSAPP_PHONE_NUMBER_ID"];
  }
});

// Test K — Existing Patient Identification
test("Test K — Existing Patient Identification: WhatsApp number finds existing patient", async () => {
  const existingPatient = await prisma.patient.create({
    data: {
      clinicId: testClinicId,
      firstName: "Rohan",
      lastName: "Kapoor",
      phone: "+919888877771",
      whatsappNumber: "+919888877771",
      status: "ACTIVE",
    },
  });

  const existingCouple = await prisma.couple.create({
    data: {
      clinicId: testClinicId,
      slug: `c-rohan-${Date.now()}`,
      primaryPatientId: existingPatient.id,
    },
  });

  const conv = await prisma.conversation.create({
    data: {
      clinicId: testClinicId,
      contactPhone: "+919888877771",
      channel: "WHATSAPP",
      status: "OPEN",
    },
  });

  const { runExecution } = await import("./modules/whatsapp-automation/engine");
  const testFlow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: testClinicId,
      name: "Test Patient Lookup Flow",
      triggerType: "INCOMING_WHATSAPP",
      status: "ACTIVE",
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Start", config: { triggerType: "INCOMING_WHATSAPP" } },
          { id: "n_lookup", type: "PATIENT_LOOKUP", label: "Lookup", config: {} },
          { id: "n_existing", type: "END", label: "Existing", config: {} },
          { id: "n_new", type: "END", label: "New", config: {} },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "n_lookup" },
          { id: "e2", source: "n_lookup", target: "n_existing", branch: "existing_patient" },
          { id: "e3", source: "n_lookup", target: "n_new", branch: "new_patient" },
        ],
      },
    },
  });

  const exec = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: testClinicId,
      flowId: testFlow.id,
      status: "PENDING",
      triggerType: "INCOMING_WHATSAPP",
      triggerEventId: `lookup_test_${Date.now()}`,
      conversationId: conv.id,
      currentNodeId: "n_lookup",
      idempotencyKey: `lookup_exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      context: {
        vars: { contact_phone: "+919888877771" },
      },
    },
  });

  const runResult = await runExecution(tenant, exec.id);
  assert.equal(runResult.status, "COMPLETED");

  const finalExec = await prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: exec.id } });
  const ctx = JSON.parse(typeof finalExec.context === "string" ? finalExec.context : JSON.stringify(finalExec.context));
  assert.equal(ctx.vars?.["patient_exists"], "true");
  assert.equal(ctx.vars?.["patient.id"], existingPatient.id);
  assert.equal(ctx.vars?.["couple.id"], existingCouple.id);
});

// Test L — New Patient Registration
test("Test L — New Patient Registration: creates basic patient and couple record", async () => {
  const newPhone = "+919876500001";
  const conv = await prisma.conversation.create({
    data: {
      clinicId: testClinicId,
      contactPhone: newPhone,
      channel: "WHATSAPP",
      status: "OPEN",
    },
  });

  const { runExecution } = await import("./modules/whatsapp-automation/engine");
  const testFlow = await prisma.whatsAppFlow.create({
    data: {
      clinicId: testClinicId,
      name: "Test Create Patient Flow",
      triggerType: "INCOMING_WHATSAPP",
      status: "ACTIVE",
      definition: {
        nodes: [
          { id: "node_trigger", type: "TRIGGER", label: "Start", config: { triggerType: "INCOMING_WHATSAPP" } },
          { id: "n_create", type: "CREATE_PATIENT", label: "Create", config: {} },
          { id: "node_end", type: "END", label: "End", config: {} },
        ],
        edges: [
          { id: "e1", source: "node_trigger", target: "n_create" },
          { id: "e2", source: "n_create", target: "node_end" },
        ],
      },
    },
  });

  const exec = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: testClinicId,
      flowId: testFlow.id,
      status: "PENDING",
      triggerType: "INCOMING_WHATSAPP",
      triggerEventId: `create_test_${Date.now()}`,
      conversationId: conv.id,
      currentNodeId: "n_create",
      idempotencyKey: `create_exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      context: {
        vars: {
          patient_name: "Sneha Patel",
          contact_phone: newPhone,
          booking_as_couple: "true",
          partner_name: "Arun Patel",
        },
      },
    },
  });

  const runResult = await runExecution(tenant, exec.id);
  assert.equal(runResult.status, "COMPLETED");

  const createdPatient = await prisma.patient.findFirst({
    where: { clinicId: testClinicId, firstName: "Sneha", lastName: "Patel" },
  });
  assert.ok(createdPatient, "Patient Sneha Patel must be created in DB");
  assert.ok(createdPatient?.whatsappNumber?.includes("9876500001"), "WhatsApp phone must match");

  const createdCouple = await prisma.couple.findFirst({
    where: { clinicId: testClinicId, primaryPatientId: createdPatient!.id },
  });
  assert.ok(createdCouple, "Couple record must be created for fertility patient");
});

// Test M — Confirm Booking without Pre-existing Couple
test("Test M — Confirm Booking: patient without couple auto-creates couple and confirms appointment", async () => {
  const soloPatient = await prisma.patient.create({
    data: {
      clinicId: testClinicId,
      firstName: "Vikram",
      lastName: "Singh",
      phone: "+919999000022",
      whatsappNumber: "+919999000022",
      status: "ACTIVE",
    },
  });

  const targetDate = new Date("2026-09-08T05:00:00.000Z");
  const slotId = encodeSlotId({
    startMs: targetDate.getTime(),
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Consultation",
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: soloPatient.id,
    coupleId: null, // intentionally null
    slotId,
    idempotencyKey: `solo_book_${Date.now()}`,
  });

  assert.equal(booked.ok, true, "Booking must succeed even when coupleId is initially null");
  assert.ok(booked.appointmentId);

  const appt = await prisma.appointment.findUnique({ where: { id: booked.appointmentId } });
  assert.ok(appt);
  assert.equal(appt!.status, "CONFIRMED");

  // Check couple was auto-created and linked
  const linkedCouple = await prisma.couple.findFirst({
    where: { clinicId: testClinicId, primaryPatientId: soloPatient.id },
  });
  assert.ok(linkedCouple, "Couple should be auto-created for the patient");
  assert.equal(appt!.coupleId, linkedCouple!.id);

  // CareTask must also be created
  const task = await prisma.careTask.findFirst({
    where: { clinicId: testClinicId, coupleId: linkedCouple!.id },
  });
  assert.ok(task, "CareTask must be created for the appointment");
});

// Test N — Existing Patient Second Appointment
test("Test N — Existing Patient Second Appointment: reuses same patient, does not duplicate", async () => {
  const initialPatientCount = await prisma.patient.count({ where: { clinicId: testClinicId } });

  const targetDate = new Date("2026-09-08T06:00:00.000Z");
  const slotId = encodeSlotId({
    startMs: targetDate.getTime(),
    durationMin: 30,
    doctorName: "Dr. Ananya Rao",
    appointmentType: "Follow-up",
  });

  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: testConvId,
    patientId: testPatientId,
    coupleId: testCoupleId,
    slotId,
    idempotencyKey: `second_appt_${Date.now()}`,
  });

  assert.equal(booked.ok, true, "Second booking for existing patient must succeed");
  const finalPatientCount = await prisma.patient.count({ where: { clinicId: testClinicId } });
  assert.equal(finalPatientCount, initialPatientCount, "No duplicate patient created for second booking");
});


