import { env } from "../../config/env";
import type { KbHit } from "./knowledge";
import { formatKnowledgeForPrompt } from "./knowledge";
import {
  CLINICAL_ESCALATION_MESSAGE,
  PATIENT_AI_SYSTEM_PROMPT,
  isUnsafeAiOutput,
} from "./safety";
import type { WhatsAppAiContext } from "./context";

export type GenerateAiResult = {
  text: string;
  model: string;
  usedLlm: boolean;
  blocked: boolean;
};

function buildUserPrompt(input: {
  patientMessage: string;
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
  promptHint?: string;
}) {
  const lines = [
    `Clinic: ${input.ctx.clinicName}`,
    input.ctx.patientFirstName ? `Patient first name: ${input.ctx.patientFirstName}` : null,
    input.ctx.appointmentSummary ? `Upcoming appointment: ${input.ctx.appointmentSummary}` : null,
    input.ctx.journeyStage ? `Journey stage: ${input.ctx.journeyStage}` : null,
    input.ctx.careTaskTitle ? `Open care task: ${input.ctx.careTaskTitle}` : null,
    "",
    "Recent conversation:",
    ...input.ctx.recentMessages.map((m) => `${m.role}: ${m.text}`),
    "",
    "Knowledge (may include DEMO / DEVELOPMENT CONTENT — not verified medical advice):",
    formatKnowledgeForPrompt(input.knowledge),
    "",
    input.promptHint ? `Staff instruction: ${input.promptHint}` : null,
    `Patient message: ${input.patientMessage}`,
  ].filter((x): x is string => Boolean(x));
  return lines.join("\n");
}

function kbFallbackReply(input: {
  patientMessage: string;
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
}): string {
  const name = input.ctx.patientFirstName ? ` ${input.ctx.patientFirstName}` : "";
  const hit = input.knowledge.find((k) => k.score > 0) ?? input.knowledge[0];
  if (hit && hit.score > 0) {
    const snippet = hit.content.replace(/\s+/g, " ").slice(0, 280);
    return `✦ Smrko AI\n\nHello${name}! Based on our clinic information about "${hit.title}":\n\n${snippet}\n\n(This may include DEMO / DEVELOPMENT content and is not medical advice.) If you need a doctor or staff member, just say so.`;
  }
  return `✦ Smrko AI\n\nHello${name}! I don't have a published knowledge article for that yet. Your care team can help — reply "staff" if you'd like a human to take over.`;
}

async function callOpenAiChat(system: string, user: string, model: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return String(json.choices?.[0]?.message?.content ?? "").trim();
}

export async function generateWhatsAppAiReply(input: {
  patientMessage: string;
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
  promptHint?: string;
  forceEscalationCopy?: boolean;
}): Promise<GenerateAiResult> {
  if (input.forceEscalationCopy) {
    return {
      text: CLINICAL_ESCALATION_MESSAGE,
      model: "safety",
      usedLlm: false,
      blocked: false,
    };
  }

  const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini";
  const user = buildUserPrompt({
    patientMessage: input.patientMessage,
    ctx: input.ctx,
    knowledge: input.knowledge,
    ...(input.promptHint ? { promptHint: input.promptHint } : {}),
  });

  const key = process.env["OPENAI_API_KEY"]?.trim();
  // Tests / local without key: KB-only deterministic reply (never invent clinical advice)
  if (!key || env.nodeEnv === "test" || process.env["WHATSAPP_AI_FORCE_FALLBACK"] === "1") {
    return {
      text: kbFallbackReply(input),
      model: "kb-fallback",
      usedLlm: false,
      blocked: false,
    };
  }

  try {
    let text = await callOpenAiChat(PATIENT_AI_SYSTEM_PROMPT, user, model);
    if (!text || isUnsafeAiOutput(text)) {
      return {
        text: CLINICAL_ESCALATION_MESSAGE,
        model,
        usedLlm: true,
        blocked: true,
      };
    }
    if (!/smrko ai/i.test(text)) {
      text = `✦ Smrko AI\n\n${text}`;
    }
    return { text, model, usedLlm: true, blocked: false };
  } catch {
    return {
      text: kbFallbackReply(input),
      model: "kb-fallback-error",
      usedLlm: false,
      blocked: false,
    };
  }
}
