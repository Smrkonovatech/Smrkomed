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

/** Start work immediately (do not wait for setImmediate — more reliable on Railway). */
function scheduleBackground(task: () => Promise<void>) {
  void task().catch((err) => {
    console.error(
      "[WhatsApp automation] background task failed:",
      err instanceof Error ? err.message : err,
    );
  });
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
    ...(text.startsWith("appt_doctor_")
      ? {
          selectedDoctorId: text.replace("appt_doctor_", ""),
          selected_doctor_id: text.replace("appt_doctor_", ""),
        }
      : {}),
    ...(text.startsWith("appt_date_")
      ? {
          selectedDate: text.replace("appt_date_", ""),
          selected_date: text.replace("appt_date_", ""),
        }
      : {}),
    ...(text.startsWith("appt_slot_")
      ? {
          selectedSlotId: text.replace("appt_slot_", ""),
          selected_slot_id: text.replace("appt_slot_", ""),
        }
      : {}),
    ...(text === "appt_confirm" ? { appointmentConfirmed: "true" } : {}),
    ...(text === "appt_cancel" ? { appointmentCancelled: "true" } : {}),
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
    const isLiveTest =
      ctx.vars?.["is_live_test"] === "true" ||
      Boolean(row.triggerEventId?.startsWith("live_test_"));
    // Normal production executions require ACTIVE flow; explicit LIVE_WHATSAPP tests can test and resume saved DRAFT flows
    if (!flow || (flow.status !== "ACTIVE" && !isLiveTest)) {
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

/** Ensure settings row exists; respect clinic opt-out. Kill switch: WHATSAPP_AI_AUTO_REPLY=0. */
export async function ensureInboundAiEnabled(clinicId: string): Promise<boolean> {
  if (process.env["WHATSAPP_AI_AUTO_REPLY"] === "0") {
    console.log("[WhatsApp AI] disabled by WHATSAPP_AI_AUTO_REPLY=0");
    return false;
  }
  try {
    const row = await prisma.whatsAppClinicSettings.upsert({
      where: { clinicId },
      create: { clinicId, aiAutoReplyEnabled: true },
      update: {},
    });
    return row.aiAutoReplyEnabled;
  } catch (err) {
    console.error(
      "[WhatsApp AI] failed to load aiAutoReplyEnabled:",
      err instanceof Error ? err.message : err,
    );
    // Fail open so patients still get a reply when settings table has issues
    return true;
  }
}

type InboundPayload = {
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
  /** When true, AI already ran in the webhook — only run flows. */
  skipAi?: boolean;
};

/** Run Smrko AI auto-reply for one inbound patient message (background after webhook). */
export async function runInboundWhatsAppAi(input: InboundPayload) {
  console.log("[WhatsApp AI] inbound scheduled", {
    clinicId: input.clinicId,
    conversationId: input.conversationId,
    messageId: input.messageId,
  });

  const tenant = await clinicTenant(input.clinicId);
  if (!tenant) {
    console.error("[WhatsApp AI] clinic tenant missing", { clinicId: input.clinicId });
    return { skipped: true as const, reason: "clinic_not_found" };
  }

  const aiAllowed = await ensureInboundAiEnabled(input.clinicId);
  if (!aiAllowed) {
    console.log("[WhatsApp AI] inbound skipped — auto-reply OFF", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
    });
    return { skipped: true as const, reason: "Clinic AI auto-reply disabled" };
  }

  try {
    const { runWhatsAppAiPipeline } = await import("../whatsapp-ai/pipeline");
    // force:false — clinic toggle + human takeover must be respected for auto-reply.
    // Staff "Send AI reply now" uses force:true separately.
    const ai = await runWhatsAppAiPipeline({
      tenant,
      conversationId: input.conversationId,
      patientMessage: input.messageText || `(${input.messageType} message)`,
      trigger: "inbound",
      mode: "send",
      force: false,
      inboundMessageId: input.messageId,
    });
    console.log("[WhatsApp AI] inbound result", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      skipped: Boolean(ai.skipped),
      reason: ai.reason ?? null,
      handoff: Boolean(ai.handoff),
      sentMessageId: ai.messageId ?? null,
      interactionId: ai.interactionId ?? null,
      textPreview: String(ai.text ?? "").slice(0, 80),
    });
    return ai;
  } catch (err) {
    console.error("[WhatsApp AI] pipeline failed", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      error: err instanceof Error ? err.message : err,
    });
    return {
      skipped: true as const,
      reason: err instanceof Error ? err.message : "AI pipeline failed",
    };
  }
}

export async function handleInboundWhatsAppAutomation(input: InboundPayload) {
  console.log("[WhatsApp inbound] processing", {
    clinicId: input.clinicId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    messageType: input.messageType,
    preview: (input.messageText ?? "").slice(0, 80),
  });

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

  // 1. Resume waiting executions first!
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

  const hasResumedActive = resumed.some((r) => r.status && r.status !== "FAILED" && !r.skipped);
  if (hasResumedActive) {
    console.log("[WhatsApp inbound] active flow resumed, bypassing new dispatch and general AI", {
      resumed,
      conversationId: input.conversationId,
    });
    return { resumed, dispatched: null, ai: { skipped: true as const, reason: "flow_resumed" } };
  }

  // 2. Check if this is an appointment intent or interactive appointment button
  const { classifyPatientIntent } = await import("../whatsapp-ai/intent");
  const intentResult = classifyPatientIntent(input.messageText);
  const isApptIntent =
    input.messageText.startsWith("appt_") ||
    intentResult.intent === "APPOINTMENT_BOOKING" ||
    intentResult.intent === "APPOINTMENT_RESCHEDULE" ||
    intentResult.intent === "APPOINTMENT_CANCEL";

  // 3. Dispatch INCOMING_WHATSAPP trigger
  const dispatched = await dispatchWhatsAppTrigger({
    tenant,
    triggerType: "INCOMING_WHATSAPP",
    triggerEventId: `wa_in_${input.providerMessageId}`,
    patientId: input.patientId ?? null,
    coupleId,
    conversationId: input.conversationId,
    vars: {
      ...vars,
      detected_intent: intentResult.intent,
      is_appointment_intent: isApptIntent ? "true" : "false",
    },
  }).catch((err) => {
    console.error(
      "[WhatsApp automation] INCOMING_WHATSAPP dispatch failed:",
      err instanceof Error ? err.message : err,
    );
    return { matched: 0, results: [] };
  });

  // 4. If an ACTIVE flow matched and started, or if appointment intent is matched by active automation, skip general AI
  const activeFlowStarted = (dispatched.results ?? []).some((r) => r.executionId && !r.error);
  if (activeFlowStarted || (isApptIntent && (dispatched.matched ?? 0) > 0)) {
    console.log("[WhatsApp inbound] automation flow active/started for appointment intent, bypassing generic AI", {
      isApptIntent,
      activeFlowStarted,
      intent: intentResult.intent,
    });
    return { resumed, dispatched, ai: { skipped: true as const, reason: "flow_active_or_appointment_intent" } };
  }

  // 5. Fallback to general AI auto-reply only when no automation is active
  const ai = input.skipAi
    ? { skipped: true as const, reason: "already_ran_in_webhook" }
    : await runInboundWhatsAppAi(input);

  return { resumed, dispatched, ai };
}

/**
 * Fire-and-forget inbound AI + automation.
 * Must respect `skipAi` — hardcoding true previously dropped all AI retries when
 * the webhook await timed out or Meta aborted the request.
 */
export function scheduleInboundWhatsAppAutomation(
  input: InboundPayload & { skipAi?: boolean },
) {
  const skipAi = Boolean(input.skipAi);
  console.log("[WhatsApp AI] inbound scheduled", {
    conversationId: input.conversationId,
    messageId: input.messageId,
    skipAi,
  });
  scheduleBackground(async () => {
    await handleInboundWhatsAppAutomation({ ...input, skipAi });
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
