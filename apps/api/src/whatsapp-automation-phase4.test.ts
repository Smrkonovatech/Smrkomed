import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyRetry } from "./integrations/core/retry";
import { buildIncomingWhatsAppVars } from "./modules/whatsapp-automation/inbound-dispatch";
import { validateFlowDefinition } from "./modules/whatsapp-automation/validate";
import { emptyDefinition } from "./modules/whatsapp-automation/types";
import { evaluateCondition } from "./modules/whatsapp-automation/conditions";
import { parseExecutionContext, mergeExecutionContext, DEFAULT_MAX_RETRIES } from "./modules/whatsapp-automation/context";

test("inbound vars never include secrets", () => {
  const vars = buildIncomingWhatsAppVars({
    clinicId: "c1",
    clinicName: "Clinic",
    conversationId: "conv1",
    patientId: "p1",
    coupleId: "cp1",
    leadId: "l1",
    messageId: "m1",
    messageType: "text",
    messageText: "Hello doctor",
    timestampIso: "2026-09-05T12:00:00.000Z",
  });
  assert.equal(vars['message_text'], "Hello doctor");
  assert.equal(vars['conversation_id'], "conv1");
  assert.equal(vars['patient_id'], "p1");
  for (const key of Object.keys(vars)) {
    assert.ok(!/token|secret|password|credential|authorization/i.test(key));
    assert.ok(!/token|secret|password/i.test(vars[key]!));
  }
});

test("WAIT_FOR_REPLY is an allowed node type", () => {
  const def = emptyDefinition("INCOMING_WHATSAPP", "Incoming");
  def.nodes.push({
    id: "wfr",
    type: "WAIT_FOR_REPLY",
    label: "Wait reply",
    config: { timeoutHours: 0 },
  });
  def.edges.push({ id: "e", source: "node_trigger", target: "wfr" });
  const issues = validateFlowDefinition(def);
  assert.ok(!issues.some((i) => i.code === "NODE_TYPE"));
});

test("classifyRetry treats rate limit and 5xx as retryable", () => {
  assert.equal(classifyRetry({ code: "PROVIDER_RATE_LIMITED", httpStatus: 429 }).retryable, true);
  assert.equal(classifyRetry({ code: "MESSAGE_SEND_FAILED", httpStatus: 500 }).retryable, true);
  assert.equal(classifyRetry({ code: "CONNECTION_FAILED" }).retryable, true);
});

test("classifyRetry treats permanent WhatsApp failures as non-retryable", () => {
  assert.equal(classifyRetry({ code: "TEMPLATE_NOT_APPROVED", httpStatus: 422 }).retryable, false);
  assert.equal(classifyRetry({ code: "INVALID_TEMPLATE", httpStatus: 422 }).retryable, false);
  assert.equal(classifyRetry({ code: "INVALID_RECIPIENT", httpStatus: 422 }).retryable, false);
  assert.equal(classifyRetry({ code: "WHATSAPP_NOT_CONNECTED", httpStatus: 409 }).retryable, false);
  assert.equal(classifyRetry({ code: "AUTHORIZATION_EXPIRED", httpStatus: 401 }).retryable, false);
});

test("execution context persists waitKind reply and retry metadata", () => {
  assert.equal(DEFAULT_MAX_RETRIES, 3);
  const merged = parseExecutionContext(
    mergeExecutionContext(
      {},
      {
        waitKind: "reply",
        waitNextNodeId: "n_next",
        retryCount: 1,
        lastError: "PROVIDER_RATE_LIMITED",
        nextRetryAt: new Date().toISOString(),
      },
    ),
  );
  assert.equal(merged.waitKind, "reply");
  assert.equal(merged.waitNextNodeId, "n_next");
  assert.equal(merged.retryCount, 1);
});

test("condition evaluates message content from inbound vars", async () => {
  const yes = await evaluateCondition(
    { field: "message.content", operator: "contains", value: "hello" },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: "conv",
      vars: { message_text: "Hello there", message_content: "Hello there", message_type: "text" },
      tags: [],
      simulation: false,
    },
  );
  assert.equal(yes.branch, "yes");
});

test("condition evaluates journey stage from vars", async () => {
  const yes = await evaluateCondition(
    { field: "journey.stage", operator: "equals", value: "Stimulation" },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: null,
      vars: { journey_stage: "Stimulation" },
      tags: [],
      simulation: false,
    },
  );
  assert.equal(yes.branch, "yes");
});

test("condition patient_replied honors inbound flag without conversation", async () => {
  const yes = await evaluateCondition(
    { field: "communication.patient_replied", operator: "truthy" },
    {
      clinicId: "c",
      patientId: null,
      coupleId: null,
      conversationId: null,
      vars: { patient_replied: "true" },
      tags: [],
      simulation: false,
    },
  );
  assert.equal(yes.branch, "yes");
});

test("TRIGGER_TYPES include Phase 4 care loop events", async () => {
  const { TRIGGER_TYPES } = await import("./modules/whatsapp-automation/types");
  const set = new Set(TRIGGER_TYPES);
  for (const t of [
    "INCOMING_WHATSAPP",
    "CARE_TASK_CREATED",
    "CARE_TASK_ASSIGNED",
    "CARE_TASK_COMPLETED",
    "CARE_LOOP_STAGE_CHANGED",
    "CARE_TASK_DUE",
    "CARE_TASK_OVERDUE",
  ]) {
    assert.ok(set.has(t as (typeof TRIGGER_TYPES)[number]), t);
  }
});
