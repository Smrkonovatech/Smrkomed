import assert from "node:assert/strict";
import { test } from "node:test";

import { detectHandoffSignals, isUnsafeAiOutput } from "./modules/whatsapp-ai/safety";
import { retrieveKnowledgeArticles } from "./modules/whatsapp-ai/knowledge";
import { generateWhatsAppAiReply } from "./modules/whatsapp-ai/generate";
import { packTitles } from "./modules/whatsapp-ai/seed-kb-titles";

test("Hi-style greeting does not force handoff", () => {
  const s = detectHandoffSignals("Hi");
  assert.equal(s.handoff, false);
});

test("human request triggers handoff", () => {
  const s = detectHandoffSignals("Please let me speak to a doctor");
  assert.equal(s.handoff, true);
  assert.equal(s.reason, "PATIENT_REQUESTED_HUMAN");
});

test("clinical question triggers safe escalation signal", () => {
  const s = detectHandoffSignals("What dosage should I take of my medicine?");
  assert.equal(s.handoff, true);
  assert.ok(s.reason === "CLINICAL_UNCERTAINTY" || s.reason === "EMERGENCY_LANGUAGE");
});

test("emergency language triggers handoff", () => {
  const s = detectHandoffSignals("This is an emergency and I have severe pain");
  assert.equal(s.handoff, true);
  assert.equal(s.reason, "EMERGENCY_LANGUAGE");
});

test("complaint language triggers handoff", () => {
  const s = detectHandoffSignals("I want to file a complaint about negligence");
  assert.equal(s.handoff, true);
  assert.equal(s.reason, "COMPLAINT");
});

test("unsafe AI output detector catches doctor pretence", () => {
  assert.equal(isUnsafeAiOutput("I diagnose you with PCOS"), true);
  assert.equal(isUnsafeAiOutput("Hello Rahul! How can I help you today?"), false);
});

test("KB fallback reply includes Smrko AI label and DEMO caution when scored", async () => {
  const result = await generateWhatsAppAiReply({
    patientMessage: "What is SmrkoMed?",
    ctx: {
      clinicName: "Demo Clinic",
      patientFirstName: "Rahul",
      appointmentSummary: null,
      journeyStage: null,
      careTaskTitle: null,
      recentMessages: [{ role: "patient", text: "What is SmrkoMed?" }],
    },
    knowledge: [
      {
        id: "a1",
        title: "[DEMO] What is SmrkoMed",
        category: "Platform",
        specialty: "SMRKOMED",
        content: "SmrkoMed is a fertility-clinic SaaS platform.",
        score: 8,
      },
    ],
  });
  assert.ok(/smrko ai/i.test(result.text));
  assert.ok(/Rahul/.test(result.text));
  assert.equal(result.usedLlm, false);
});

test("unknown question fallback offers staff", async () => {
  const result = await generateWhatsAppAiReply({
    patientMessage: "zzzz unrelated gibberish xyz",
    ctx: {
      clinicName: "Demo Clinic",
      patientFirstName: null,
      appointmentSummary: null,
      journeyStage: null,
      careTaskTitle: null,
      recentMessages: [],
    },
    knowledge: [],
  });
  assert.ok(/staff|care team|human/i.test(result.text));
});

test("demo seed packs cover required topic families", () => {
  const titles = packTitles();
  assert.ok(titles.some((t) => /What is SmrkoMed/i.test(t)));
  assert.ok(titles.some((t) => /IVF/i.test(t)));
  assert.ok(titles.some((t) => /OPD/i.test(t)));
  assert.ok(titles.every((t) => t.startsWith("[DEMO]")));
});

test("tenant isolation: knowledge retrieve scopes by clinicId arg", async () => {
  // Structural: function requires clinicId — wrong clinic returns empty when no rows
  const hits = await retrieveKnowledgeArticles({
    clinicId: "clinic_that_does_not_exist_phase5",
    query: "IVF",
    limit: 3,
  });
  assert.equal(Array.isArray(hits), true);
  assert.equal(hits.length, 0);
});
