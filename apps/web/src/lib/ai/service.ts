import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma, writeTenantAuditLog, type TenantContext } from "@smrkomed/database";

import { AI_LIMITS, AI_MODEL, AiConfigError, AiUserError, assertOpenAIConfigured } from "./config";
import { coupleSlugFromPath, describePageContext, normalizePageContext } from "./context";
import { canUseAi, allowedTools } from "./permissions";
import { SMRKO_SYSTEM_PROMPT } from "./prompts";
import { isMedicalDecisionRequest, sanitizeUserFacingError } from "./safety";
import { AI_TOOL_DEFINITIONS, executeToolAndSerialize } from "./tools";
import type { AiChatMessage, AiChatResult, AiPageContext, AiProposedAction, AiToolName } from "./types";

async function loadClinicKnowledgeSnippet(clinicId: string) {
  try {
    const articles = await prisma.whatsAppKnowledgeArticle.findMany({
      where: { clinicId, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      take: 16,
      select: { title: true, category: true, content: true, keywords: true, specialty: true },
    });
    if (!articles.length) {
      return "\n\nClinic WhatsApp Knowledge Base: no published articles. If asked about clinic-specific policy not in SmrkoMed records, say the information is unavailable and staff should confirm.";
    }
    const body = articles
      .map((a) => {
        const meta = [a.category, a.specialty, a.keywords].filter(Boolean).join(" · ");
        return `### ${a.title}${meta ? ` (${meta})` : ""}\n${a.content.slice(0, 1200)}`;
      })
      .join("\n\n");
    return `\n\nClinic WhatsApp Knowledge Base (PUBLISHED only — clinic-scoped):\n${body}\n\nRules: Use only published knowledge + SmrkoMed records. Never invent clinic policies, dosages, or clinical advice. Never diagnose, prescribe, or auto-send WhatsApp. If information is not in the knowledge base or records, clearly say it is unavailable.`;
  } catch {
    return "";
  }
}

function getClient() {
  return new OpenAI({ apiKey: assertOpenAIConfigured() });
}

function normalizeMessages(raw: unknown): AiChatMessage[] {
  if (!Array.isArray(raw)) throw new AiUserError("Messages are required.");
  const messages = raw
    .filter((item): item is AiChatMessage => {
      if (!item || typeof item !== "object") return false;
      const role = (item as { role?: string }).role;
      const content = (item as { content?: string }).content;
      return (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim().length > 0
      );
    })
    .slice(-AI_LIMITS.maxMessages)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, AI_LIMITS.maxMessageChars),
    }));
  if (!messages.length) throw new AiUserError("Please enter a message.");
  if (messages[messages.length - 1]?.role !== "user") {
    throw new AiUserError("Last message must be from the user.");
  }
  return messages;
}

function extractNavigation(text: string, toolPayloads: string[]): AiChatResult["navigation"] {
  const routes: { label: string; href: string }[] = [];
  for (const payload of toolPayloads) {
    try {
      const parsed = JSON.parse(payload) as { routes?: { label: string; href: string }[] };
      if (Array.isArray(parsed.routes)) routes.push(...parsed.routes);
    } catch {
      /* ignore */
    }
  }
  const hrefMatch = text.match(/\]\((\/[a-z0-9\-/_]+)\)/gi);
  if (hrefMatch) {
    for (const m of hrefMatch) {
      const href = m.replace(/^\]\(|\)$/g, "");
      routes.push({ label: "Open", href });
    }
  }
  const unique = new Map(routes.map((r) => [r.href, r]));
  return unique.size ? [...unique.values()].slice(0, 4) : undefined;
}

function extractDraft(toolPayloads: string[]): string | undefined {
  for (const payload of toolPayloads) {
    try {
      const parsed = JSON.parse(payload) as { draft?: string; sent?: boolean };
      if (typeof parsed.draft === "string" && parsed.sent === false) return parsed.draft;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function extractProposedAction(toolPayloads: string[]): AiProposedAction | undefined {
  for (const payload of toolPayloads) {
    try {
      const parsed = JSON.parse(payload) as {
        proposedAction?: AiProposedAction;
        created?: boolean;
      };
      if (parsed.proposedAction?.type === "createTask" && parsed.created === false) {
        return parsed.proposedAction;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export async function runSmrkoAiChat(input: {
  tenant: TenantContext;
  messages: unknown;
  pageContext?: unknown;
}): Promise<AiChatResult> {
  if (!canUseAi(input.tenant)) {
    throw new AiUserError("You do not have permission to use Smrko AI.");
  }

  const messages = normalizeMessages(input.messages);
  const page = normalizePageContext(input.pageContext);
  if (!page.coupleSlug) {
    const fromPath = coupleSlugFromPath(page.pathname);
    if (fromPath) page.coupleSlug = fromPath;
  }

  const lastUser = messages[messages.length - 1]!.content;
  const medicalHint = isMedicalDecisionRequest(lastUser)
    ? "\n\nNote: The user may be asking for a clinical decision. Remind them that Smrko AI summarizes records only and clinical judgment remains with the clinician."
    : "";

  const knowledge = await loadClinicKnowledgeSnippet(input.tenant.clinicId);

  const openaiMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${SMRKO_SYSTEM_PROMPT}\n\nClinic: ${input.tenant.clinicName}\nUser role: ${input.tenant.role}\n${describePageContext(page)}${medicalHint}${knowledge}`,
    },
    ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
  ];

  const client = getClient();
  const toolPayloads: string[] = [];
  let loops = 0;
  const permitted = new Set(allowedTools(input.tenant));
  const tools = AI_TOOL_DEFINITIONS.filter((tool) =>
    permitted.has(tool.function.name as AiToolName),
  );

  while (loops < AI_LIMITS.maxToolCalls) {
    loops += 1;
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: openaiMessages,
      ...(tools.length ? { tools, tool_choice: "auto" as const } : {}),
      temperature: 0.2,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) throw new Error("Empty OpenAI response");

    if (choice.tool_calls?.length) {
      openaiMessages.push({
        role: "assistant",
        content: choice.content ?? "",
        tool_calls: choice.tool_calls,
      });
      for (const call of choice.tool_calls) {
        if (call.type !== "function") continue;
        const toolName = call.function.name as AiToolName;
        const serialized = await executeToolAndSerialize(
          input.tenant,
          toolName,
          call.function.arguments ?? "{}",
          page,
        );
        toolPayloads.push(serialized);
        openaiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: serialized,
        });
      }
      continue;
    }

    const reply = (choice.content ?? "").trim() || "I don't have that information in SmrkoMed.";
    void writeTenantAuditLog(input.tenant, {
      action: "ai.chat",
      entityType: "AiBuddy",
      metadata: { pathname: page.pathname, tools: toolPayloads.length },
    }).catch(() => undefined);

    const navigation = extractNavigation(reply, toolPayloads);
    const draftMessage = extractDraft(toolPayloads);
    const proposedAction = extractProposedAction(toolPayloads);

    return {
      reply,
      ...(navigation ? { navigation } : {}),
      ...(draftMessage ? { draftMessage } : {}),
      ...(proposedAction ? { proposedAction } : {}),
    };
  }

  throw new AiUserError("That request needed too many steps. Please try a simpler question.");
}

export function toAiHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof AiConfigError) {
    return { status: 503, message: sanitizeUserFacingError(error) };
  }
  if (error instanceof AiUserError) {
    return { status: 400, message: sanitizeUserFacingError(error) };
  }
  console.error("Smrko AI error:", error);
  return { status: 502, message: sanitizeUserFacingError(error) };
}

export type { AiPageContext, AiChatResult };
