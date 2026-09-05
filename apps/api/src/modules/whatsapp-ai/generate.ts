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

const SAFE_UNAVAILABLE_REPLY =
  "✦ Smrko AI\n\nI'm having trouble processing that right now. I can connect you with our care team — reply \"speak to staff\" if you'd like a human to take over.";

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
    "Rules for this reply:",
    "- Use ONLY the knowledge and context above for clinic-specific facts.",
    "- Do NOT invent pricing, doctor availability, clinic timings, or medical claims.",
    "- If the answer is not in knowledge, say so and offer staff help.",
    "",
    input.promptHint ? `Staff instruction: ${input.promptHint}` : null,
    `Patient message: ${input.patientMessage}`,
  ].filter((x): x is string => Boolean(x));
  return lines.join("\n");
}

/** Short greetings like "hi" / "hii" — always answer warmly without needing a KB hit. */
export function isSimpleGreeting(text: string): boolean {
  return /^(hi+|h+i+e*|hello|heyy*|yo|namaste|namaskar|good\s*(morning|afternoon|evening)|hola)\s*[!.]*$/i.test(
    text.trim(),
  );
}

/** Short acknowledgements — reply quickly without OpenAI. */
export function isSimpleAck(text: string): boolean {
  return /^(thanks|thank\s*you|thx|ok|okay|k|yes|yep|yeah|sure|got\s*it|alright|cool|great|nice)\s*[!.]*$/i.test(
    text.trim(),
  );
}

function greetingReply(ctx: WhatsAppAiContext): string {
  const name = ctx.patientFirstName ? ` ${ctx.patientFirstName}` : "";
  return `✦ Smrko AI\n\nHello${name}! Thanks for messaging ${ctx.clinicName}. How can I help you today — appointments, clinic info, or something else? (I'm Smrko AI, not a doctor.)`;
}

function ackReply(ctx: WhatsAppAiContext): string {
  const name = ctx.patientFirstName ? ` ${ctx.patientFirstName}` : "";
  return `✦ Smrko AI\n\nYou're welcome${name}! If you have another question about appointments or clinic info, just send it here.`;
}

function kbFallbackReply(input: {
  patientMessage: string;
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
}): string {
  if (isSimpleGreeting(input.patientMessage)) {
    return greetingReply(input.ctx);
  }
  if (isSimpleAck(input.patientMessage)) {
    return ackReply(input.ctx);
  }
  const name = input.ctx.patientFirstName ? ` ${input.ctx.patientFirstName}` : "";
  const hit = input.knowledge.find((k) => k.score > 0) ?? input.knowledge[0];
  if (hit && hit.score > 0) {
    const snippet = hit.content.replace(/\s+/g, " ").slice(0, 280);
    return `✦ Smrko AI\n\nHello${name}! Based on our clinic information about "${hit.title}":\n\n${snippet}\n\n(This may include DEMO / DEVELOPMENT content and is not medical advice.) If you need a doctor or staff member, just say so.`;
  }
  return `✦ Smrko AI\n\nHello${name}! I don't have a published knowledge article for that yet. Your care team can help — reply "speak to staff" if you'd like a human to take over.`;
}

async function callOpenAiChat(system: string, user: string, model: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing on API server");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    console.log("[WhatsApp AI] OpenAI request started", { model });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
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
    const text = String(json.choices?.[0]?.message?.content ?? "").trim();
    console.log("[WhatsApp AI] OpenAI response received", {
      model,
      chars: text.length,
    });
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWhatsAppAiReply(input: {
  patientMessage: string;
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
  promptHint?: string;
  forceEscalationCopy?: boolean;
  /** Inbound path: skip OpenAI for greetings/acks so replies stay fast. */
  preferFast?: boolean;
}): Promise<GenerateAiResult> {
  if (input.forceEscalationCopy) {
    return {
      text: CLINICAL_ESCALATION_MESSAGE,
      model: "safety",
      usedLlm: false,
      blocked: false,
    };
  }

  // Fast path — still produces an outbound reply (not silence).
  if (input.preferFast && isSimpleGreeting(input.patientMessage)) {
    console.log("[WhatsApp AI] fallback used", { reason: "greeting-fast" });
    return {
      text: greetingReply(input.ctx),
      model: "greeting-fast",
      usedLlm: false,
      blocked: false,
    };
  }
  if (input.preferFast && isSimpleAck(input.patientMessage)) {
    console.log("[WhatsApp AI] fallback used", { reason: "ack-fast" });
    return {
      text: ackReply(input.ctx),
      model: "ack-fast",
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
  if (!key || env.nodeEnv === "test" || process.env["WHATSAPP_AI_FORCE_FALLBACK"] === "1") {
    console.log("[WhatsApp AI] fallback used", {
      reason: !key ? "OPENAI_API_KEY=MISSING" : "test_or_force_fallback",
    });
    return {
      text: kbFallbackReply(input),
      model: "kb-fallback",
      usedLlm: false,
      blocked: false,
    };
  }

  try {
    const system = isSimpleGreeting(input.patientMessage)
      ? `${PATIENT_AI_SYSTEM_PROMPT}\n\nThe patient sent a short greeting. Reply with a warm 1–3 sentence welcome from Smrko AI for this clinic and invite their question. Do not diagnose.`
      : PATIENT_AI_SYSTEM_PROMPT;
    let text = await callOpenAiChat(system, user, model);
    if (!text) {
      console.log("[WhatsApp AI] fallback used", { reason: "empty_openai_text" });
      return {
        text: kbFallbackReply(input) || SAFE_UNAVAILABLE_REPLY,
        model: "kb-fallback-empty",
        usedLlm: true,
        blocked: false,
      };
    }
    if (isUnsafeAiOutput(text)) {
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
  } catch (err) {
    console.error(
      "[WhatsApp AI] OpenAI failed — using KB/greeting fallback:",
      err instanceof Error ? err.message : err,
    );
    console.log("[WhatsApp AI] fallback used", {
      reason: err instanceof Error ? err.message.slice(0, 120) : "openai_error",
    });
    const fallback = kbFallbackReply(input);
    return {
      text: fallback || SAFE_UNAVAILABLE_REPLY,
      model: "kb-fallback-error",
      usedLlm: false,
      blocked: false,
    };
  }
}
