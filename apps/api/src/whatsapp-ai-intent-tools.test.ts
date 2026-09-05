import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyPatientIntent } from "./modules/whatsapp-ai/intent";
import { detectHandoffSignals } from "./modules/whatsapp-ai/safety";
import { isKnownPatientTool } from "./modules/whatsapp-ai/tools";

test("classifies greeting and appointment booking intents", () => {
  assert.equal(classifyPatientIntent("Hi").intent, "GREETING");
  assert.equal(classifyPatientIntent("I want to book an appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("What is my next appointment?").intent, "APPOINTMENT_STATUS");
  assert.equal(classifyPatientIntent("What is IVF?").intent, "IVF_INFORMATION");
});

test("medication dose change is hard handoff", () => {
  const s = detectHandoffSignals("Can I take an extra injection because I missed yesterday?");
  assert.equal(s.handoff, true);
  assert.equal(s.pauseAi, true);
  assert.equal(s.reason, "MEDICATION_CLINICAL_CONCERN");
});

test("adverse reaction after injection is hard handoff", () => {
  const s = detectHandoffSignals("I am having a problem after my injection");
  assert.equal(s.handoff, true);
  assert.equal(s.pauseAi, true);
});

test("who is my doctor is informational not forced human request", () => {
  assert.equal(classifyPatientIntent("Who is my doctor?").intent, "DOCTOR_INFORMATION");
  const s = detectHandoffSignals("Who is my doctor?");
  assert.equal(s.pauseAi, false);
});

test("patient tool registry includes core read tools", () => {
  assert.equal(isKnownPatientTool("getAppointments"), true);
  assert.equal(isKnownPatientTool("getAvailableAppointmentSlots"), true);
  assert.equal(isKnownPatientTool("dropTable"), false);
});
