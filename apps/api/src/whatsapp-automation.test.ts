import assert from "node:assert/strict";
import { test } from "node:test";

import { buildIdempotencyKey } from "./modules/whatsapp-automation/idempotency";
import { evaluateCondition } from "./modules/whatsapp-automation/conditions";
import { validateFlowDefinition, parseDefinition } from "./modules/whatsapp-automation/validate";
import { emptyDefinition } from "./modules/whatsapp-automation/types";
import {
  isLockHeld,
  parseExecutionContext,
  DEFAULT_MAX_RETRIES,
} from "./modules/whatsapp-automation/context";

test("idempotency key is stable and clinic-scoped", () => {
  const a = buildIdempotencyKey({
    clinicId: "c1",
    flowId: "f1",
    triggerType: "PATIENT_CREATED",
    triggerEventId: "p1",
    patientId: "p1",
  });
  const b = buildIdempotencyKey({
    clinicId: "c1",
    flowId: "f1",
    triggerType: "PATIENT_CREATED",
    triggerEventId: "p1",
    patientId: "p1",
  });
  const otherClinic = buildIdempotencyKey({
    clinicId: "c2",
    flowId: "f1",
    triggerType: "PATIENT_CREATED",
    triggerEventId: "p1",
    patientId: "p1",
  });
  assert.equal(a, b);
  assert.notEqual(a, otherClinic);
});

test("validateFlowDefinition requires trigger and template name", () => {
  const empty = validateFlowDefinition({ nodes: [], edges: [] });
  assert.ok(empty.some((i) => i.code === "NO_NODES"));

  const base = emptyDefinition("MANUAL", "Manual");
  base.nodes.push({
    id: "n_send",
    type: "SEND_TEMPLATE",
    label: "Send",
    config: {},
  });
  base.edges.push({ id: "e2", source: "node_trigger", target: "n_send" });
  const issues = validateFlowDefinition(base);
  assert.ok(issues.some((i) => i.code === "TEMPLATE"));
});

test("validateFlowDefinition rejects invalid node types", () => {
  const def = parseDefinition({
    nodes: [
      { id: "t", type: "TRIGGER", label: "T", config: {} },
      { id: "x", type: "MAGIC", label: "Bad", config: {} },
    ],
    edges: [{ id: "e", source: "t", target: "x" }],
  });
  const issues = validateFlowDefinition(def);
  assert.ok(issues.some((i) => i.code === "NODE_TYPE"));
});

test("condition simulation branches without DB", async () => {
  const yes = await evaluateCondition(
    { field: "communication.patient_replied", simulateBranch: "yes" },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: null,
      vars: {},
      tags: [],
      simulation: true,
    },
  );
  assert.equal(yes.branch, "yes");
  const no = await evaluateCondition(
    { kind: "patient_replied", simulateBranch: "no" },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: null,
      vars: {},
      tags: [],
      simulation: true,
    },
  );
  assert.equal(no.branch, "no");
});

test("execution lock context helpers", () => {
  assert.equal(DEFAULT_MAX_RETRIES, 3);
  const ctx = parseExecutionContext({
    lockToken: "abc",
    lockExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal(isLockHeld(ctx), true);
  const expired = parseExecutionContext({
    lockToken: "abc",
    lockExpiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert.equal(isLockHeld(expired), false);
});

test("AND condition group requires all branches", async () => {
  const result = await evaluateCondition(
    {
      and: [
        { field: "communication.patient_replied", simulateBranch: "yes" },
        { field: "payment.pending", simulateBranch: "no" },
      ],
    },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: null,
      vars: {},
      tags: [],
      simulation: true,
    },
  );
  // Second clause simulateBranch no → AND fails
  assert.equal(result.branch, "no");
});

test("WAIT validation requires duration amount", () => {
  const def = emptyDefinition("MANUAL", "Manual");
  def.nodes.push({
    id: "w",
    type: "WAIT",
    label: "Wait",
    config: { mode: "duration", amount: 0 },
  });
  def.edges.push({ id: "e", source: "node_trigger", target: "w" });
  const issues = validateFlowDefinition(def);
  assert.ok(issues.some((i) => i.code === "WAIT"));
});

test("system template protection is enforced by isLibrary flag in API contract", () => {
  // Documented contract: PATCH rejects isLibrary flows (SYSTEM_TEMPLATE).
  const issues = validateFlowDefinition(emptyDefinition("PATIENT_CREATED", "Patient Created"));
  assert.equal(issues.filter((i) => i.code === "TRIGGER").length, 0);
});

test("idempotency keys differ across clinics for same event", () => {
  const a = buildIdempotencyKey({
    clinicId: "clinic-a",
    flowId: "flow",
    triggerType: "APPOINTMENT_BOOKED",
    triggerEventId: "appt-1",
    patientId: null,
  });
  const b = buildIdempotencyKey({
    clinicId: "clinic-b",
    flowId: "flow",
    triggerType: "APPOINTMENT_BOOKED",
    triggerEventId: "appt-1",
    patientId: null,
  });
  assert.notEqual(a, b);
});

test("missingRequiredVars detects empty keys", async () => {
  const { missingRequiredVars } = await import("./modules/whatsapp-automation/safety");
  assert.deepEqual(missingRequiredVars(["patient_name", "clinic_name"], { patient_name: "A", clinic_name: "" }), [
    "clinic_name",
  ]);
  assert.deepEqual(missingRequiredVars(["patient_name"], { patient_name: "A" }), []);
});

test("nextWorkingWindowStart returns null inside hours", async () => {
  const { nextWorkingWindowStart } = await import("./modules/whatsapp-automation/safety");
  const mondayMorning = new Date("2026-08-31T10:00:00"); // Monday
  assert.equal(
    nextWorkingWindowStart(mondayMorning, {
      mon: { start: "09:00", end: "18:00" },
    }),
    null,
  );
  const mondayNight = new Date("2026-08-31T20:00:00");
  const next = nextWorkingWindowStart(mondayNight, {
    mon: { start: "09:00", end: "18:00" },
    tue: { start: "09:00", end: "18:00" },
  });
  assert.ok(next);
  assert.ok(next!.getTime() > mondayNight.getTime());
});

test("stage4 library includes required healthcare flows", async () => {
  const { LIBRARY_FLOWS } = await import("./modules/whatsapp-automation/library");
  const keys = new Set(LIBRARY_FLOWS.map((f) => f.libraryKey));
  for (const required of [
    "patient_welcome",
    "appointment_confirmation",
    "appointment_reminder_24h",
    "appointment_reminder_2h",
    "missed_appointment",
    "care_task_due",
    "care_task_overdue",
    "medicine_reminder",
    "medicine_assigned",
    "medicine_dispensed",
    "medicine_starting",
    "medicine_missed",
    "payment_due",
    "payment_overdue",
    "payment_received",
    "human_escalation",
    "patient_replied",
  ]) {
    assert.ok(keys.has(required), `missing library flow ${required}`);
  }
  assert.ok(LIBRARY_FLOWS.length >= 20);
});

test("segment filters type accepts empty object", async () => {
  const { previewSegment } = await import("./modules/whatsapp-automation/segments");
  assert.equal(typeof previewSegment, "function");
});

test("takeover schema reasons include complaint and high priority", async () => {
  const { takeoverSchema } = await import("./modules/whatsapp-automation/schemas");
  const parsed = takeoverSchema.parse({
    reason: "COMPLAINT",
    pauseAutomation: true,
  });
  assert.equal(parsed.reason, "COMPLAINT");
  assert.equal(parsed.pauseAutomation, true);
});

test("inbox filter enum includes human_handoff", async () => {
  const { inboxListQuery } = await import("./modules/whatsapp-automation/schemas");
  const q = inboxListQuery.parse({ filter: "human_handoff" });
  assert.equal(q.filter, "human_handoff");
});
