import assert from "node:assert/strict";
import test from "node:test";

import { AppointmentBookingMachine } from "./modules/appointment-booking/state-machine";
import { bookingSessionStore } from "./modules/appointment-booking/session-store";
import { parseNaturalDate, parseNaturalTime } from "./modules/appointment-booking/nlp-parser";
import { getClinicDoctors, getDoctorDaySlots, recheckSlotAvailability } from "./modules/appointment-booking/slot-engine";
import { createApp } from "./app";

const app = createApp();

test("appointment-booking: nlp date and time parsing", () => {
  const base = new Date("2026-09-08T10:00:00.000Z");

  const tomorrow = parseNaturalDate("tomorrow", base);
  assert.ok(tomorrow);
  assert.equal(tomorrow.date, "2026-09-09");

  const iso = parseNaturalDate("2026-09-15", base);
  assert.ok(iso);
  assert.equal(iso.date, "2026-09-15");

  const timeAm = parseNaturalTime("10:30 AM");
  assert.ok(timeAm);
  assert.equal(timeAm.time, "10:30");

  const timePm = parseNaturalTime("4:00 PM");
  assert.ok(timePm);
  assert.equal(timePm.time, "16:00");

  const period = parseNaturalTime("morning");
  assert.ok(period);
  assert.equal(period.time, "10:00");
});

test("appointment-booking: doctor catalog and slot generation", async () => {
  const clinicId = "clinic_test_123";
  const doctors = await getClinicDoctors(clinicId);
  assert.ok(doctors.length >= 2);
  assert.ok(doctors[0]!.displayName.includes("Dr."));

  const slots = await getDoctorDaySlots(clinicId, doctors[0]!.id, "2026-09-09");
  assert.ok(slots.length > 0);
  assert.ok(slots[0]!.timeLabel);

  const reval = await recheckSlotAvailability(clinicId, doctors[0]!.displayName, "2026-09-09", "10:00");
  assert.equal(reval.available, true);
});

test("appointment-booking: end-to-end golden path (WhatsApp)", async () => {
  const clinicId = "clinic_test_flow";
  const orgId = "org_test_flow";
  const phone = "+919876543210";
  const ctx = { clinicId, organizationId: orgId, clinicName: "SmrkoMed Fertility Clinic" };

  bookingSessionStore.clear();
  const session = bookingSessionStore.create({
    channel: "WHATSAPP",
    clinicId,
    organizationId: orgId,
    contactPhone: phone,
  });

  // Step 0: SELECT_CHANNEL -> chooses 1 (Book on WhatsApp)
  const res0 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res0.session.currentStep, "IDENTIFY_PATIENT");
  assert.ok(res0.responseMessage.includes("SmrkoMed"));

  // Step 1: IDENTIFY_PATIENT -> chooses 2 (new patient)
  const res1 = await AppointmentBookingMachine.processMessage(session, "2", ctx);
  assert.equal(res1.session.currentStep, "REGISTER_PATIENT");
  assert.ok(res1.responseMessage.includes("Patient Registration (1/3)"));

  // Step 2: REGISTER_PATIENT (Name)
  const res2 = await AppointmentBookingMachine.processMessage(session, "Meera Sharma", ctx);
  assert.equal(res2.session.registrationDraft.patientName, "Meera Sharma");
  assert.ok(res2.responseMessage.includes("Patient Registration (2/3)"));

  // Step 3: REGISTER_PATIENT (Age)
  const res3 = await AppointmentBookingMachine.processMessage(session, "28", ctx);
  assert.equal(res3.session.registrationDraft.age, 28);
  assert.ok(res3.responseMessage.includes("Partner's Full Name"));

  // Step 4: REGISTER_PATIENT (Partner Name)
  const res4 = await AppointmentBookingMachine.processMessage(session, "Vikram Sharma", ctx);
  assert.equal(res4.session.registrationDraft.partnerName, "Vikram Sharma");
  assert.equal(res4.session.currentStep, "SELECT_DOCTOR");
  assert.ok(res4.responseMessage.includes("Select a Doctor"));

  // Step 5: SELECT_DOCTOR -> selects option 1 (Dr. Ananya Rao)
  const res5 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res5.session.currentStep, "VIEW_DOCTOR");
  assert.ok(res5.responseMessage.includes("Dr. Ananya Rao"));
  assert.ok(res5.responseMessage.includes("See Available Slots"));

  // Step 6: VIEW_DOCTOR -> chooses 1 (See slots)
  const res6 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res6.session.currentStep, "SELECT_DATE");
  assert.ok(res6.responseMessage.includes("Choose a Date"));

  // Step 7: SELECT_DATE -> chooses "tomorrow"
  const res7 = await AppointmentBookingMachine.processMessage(session, "tomorrow", ctx);
  assert.equal(res7.session.currentStep, "SELECT_SLOT");
  assert.ok(res7.responseMessage.includes("Available Slots"));

  // Step 8: SELECT_SLOT -> chooses option 1
  const res8 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res8.session.currentStep, "CONFIRMATION");
  assert.ok(res8.responseMessage.includes("Confirm Your Appointment Summary"));
  assert.ok(res8.responseMessage.includes("Meera Sharma"));
  assert.ok(res8.responseMessage.includes("Vikram Sharma"));

  // Step 9: CONFIRMATION -> chooses 1 (Confirm & Book)
  const res9 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res9.session.status, "COMPLETED");
  assert.equal(res9.session.currentStep, "COMPLETED");
  assert.ok(res9.session.appointmentId);
  assert.ok(res9.responseMessage.includes("Appointment Confirmed"));
});

test("appointment-booking: navigation recovery (Back, Restart, Human Handoff)", async () => {
  const clinicId = "clinic_test_nav";
  const orgId = "org_test_nav";
  const phone = "+919876543211";
  const ctx = { clinicId, organizationId: orgId, clinicName: "SmrkoMed Clinic" };

  const session = bookingSessionStore.create({
    channel: "WHATSAPP",
    clinicId,
    organizationId: orgId,
    contactPhone: phone,
  });

  // 1. SELECT_CHANNEL -> chooses 1 (WhatsApp)
  const res0 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res0.session.currentStep, "IDENTIFY_PATIENT");

  // 2. IDENTIFY_PATIENT -> chooses 1 (Existing patient)
  const res1 = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(res1.session.currentStep, "SELECT_DOCTOR");

  // 3. Select doctor
  await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.equal(session.currentStep, "VIEW_DOCTOR");

  // Test "BACK" -> returns to SELECT_DOCTOR
  const backRes = await AppointmentBookingMachine.processMessage(session, "back", ctx);
  assert.equal(backRes.session.currentStep, "SELECT_DOCTOR");

  // Test "HUMAN" -> triggers handoff
  const handoffRes = await AppointmentBookingMachine.processMessage(session, "human", ctx);
  assert.equal(handoffRes.session.currentStep, "HANDOFF");
  assert.equal(handoffRes.session.status, "HANDED_OFF");
  assert.ok(handoffRes.responseMessage.includes("Care Coordinator"));

  // Test "RESTART" -> resets flow to doctor selection
  const restartRes = await AppointmentBookingMachine.processMessage(session, "restart", ctx);
  assert.equal(restartRes.session.currentStep, "SELECT_DOCTOR");
  assert.equal(restartRes.session.selectedDate, null);
});

test("appointment-booking: multi-channel voice responses (Sarvam AI)", async () => {
  const clinicId = "clinic_test_voice";
  const orgId = "org_test_voice";
  const phone = "+919876543212";
  const ctx = { clinicId, organizationId: orgId, clinicName: "ABC Fertility Centre" };

  const session = bookingSessionStore.create({
    channel: "CALL",
    clinicId,
    organizationId: orgId,
    contactPhone: phone,
  });

  session.registrationDraft.patientName = "Lakshmi";
  session.currentStep = "SELECT_DOCTOR";

  const res = await AppointmentBookingMachine.processMessage(session, "1", ctx);
  assert.ok(res.responseMessage.length > 0);
  // Spoken format is clean, no markdown headers
  assert.ok(!res.responseMessage.includes("###"));
});

test("appointment-booking: HTTP API endpoints (/api/v1/appointment-booking)", async () => {
  // 1. Initialize session
  const initRes = await app.request("/api/v1/appointment-booking/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "WHATSAPP",
      contactPhone: "+919123456780",
      patientName: "Deepa",
    }),
  });
  assert.equal(initRes.status, 200);
  const initJson = (await initRes.json()) as { success: boolean; data: any };
  assert.ok(initJson.data.sessionId);
  assert.equal(initJson.data.channel, "WHATSAPP");

  // 2. Send message
  const msgRes = await app.request("/api/v1/appointment-booking/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: initJson.data.sessionId,
      contactPhone: "+919123456780",
      content: "1",
    }),
  });
  assert.equal(msgRes.status, 200);
  const msgJson = (await msgRes.json()) as { success: boolean; data: any };
  assert.ok(msgJson.data.responseMessage);

  // 3. Inspect session state
  const inspectRes = await app.request(`/api/v1/appointment-booking/session/${initJson.data.sessionId}`);
  assert.equal(inspectRes.status, 200);
  const inspectJson = (await inspectRes.json()) as { success: boolean; data: any };
  assert.equal(inspectJson.data.id, initJson.data.sessionId);

  // 4. List doctors
  const docRes = await app.request("/api/v1/appointment-booking/doctors");
  assert.equal(docRes.status, 200);
  const docJson = (await docRes.json()) as { success: boolean; data: any[] };
  assert.ok(Array.isArray(docJson.data));
  assert.ok(docJson.data.length > 0);
});

test("appointment-booking: channel choice AI call trigger", async () => {
  const clinicId = "clinic_test_call";
  const orgId = "org_test_call";
  const phone = "+919876543211";
  const ctx = { clinicId, organizationId: orgId, clinicName: "SmrkoMed Fertility Clinic" };

  bookingSessionStore.clear();
  const session = bookingSessionStore.create({
    channel: "WHATSAPP",
    clinicId,
    organizationId: orgId,
    contactPhone: phone,
  });

  // Prompt shows options to Call or Book
  const prompt = await AppointmentBookingMachine.processMessage(session, "", ctx);
  assert.ok(prompt.responseMessage.includes("Book on WhatsApp"));
  assert.ok(prompt.responseMessage.includes("AI Phone Call"));

  // User chooses option 2 (AI Call)
  const callRes = await AppointmentBookingMachine.processMessage(session, "2", ctx);
  assert.equal(callRes.session.channel, "CALL");
  assert.ok(callRes.responseMessage.includes("Calling you right now"));
  assert.ok(callRes.responseMessage.includes(phone));
});


