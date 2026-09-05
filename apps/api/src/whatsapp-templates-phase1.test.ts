import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyTemplatePreview,
  buildOrderedParameters,
  isApprovedTemplateStatus,
  parseWhatsAppTemplateComponents,
} from "./integrations/providers/whatsapp/template-variables";
import { validateTemplateVariables } from "./integrations/providers/whatsapp/variable-resolver";

test("parses header, body, and URL button variables", () => {
  const parsed = parseWhatsAppTemplateComponents([
    { type: "HEADER", format: "TEXT", text: "Hello {{1}}" },
    { type: "BODY", text: "Hi {{1}}, appointment on {{2}} with {{doctor_name}}." },
    { type: "FOOTER", text: "SmrkoMed Clinic" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "URL", text: "View", url: "https://clinic.example/a/{{1}}" },
        { type: "QUICK_REPLY", text: "Confirm" },
      ],
    },
  ]);

  assert.equal(parsed.header, "Hello {{1}}");
  assert.ok(parsed.body?.includes("{{doctor_name}}"));
  assert.equal(parsed.footer, "SmrkoMed Clinic");
  assert.equal(parsed.buttons?.length, 2);

  const headerSlots = parsed.variables.filter((v) => v.component === "HEADER");
  const bodySlots = parsed.variables.filter((v) => v.component === "BODY");
  const buttonSlots = parsed.variables.filter((v) => v.component === "BUTTON");

  assert.equal(headerSlots.length, 1);
  assert.equal(headerSlots[0]?.token, "1");
  assert.equal(bodySlots.length, 3);
  assert.ok(bodySlots.some((s) => s.token === "doctor_name" && s.key === "doctor.name"));
  assert.equal(buttonSlots.length, 1);
  assert.equal(buttonSlots[0]?.buttonIndex, 0);
  assert.ok(parsed.bodyParameterCount >= 2);
  assert.ok(parsed.parameterCount >= 4);
});

test("named and positional body variables are detected", () => {
  const parsed = parseWhatsAppTemplateComponents([
    { type: "BODY", text: "Dear {{patient_name}}, see you at {{3}}." },
  ]);
  assert.equal(parsed.variables.length, 2);
  assert.ok(parsed.variableKeys.includes("patient.fullName"));
  assert.ok(parsed.variables.some((v) => v.token === "3" && v.positional));
});

test("empty / invalid components yield empty parse", () => {
  assert.equal(parseWhatsAppTemplateComponents(null).parameterCount, 0);
  assert.equal(parseWhatsAppTemplateComponents([]).variables.length, 0);
});

test("preview applies sample values without mutating template", () => {
  const text = "Hi {{1}} / {{patient_name}}";
  const out = applyTemplatePreview(text, { "1": "Asha", patient_name: "Asha Sharma" });
  assert.equal(out, "Hi Asha / Asha Sharma");
  assert.equal(text, "Hi {{1}} / {{patient_name}}");
});

test("buildOrderedParameters respects component and index gaps", () => {
  const parsed = parseWhatsAppTemplateComponents([
    { type: "HEADER", text: "Dr {{1}}" },
    { type: "BODY", text: "{{1}} on {{2}}" },
  ]);
  const values = {
    "header.1": "Rao",
    "body.1": "Priya",
    "body.2": "Tue",
  };
  assert.deepEqual(buildOrderedParameters(parsed.variables, "HEADER", values), ["Rao"]);
  assert.deepEqual(buildOrderedParameters(parsed.variables, "BODY", values), ["Priya", "Tue"]);
});

test("approved-only helper", () => {
  assert.equal(isApprovedTemplateStatus("APPROVED"), true);
  assert.equal(isApprovedTemplateStatus("PENDING"), false);
  assert.equal(isApprovedTemplateStatus("REJECTED"), false);
  assert.equal(isApprovedTemplateStatus("DISABLED"), false);
  assert.equal(isApprovedTemplateStatus("PAUSED"), false);
});

test("validateTemplateVariables reports missing keys", () => {
  const ok = validateTemplateVariables(["patient.fullName", "appointment.date"], {
    "patient.fullName": "Priya",
  });
  assert.equal(ok.ok, false);
  if (!ok.ok) assert.deepEqual(ok.missing, ["appointment.date"]);

  const good = validateTemplateVariables(["patient.fullName"], { "patient.fullName": "Priya" });
  assert.equal(good.ok, true);
});
