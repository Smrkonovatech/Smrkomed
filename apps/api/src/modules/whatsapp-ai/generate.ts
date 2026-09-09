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

function buildSystemPrompt(input: {
  ctx: WhatsAppAiContext;
  knowledge: KbHit[];
  promptHint?: string;
  intent?: string;
  toolFacts?: string;
  isGreeting?: boolean;
}): string {
  const isRegistered = input.ctx.isRegistered ?? Boolean(input.ctx.patientFirstName);
  const contextLines = [
    PATIENT_AI_SYSTEM_PROMPT,
    "",
    "CLINIC & PATIENT CONTEXT:",
    `- Clinic Name: ${input.ctx.clinicName}`,
    isRegistered
      ? (input.ctx.patientFirstName ? `- Patient First Name: ${input.ctx.patientFirstName}` : "- Patient Status: Registered")
      : "- Patient Status: New visitor (not yet registered in clinic records. Greet warmly if first message; do NOT mention registration unless they ask to book an appointment).",
    input.ctx.clinicSlug ? `- Online Booking URL: https://smrkomed.com/book/${input.ctx.clinicSlug}` : null,
    input.ctx.appointmentSummary ? `- Upcoming Appointment: ${input.ctx.appointmentSummary}` : null,
    input.ctx.journeyStage ? `- Treatment Stage: ${input.ctx.journeyStage}` : null,
    input.ctx.careTaskTitle ? `- Open Care Task: ${input.ctx.careTaskTitle}` : null,
    input.intent ? `- Classified User Intent: ${input.intent}` : null,
    "",
    "SYSTEM TOOL FACTS (Source of Truth — never invent beyond this):",
    input.toolFacts?.trim() || "No tools were run.",
    "",
    "KNOWLEDGE ARTICLES (Reference for clinic info):",
    formatKnowledgeForPrompt(input.knowledge),
    "",
    input.promptHint ? `Staff Instruction: ${input.promptHint}` : null,
  ].filter((x): x is string => Boolean(x));

  return contextLines.join("\n");
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
  const isRegistered = ctx.isRegistered ?? Boolean(ctx.patientFirstName);
  if (!isRegistered) {
    return (
      `✦ Smrko AI\n\n` +
      `Hello! 👋 Welcome to *${ctx.clinicName}*.\n\n` +
      `I can assist you with information about our fertility treatments, doctor consultations, clinic timings, pricing, or scheduling a visit.\n\n` +
      `💬 How can I help you today? (Reply with your question or type *MENU* to view quick options.)`
    );
  }
  const name = ctx.patientFirstName ? ` ${ctx.patientFirstName}` : "";
  return `✦ Smrko AI\n\nHello${name}! Thanks for messaging ${ctx.clinicName}. How can I help you today — appointments, clinic info, or something else? (I'm Smrko AI, not a doctor. Type *MENU* anytime.)`;
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

  // SmrkoMed platform, features, and purpose overview
  if (/\b(what\s*(is|does)?\s*smrko(med)?|why\s*smrko(med)?|about\s*smrko(med)?|who\s*is\s*smrko|wt\s*is\s*smrko)\b/i.test(input.patientMessage)) {
    return (
      `*SmrkoMed* (powered by Smrko AI) is the platform that powers our clinic's WhatsApp and phone services.\n\n` +
      `Here is what it helps you do right here on WhatsApp:\n` +
      `• *Doctor Appointments:* View open slots, book, or reschedule consultations.\n` +
      `• *Visit Reminders:* Get timely alerts so you never miss an appointment.\n` +
      `• *Treatment Tracking:* Stay updated on care steps, scans, and medications.\n` +
      `• *24/7 Information:* Ask about clinic timings, doctor profiles, or services anytime.\n\n` +
      `No extra app needed! Let me know if you'd like to check available slots or explore our treatments.`
    );
  }

  return `✦ Smrko AI\n\nHello${name}! I don't have a published knowledge article for that yet. Your care team can help — reply "speak to staff" if you'd like a human to take over.`;
}

async function callOpenAiChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string,
): Promise<string> {
  const key = process.env["OPENAI_API_KEY"]?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing on API server");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    console.log("[WhatsApp AI] OpenAI request started", { model, messageCount: messages.length });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 350,
        messages,
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
  intent?: string;
  toolFacts?: string;
}): Promise<GenerateAiResult> {
  if (input.forceEscalationCopy) {
    return {
      text: CLINICAL_ESCALATION_MESSAGE,
      model: "safety",
      usedLlm: false,
      blocked: false,
    };
  }

  // Fast path — immediately returns warm greeting/ack without OpenAI delay.
  if (isSimpleGreeting(input.patientMessage)) {
    console.log("[WhatsApp AI] fallback used", { reason: "greeting-fast" });
    return {
      text: greetingReply(input.ctx),
      model: "greeting-fast",
      usedLlm: false,
      blocked: false,
    };
  }
  if (isSimpleAck(input.patientMessage)) {
    console.log("[WhatsApp AI] fallback used", { reason: "ack-fast" });
    return {
      text: ackReply(input.ctx),
      model: "ack-fast",
      usedLlm: false,
      blocked: false,
    };
  }

  const model = process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini";
  const systemPrompt = buildSystemPrompt({
    ctx: input.ctx,
    knowledge: input.knowledge,
    ...(input.promptHint ? { promptHint: input.promptHint } : {}),
    ...(input.intent ? { intent: input.intent } : {}),
    ...(input.toolFacts ? { toolFacts: input.toolFacts } : {}),
    isGreeting: isSimpleGreeting(input.patientMessage),
  });

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Include up to 8 recent messages for conversation continuity
  const rawHistory = (input.ctx.recentMessages || []).slice(-8);
  const turns = [...rawHistory];

  // If the last message in history is the inbound patientMessage that was already saved to DB,
  // pop it so we don't send duplicate user turns.
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : undefined;
  if (
    lastTurn &&
    lastTurn.role === "patient" &&
    lastTurn.text.trim().toLowerCase() === input.patientMessage.trim().toLowerCase()
  ) {
    turns.pop();
  }

  for (const turn of turns) {
    const cleanContent = turn.text.replace(/^✦\s*Smrko\s*AI\s*\n+/i, "").trim();
    if (!cleanContent) continue;
    chatMessages.push({
      role: turn.role === "patient" ? "user" : "assistant",
      content: cleanContent,
    });
  }

  // Active message
  chatMessages.push({
    role: "user",
    content: input.patientMessage,
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
    let text = await callOpenAiChat(chatMessages, model);
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
    // Clean up any accidental trailing signature from the model (e.g. "— Smrko AI")
    text = text.replace(/(?:^|\n+)[—–-]\s*Smrko\s*AI\s*$/i, "").trim();
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
