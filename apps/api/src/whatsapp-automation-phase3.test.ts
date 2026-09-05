import assert from "node:assert/strict";
import { test } from "node:test";

import { parseWhatsAppTemplateComponents } from "./integrations/providers/whatsapp/template-variables";
import {
  applyVariableMappings,
  effectiveVariableMappings,
  listAutomationVariableSources,
  parseSendTemplateConfig,
} from "./modules/whatsapp-automation/template-node-config";
import { validateFlowDefinition } from "./modules/whatsapp-automation/validate";
import { emptyDefinition } from "./modules/whatsapp-automation/types";

test("parseSendTemplateConfig prefers templateId and variableMappings", () => {
  const cfg = parseSendTemplateConfig({
    templateId: "tpl_1",
    templateName: "appt_reminder",
    templateLanguage: "en",
    variableMappings: { "body.1": "patient.firstName", "body.2": "appointment.time" },
    variableKeys: ["patient_name"],
  });
  assert.equal(cfg.templateId, "tpl_1");
  assert.equal(cfg.templateName, "appt_reminder");
  assert.equal(cfg.variableMappings?.["body.1"], "patient.firstName");
  assert.deepEqual(cfg.variableKeys, ["patient_name"]);
});

test("SEND_TEMPLATE structural validation requires template selection", () => {
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

test("SEND_TEMPLATE accepts templateId without templateName", () => {
  const base = emptyDefinition("MANUAL", "Manual");
  base.nodes.push({
    id: "n_send",
    type: "SEND_TEMPLATE",
    label: "Send",
    config: { templateId: "tpl_abc" },
  });
  base.edges.push({ id: "e2", source: "node_trigger", target: "n_send" });
  const issues = validateFlowDefinition(base);
  assert.ok(!issues.some((i) => i.code === "TEMPLATE"));
});

test("variable mapping applies Phase 1 resolver keys onto slots", () => {
  const components = [
    {
      type: "BODY",
      text: "Hello {{1}}, your appointment is at {{2}}.",
    },
  ];
  const parsed = parseWhatsAppTemplateComponents(components);
  assert.ok(parsed.variables.length >= 2);

  const mappings = {
    "body.1": "patient.firstName",
    "body.2": "appointment.time",
  };
  const resolved = {
    "patient.firstName": "Priya",
    "appointment.time": "10:30 AM",
  };
  const applied = applyVariableMappings(parsed.variables, mappings, resolved, {});
  assert.equal(applied.missing.length, 0);
  assert.equal(applied.values["body.1"], "Priya");
  assert.equal(applied.values["body.2"], "10:30 AM");
  assert.equal(applied.mapped["body.1"], "patient.firstName");
});

test("missing mapping reports required slots", () => {
  const components = [{ type: "BODY", text: "Hi {{1}}, time {{2}}" }];
  const parsed = parseWhatsAppTemplateComponents(components);
  const applied = applyVariableMappings(
    parsed.variables,
    { "body.1": "patient.firstName" },
    { "patient.firstName": "A" },
    {},
  );
  assert.ok(applied.missing.includes("body.2") || applied.missing.some((m) => m.includes("2")));
});

test("invalid empty source is treated as missing", () => {
  const components = [{ type: "BODY", text: "Hi {{1}}" }];
  const parsed = parseWhatsAppTemplateComponents(components);
  const applied = applyVariableMappings(
    parsed.variables,
    { "body.1": "appointment.time" },
    {},
    {},
  );
  assert.ok(applied.missing.length > 0);
});

test("legacy variableKeys expand into body mappings", () => {
  const components = [{ type: "BODY", text: "Hi {{1}} at {{2}}" }];
  const parsed = parseWhatsAppTemplateComponents(components);
  const mappings = effectiveVariableMappings(
    { variableKeys: ["patient.firstName", "appointment.time"] },
    parsed.variables,
  );
  assert.equal(mappings["body.1"], "patient.firstName");
  assert.equal(mappings["body.2"], "appointment.time");
});

test("automation variable catalog includes Phase 1 domains", () => {
  const sources = listAutomationVariableSources();
  const values = new Set(sources.map((s) => s.value));
  assert.ok(values.has("patient.firstName"));
  assert.ok(values.has("doctor.name"));
  assert.ok(values.has("appointment.date"));
  assert.ok(values.has("appointment.time"));
  assert.ok(values.has("clinic.name"));
  assert.ok(values.has("journey.stage"));
  assert.ok(values.has("careLoop.taskTitle"));
});

test("SEND_TEXT and SEND_MEDIA structural validation", () => {
  const base = emptyDefinition("MANUAL", "Manual");
  base.nodes.push(
    { id: "n_text", type: "SEND_TEXT", label: "Text", config: {} },
    { id: "n_media", type: "SEND_MEDIA", label: "Media", config: {} },
  );
  base.edges.push(
    { id: "e1", source: "node_trigger", target: "n_text" },
    { id: "e2", source: "n_text", target: "n_media" },
  );
  const issues = validateFlowDefinition(base);
  assert.ok(issues.some((i) => i.code === "SEND_TEXT"));
  assert.ok(issues.some((i) => i.code === "SEND_MEDIA"));
});

test("SEND_MEDIA is an allowed node type", () => {
  const base = emptyDefinition("MANUAL", "Manual");
  base.nodes.push({
    id: "n_media",
    type: "SEND_MEDIA",
    label: "Media",
    config: { documentId: "doc_1" },
  });
  base.edges.push({ id: "e", source: "node_trigger", target: "n_media" });
  const issues = validateFlowDefinition(base);
  assert.ok(!issues.some((i) => i.code === "NODE_TYPE"));
  assert.ok(!issues.some((i) => i.code === "SEND_MEDIA"));
});
