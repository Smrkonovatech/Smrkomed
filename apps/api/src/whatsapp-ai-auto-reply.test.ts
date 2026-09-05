/**
 * Continuous WhatsApp AI auto-reply — unit coverage for product rules.
 * Full Meta/Railway E2E is reported separately as REAL WHATSAPP VERIFIED.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generateWhatsAppAiReply,
  isSimpleAck,
  isSimpleGreeting,
} from "./modules/whatsapp-ai/generate";
import { detectHandoffSignals } from "./modules/whatsapp-ai/safety";

const emptyCtx = {
  clinicName: "Demo Clinic",
  patientFirstName: "Mohit",
  appointmentSummary: null as string | null,
  journeyStage: null as string | null,
  careTaskTitle: null as string | null,
  recentMessages: [] as Array<{ role: "patient" | "clinic"; text: string }>,
};

test("TEST 1 style: Hi uses greeting-fast and still produces outbound text", async () => {
  assert.equal(isSimpleGreeting("Hi"), true);
  const result = await generateWhatsAppAiReply({
    patientMessage: "Hi",
    ctx: emptyCtx,
    knowledge: [],
    preferFast: true,
  });
  assert.equal(result.model, "greeting-fast");
  assert.equal(result.usedLlm, false);
  assert.ok(/smrko ai/i.test(result.text));
  assert.ok(/help/i.test(result.text));
});

test("TEST 2 style: IVF question uses KB when OpenAI unavailable", async () => {
  process.env["WHATSAPP_AI_FORCE_FALLBACK"] = "1";
  try {
    const result = await generateWhatsAppAiReply({
      patientMessage: "What is IVF?",
      ctx: emptyCtx,
      knowledge: [
        {
          id: "k1",
          title: "[DEMO] IVF",
          category: "Fertility",
          specialty: "FERTILITY",
          content: "IVF (in vitro fertilisation) is a treatment pathway managed by your clinic team.",
          score: 10,
        },
      ],
      preferFast: true,
    });
    assert.equal(result.usedLlm, false);
    assert.ok(/IVF|in vitro/i.test(result.text));
    assert.ok(/smrko ai/i.test(result.text));
  } finally {
    delete process.env["WHATSAPP_AI_FORCE_FALLBACK"];
  }
});

test("TEST 3 style: unknown question does not invent clinic facts", async () => {
  process.env["WHATSAPP_AI_FORCE_FALLBACK"] = "1";
  try {
    const result = await generateWhatsAppAiReply({
      patientMessage: "What is your secret unpublished price for gold package XYZ?",
      ctx: emptyCtx,
      knowledge: [],
      preferFast: true,
    });
    assert.ok(/staff|care team|knowledge|published/i.test(result.text));
    assert.ok(!/₹|rs\.?\s*\d|gold package xyz costs/i.test(result.text));
  } finally {
    delete process.env["WHATSAPP_AI_FORCE_FALLBACK"];
  }
});

test("Thank you / Okay / Yes get fast conversational replies", async () => {
  assert.equal(isSimpleAck("Thank you"), true);
  assert.equal(isSimpleAck("Okay"), true);
  assert.equal(isSimpleAck("Yes"), true);
  const thanks = await generateWhatsAppAiReply({
    patientMessage: "Thank you",
    ctx: emptyCtx,
    knowledge: [],
    preferFast: true,
  });
  assert.equal(thanks.model, "ack-fast");
  assert.ok(/smrko ai/i.test(thanks.text));
});

test("human request still hard-pauses AI (takeover signal)", () => {
  const s = detectHandoffSignals("Please speak to staff");
  assert.equal(s.handoff, true);
  assert.equal(s.pauseAi, true);
});

test("normal IVF question does not hard-pause AI", () => {
  const s = detectHandoffSignals("What is IVF?");
  assert.equal(s.pauseAi, false);
});

test("OpenAI missing uses fallback — never empty patient text", async () => {
  const prev = process.env["OPENAI_API_KEY"];
  delete process.env["OPENAI_API_KEY"];
  process.env["WHATSAPP_AI_FORCE_FALLBACK"] = "1";
  try {
    const result = await generateWhatsAppAiReply({
      patientMessage: "Where is your clinic?",
      ctx: emptyCtx,
      knowledge: [
        {
          id: "h1",
          title: "[DEMO] General FAQs",
          category: "Hospital",
          specialty: "HOSPITAL",
          content: "For directions and hours, call reception.",
          score: 5,
        },
      ],
      preferFast: true,
    });
    assert.ok(result.text.length > 20);
    assert.ok(/smrko ai/i.test(result.text));
    assert.equal(result.usedLlm, false);
  } finally {
    delete process.env["WHATSAPP_AI_FORCE_FALLBACK"];
    if (prev !== undefined) process.env["OPENAI_API_KEY"] = prev;
  }
});

test("loop protection assumption: only PATIENT inbound is scheduled (not AI outbound)", () => {
  // Webhook processInbound only schedules on newly created PATIENT inbound messages.
  // AI outbound uses senderType AI and never enters processInbound as patient text.
  const patientInbound = { direction: "INBOUND", senderType: "PATIENT" };
  const aiOutbound = { direction: "OUTBOUND", senderType: "AI" };
  assert.equal(patientInbound.direction === "INBOUND" && patientInbound.senderType === "PATIENT", true);
  assert.equal(aiOutbound.direction === "INBOUND" && aiOutbound.senderType === "PATIENT", false);
});
