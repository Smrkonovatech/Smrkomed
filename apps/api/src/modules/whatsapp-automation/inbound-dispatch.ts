/**
 * Phase 4 — production inbound WhatsApp → automation wiring.
 * Dispatched asynchronously after message persistence (webhook stays fast).
 * Reuses dispatchWhatsAppTrigger + existing engine — no second bus.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { runExecution } from "./engine";
import { dispatchWhatsAppTrigger } from "./triggers";
import { mergeExecutionContext, parseExecutionContext } from "./context";
import { nextNodes, parseDefinition } from "./validate";

function scheduleBackground(task: () => Promise<void>) {
  const run = () => {
    void task().catch((err) => {
      console.error(
        "[WhatsApp automation] background task failed:",
        err instanceof Error ? err.message : err,
      );
    });
  };
  if (typeof setImmediate === "function") {
    setImmediate(run);
  } else {
    queueMicrotask(run);
  }
}

/** Safe automation vars — never secrets / tokens / credentials. */
export function buildIncomingWhatsAppVars(input: {
  clinicId: string;
  clinicName?: string;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  leadId?: string | null;
  messageId: string;
  messageType: string;
  messageText: string;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  mediaCaption?: string | null;
  unmatched?: boolean;
  timestampIso: string;
}): Record<string, string> {
  const text = (input.messageText ?? "").slice(0, 2000);
  return {
    clinic_id: input.clinicId,
    clinic_name: input.clinicName ?? "",
    conversation_id: input.conversationId,
    patient_id: input.patientId ?? "",
    couple_id: input.coupleId ?? "",
    lead_id: input.leadId ?? "",
    message_id: input.messageId,
    message_type: input.messageType,
    message_text: text,
    message_content: text,
    media_type: input.mediaType ?? "",
    media_mime_type: input.mediaMimeType ?? "",
    media_caption: (input.mediaCaption ?? "").slice(0, 500),
    unmatched: input.unmatched ? "true" : "false",
    inbound_at: input.timestampIso,
  };
}

async function resolveCoupleId(clinicId: string, patientId: string | null): Promise<string | null> {
  if (!patientId) return null;
  const couple = await prisma.couple.findFirst({
    where: {
      clinicId,
      OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
    },
    select: { id: true },
  });
  return couple?.id ?? null;
}

async function resolveLeadId(clinicId: string, phone: string | null): Promise<string | null> {
  if (!phone) return null;
  const suffix = phone.replace(/\D/g, "").slice(-10);
  if (suffix.length < 8) return null;
  const lead = await prisma.lead.findFirst({
    where: {
      clinicId,
      phone: { contains: suffix },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  return lead?.id ?? null;
}

async function clinicTenant(clinicId: string): Promise<TenantContext | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, organizationId: true },
  });
  if (!clinic) return null;
  return {
    userId: "system-webhook",
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: "",
  };
}

/**
 * Resume executions parked on WAIT_FOR_REPLY / WAIT mode=wait_for_reply for this conversation.
 */
export async function resumeWaitForReplyExecutions(input: {
  tenant: TenantContext;
  conversationId: string;
  inboundVars?: Record<string, string>;
}) {
  const waiting = await prisma.whatsAppFlowExecution.findMany({
    where: {
      clinicId: input.tenant.clinicId,
      conversationId: input.conversationId,
      status: "WAITING",
    },
    take: 25,
    orderBy: { updatedAt: "asc" },
  });

  const resumed: Array<{ executionId: string; status?: string; skipped?: string }> = [];

  for (const row of waiting) {
    const ctx = parseExecutionContext(row.context);
    if (ctx.waitKind !== "reply") continue;

    const flow = await prisma.whatsAppFlow.findFirst({
      where: { id: row.flowId, clinicId: input.tenant.clinicId },
    });
    if (!flow || flow.status !== "ACTIVE") {
      resumed.push({ executionId: row.id, skipped: "flow_not_active" });
      continue;
    }

    const def = parseDefinition(flow.definition);
    const waitId = row.currentNodeId;
    const nextId =
      ctx.waitNextNodeId ?? (waitId ? nextNodes(def, waitId)[0]?.id : null) ?? row.currentNodeId;

    const mergedVars = {
      ...(ctx.vars ?? {}),
      ...(input.inboundVars ?? {}),
      patient_replied: "true",
    };

    await prisma.whatsAppFlowExecution.update({
      where: { id: row.id },
      data: {
        status: "PENDING",
        currentNodeId: nextId,
        resumeAt: null,
        error: null,
        context: mergeExecutionContext(ctx, {
          vars: mergedVars,
          waitKind: null,
          waitNextNodeId: null,
          lockedAt: null,
          lockToken: null,
          lockExpiresAt: null,
        }),
      },
    });

    try {
      const ran = await runExecution(input.tenant, row.id);
      resumed.push({ executionId: row.id, status: ran.status });
    } catch (err) {
      resumed.push({
        executionId: row.id,
        skipped: err instanceof Error ? err.message : "resume_failed",
      });
    }
  }

  return resumed;
}

/**
 * After a NEW inbound message is persisted: resume wait-for-reply, then start INCOMING_WHATSAPP flows.
 */
export async function handleInboundWhatsAppAutomation(input: {
  clinicId: string;
  conversationId: string;
  patientId?: string | null;
  contactPhone?: string | null;
  unmatched?: boolean;
  messageId: string;
  providerMessageId: string;
  messageType: string;
  messageText: string;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  mediaCaption?: string | null;
  timestampIso: string;
}) {
  const tenant = await clinicTenant(input.clinicId);
  if (!tenant) return { skipped: "clinic_not_found" as const };

  const coupleId = await resolveCoupleId(input.clinicId, input.patientId ?? null);
  const leadId = await resolveLeadId(input.clinicId, input.contactPhone ?? null);

  const vars = buildIncomingWhatsAppVars({
    clinicId: input.clinicId,
    clinicName: tenant.clinicName,
    conversationId: input.conversationId,
    patientId: input.patientId ?? null,
    coupleId,
    leadId,
    messageId: input.messageId,
    messageType: input.messageType,
    messageText: input.messageText,
    mediaType: input.mediaType ?? null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaCaption: input.mediaCaption ?? null,
    unmatched: input.unmatched ?? false,
    timestampIso: input.timestampIso,
  });

  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: input.conversationId,
    inboundVars: vars,
  }).catch((err) => {
    console.error(
      "[WhatsApp automation] resume wait-for-reply failed:",
      err instanceof Error ? err.message : err,
    );
    return [] as Awaited<ReturnType<typeof resumeWaitForReplyExecutions>>;
  });

  const dispatched = await dispatchWhatsAppTrigger({
    tenant,
    triggerType: "INCOMING_WHATSAPP",
    triggerEventId: `wa_in_${input.providerMessageId}`,
    patientId: input.patientId ?? null,
    coupleId,
    conversationId: input.conversationId,
    vars,
  }).catch((err) => {
    console.error(
      "[WhatsApp automation] INCOMING_WHATSAPP dispatch failed:",
      err instanceof Error ? err.message : err,
    );
    return { matched: 0, executions: [] as string[] };
  });

  // AI auto-reply runs independently of automation — never blocked by flow errors.
  let ai: unknown = null;
  try {
    const { runWhatsAppAiPipeline } = await import("../whatsapp-ai/pipeline");
    ai = await runWhatsAppAiPipeline({
      tenant,
      conversationId: input.conversationId,
      patientMessage: input.messageText || `(${input.messageType} message)`,
      trigger: "inbound",
      mode: "send",
    });
    console.log("[WhatsApp AI] inbound result", {
      conversationId: input.conversationId,
      messageId: input.messageId,
      skipped: Boolean((ai as { skipped?: boolean })?.skipped),
      reason: (ai as { reason?: string })?.reason ?? null,
      handoff: Boolean((ai as { handoff?: boolean })?.handoff),
      sentMessageId: (ai as { messageId?: string })?.messageId ?? null,
    });
  } catch (err) {
    console.error(
      "[WhatsApp AI] inbound pipeline failed:",
      err instanceof Error ? err.message : err,
    );
  }

  return { resumed, dispatched, ai };
}

/** Fire-and-forget from webhook after successful NEW message create. */
export function scheduleInboundWhatsAppAutomation(
  input: Parameters<typeof handleInboundWhatsAppAutomation>[0],
) {
  scheduleBackground(async () => {
    await handleInboundWhatsAppAutomation(input);
  });
}

/** Shared Care Loop → automation dispatch helper. */
export async function dispatchCareLoopTrigger(input: {
  tenant: TenantContext;
  triggerType:
    | "CARE_TASK_CREATED"
    | "CARE_TASK_ASSIGNED"
    | "CARE_TASK_COMPLETED"
    | "CARE_LOOP_STAGE_CHANGED"
    | "CARE_LOOP_ESCALATED"
    | "CARE_TASK_DUE"
    | "CARE_TASK_OVERDUE";
  triggerEventId: string;
  coupleId?: string | null;
  patientId?: string | null;
  vars?: Record<string, string>;
}) {
  return dispatchWhatsAppTrigger({
    tenant: input.tenant,
    triggerType: input.triggerType,
    triggerEventId: input.triggerEventId,
    ...(input.coupleId != null ? { coupleId: input.coupleId } : {}),
    ...(input.patientId != null ? { patientId: input.patientId } : {}),
    ...(input.vars ? { vars: input.vars } : {}),
  });
}
