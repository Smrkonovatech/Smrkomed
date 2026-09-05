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

test("booking and cancel intents map to write tools", () => {
  assert.ok(
    classifyPatientIntent("I want to book an appointment").suggestedTools.includes(
      "getAvailableAppointmentSlots",
    ),
  );
  assert.ok(classifyPatientIntent("Cancel my appointment").suggestedTools.includes("cancelAppointment"));
  assert.ok(
    classifyPatientIntent("I want to reschedule").suggestedTools.includes("getAvailableAppointmentSlots"),
  );
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
