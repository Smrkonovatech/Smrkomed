import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeSlotId,
  encodeSlotId,
  DEFAULT_HOURS,
} from "./modules/appointments/availability";
import { classifyPatientIntent } from "./modules/whatsapp-ai/intent";

test("slot id round-trips without inventing fields", () => {
  const startMs = Date.parse("2026-09-10T05:00:00.000Z");
  const id = encodeSlotId({
    startMs,
    durationMin: 30,
    doctorName: "Dr Rao",
    appointmentType: "Consultation",
  });
  const decoded = decodeSlotId(id);
  assert.ok(decoded);
  assert.equal(decoded!.startMs, startMs);
  assert.equal(decoded!.durationMin, 30);
  assert.equal(decoded!.doctorName, "Dr Rao");
  assert.equal(decoded!.appointmentType, "Consultation");
});

test("invalid slot id returns null", () => {
  assert.equal(decodeSlotId("not-a-slot"), null);
  assert.equal(decodeSlotId("s_bad"), null);
});

test("default clinic hours exist for weekday slot generation", () => {
  assert.ok(DEFAULT_HOURS.mon);
  assert.equal(DEFAULT_HOURS.sun, null);
});

test("show available slots and need a appointment classify as booking", () => {
  assert.equal(classifyPatientIntent("Show available slots").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("Show available slots next monday").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("Need a appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("need an appointment next monday").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("Hi can you book appointment").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("book appointment next monday").intent, "APPOINTMENT_BOOKING");
  assert.equal(classifyPatientIntent("Can you reschedule to 6th").intent, "APPOINTMENT_RESCHEDULE");
  assert.equal(classifyPatientIntent("Can you reschedule my appointment to next monday").intent, "APPOINTMENT_RESCHEDULE");
  assert.ok(
    classifyPatientIntent("I want to book an appointment").suggestedTools.includes(
      "getAvailableAppointmentSlots",
    ),
  );
  assert.ok(classifyPatientIntent("Cancel my appointment").suggestedTools.includes("cancelAppointment"));
});

test("next monday / tomorrow parse in Asia/Kolkata", async () => {
  const { extractPreferredDateIso } = await import("./modules/whatsapp-ai/date-parse");
  const sundayIst = new Date(Date.UTC(2026, 8, 5, 19, 30, 0)); // Sun 6 Sep 2026 01:00 IST
  assert.equal(
    extractPreferredDateIso("Show available slots next monday", sundayIst, "Asia/Kolkata"),
    "2026-09-07",
  );
  assert.equal(extractPreferredDateIso("show available slots tomorrow", sundayIst, "Asia/Kolkata"), "2026-09-07");
  assert.equal(
    extractPreferredDateIso("reschedule to next monday", sundayIst, "Asia/Kolkata"),
    "2026-09-07",
  );
});

test("deterministic slot formatters never use published-information wording", async () => {
  const {
    formatAppointmentSlotsPatientMessage,
    formatNoSlotsPatientMessage,
  } = await import("./modules/whatsapp-ai/tools");
  const slotsMsg = formatAppointmentSlotsPatientMessage({
    clinicName: "ABC Fertility Centre",
    dateLabel: "Monday, 7 September",
    slots: [{ index: 1, label: "Mon 7 Sep, 10:00 am · Consultation" }],
  });
  assert.match(slotsMsg, /Available appointments/i);
  assert.doesNotMatch(slotsMsg, /published information/i);
  const noSlots = formatNoSlotsPatientMessage({
    clinicName: "ABC Fertility Centre",
    dateLabel: "Monday, 7 September",
  });
  assert.match(noSlots, /couldn't find an available appointment slot/i);
  assert.doesNotMatch(noSlots, /published information/i);
});

test("appointment phrases are not hard human handoff", async () => {
  const { detectHandoffSignals } = await import("./modules/whatsapp-ai/safety");
  assert.equal(detectHandoffSignals("Need a appointment").handoff, false);
  assert.equal(detectHandoffSignals("I want to book appointment").pauseAi, false);
  assert.equal(detectHandoffSignals("Can you reschedule to 6th").handoff, false);
});


test("named doctor appointment request does not suggest slot invention tools", () => {
  const r = classifyPatientIntent("I want to see Dr. Ananya");
  assert.equal(r.intent, "REQUEST_DOCTOR");
  assert.ok(r.suggestedTools.includes("requestHuman"));
  assert.equal(r.suggestedTools.includes("getAvailableAppointmentSlots"), false);
});

test("doctorId remains absent from encoded slot identity", () => {
  const id = encodeSlotId({
    startMs: Date.now() + 86_400_000,
    durationMin: 30,
    doctorName: null,
    appointmentType: "Consultation",
  });
  assert.ok(!id.includes("doctorId"));
  const decoded = decodeSlotId(id);
  assert.equal(decoded!.doctorName, null);
});
