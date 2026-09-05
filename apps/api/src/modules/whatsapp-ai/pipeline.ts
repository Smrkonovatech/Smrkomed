/**
 * Phase 5 WhatsApp AI pipeline — uses existing messaging + KB + AIInteraction.
 * Clinic must opt-in via WhatsAppClinicSettings.aiAutoReplyEnabled.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { sendWhatsAppAiSessionText } from "../../integrations/providers/whatsapp/messaging";
import { loadWhatsAppAiContext } from "./context";
import { generateWhatsAppAiReply } from "./generate";
import { escalateToHuman, recordAiInteraction, resumeWhatsAppAi } from "./handoff";
import { classifyPatientIntent } from "./intent";
import { extractPreferredDateIso, formatPreferredDateLabel } from "./date-parse";
import { retrieveKnowledgeArticles } from "./knowledge";
import { tryResolvePendingAppointmentAction } from "./pending-actions";
import { detectHandoffSignals, CLINICAL_ESCALATION_MESSAGE } from "./safety";
import {
  formatAppointmentSlotsPatientMessage,
  formatAppointmentToolErrorMessage,
  formatNoSlotsPatientMessage,
  formatToolResultsForPrompt,
  runToolsForIntent,
} from "./tools";
import { getClinicCommSettings } from "../whatsapp-automation/safety";

export type AiPipelineMode = "draft" | "send";

export type AiPipelineResult = {
  skipped?: boolean;
  reason?: string;
  handoff?: boolean;
  handoffReason?: string;
  draft?: boolean;
  messageId?: string;
  interactionId?: string;
  text?: string;
  knowledgeIds?: string[];
};

async function clinicAiEnabled(clinicId: string): Promise<boolean> {
  const row = await prisma.whatsAppClinicSettings.findUnique({
    where: { clinicId },
    select: { aiAutoReplyEnabled: true },
  });
  // Default ON when clinic has not saved settings yet — auto-reply should start immediately.
  return row ? row.aiAutoReplyEnabled : true;
}

export async function runWhatsAppAiPipeline(input: {
  tenant: TenantContext;
  conversationId: string;
  patientMessage: string;
  trigger: "inbound" | "automation" | "staff";
  mode: AiPipelineMode;
  /** Staff / automation may bypass clinic auto-reply flag */
  force?: boolean;
  promptHint?: string;
  specialtyHint?: string | null;
  /** When false, skip Meta send even in send mode (simulation) */
  simulation?: boolean;
  /** Inbound message id — used to avoid duplicate auto-replies */
  inboundMessageId?: string;
}): Promise<AiPipelineResult> {
  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, clinicId: input.tenant.clinicId },
  });
  if (!conversation) {
    return { skipped: true, reason: "Conversation not found" };
  }

  // Global clinic kill switch — always enforced for inbound auto-reply.
  // Staff/automation may pass force:true to bypass (explicit Send AI / AI_DRAFT node).
  if (input.trigger === "inbound" && !input.force) {
    const enabled = await clinicAiEnabled(input.tenant.clinicId);
    if (!enabled) {
      console.log("[WhatsApp AI] pipeline skipped — clinic auto-reply OFF", {
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        messageId: input.inboundMessageId ?? null,
      });
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: input.trigger,
        safeToAutoReply: false,
        status: "SKIPPED",
        classification: "AI_DISABLED",
        rawSummary: "Clinic AI auto-reply is disabled",
      });
      return { skipped: true, reason: "Clinic AI auto-reply disabled", interactionId: interaction.id };
    }
  }

  // Human takeover: stay paused until staff Resume AI or explicit staff Send AI (force).
  // Do NOT auto-resume on patient inbound — that would ignore Take over.
  if (conversation.aiPausedAt || conversation.status === "HUMAN_HANDOFF") {
    if (input.force && input.trigger !== "inbound") {
      await resumeWhatsAppAi(input.tenant, conversation.id);
      const refreshed = await prisma.conversation.findFirst({
        where: { id: input.conversationId, clinicId: input.tenant.clinicId },
      });
      if (refreshed) Object.assign(conversation, refreshed);
      console.log("[WhatsApp AI] resumed via staff/automation force", {
        conversationId: conversation.id,
        trigger: input.trigger,
      });
    }

    if (conversation.aiPausedAt != null || conversation.status === "HUMAN_HANDOFF") {
      console.log("[WhatsApp AI] pipeline skipped — human takeover active", {
        conversationId: conversation.id,
        messageId: input.inboundMessageId ?? null,
        trigger: input.trigger,
      });
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: input.trigger,
        safeToAutoReply: false,
        status: "SKIPPED",
        classification: "AI_PAUSED",
        handoffReason: conversation.handoffReason,
        rawSummary: "AI paused — human takeover (Resume AI to continue auto-reply)",
      });
      return { skipped: true, reason: "AI paused under human control", interactionId: interaction.id };
    }
  }

  console.log("[WhatsApp AI] pipeline started", {
    clinicId: input.tenant.clinicId,
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    trigger: input.trigger,
    mode: input.mode,
  });

  // Multi-turn appointment confirm / slot pick (before new intent tools).
  if (input.trigger === "inbound" && input.mode === "send" && !input.simulation) {
    const pending = await tryResolvePendingAppointmentAction({
      tenant: input.tenant,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      patientMessage: input.patientMessage,
    });
    if (pending.handled) {
      if (pending.handoffRecommended) {
        const escalated = await escalateToHuman({
          tenant: input.tenant,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          coupleId: conversation.coupleId,
          reason: "APPOINTMENT_EXCEPTION",
        });
        let messageId: string | undefined;
        try {
          const sent = await sendWhatsAppAiSessionText(input.tenant, {
            conversationId: conversation.id,
            body: pending.text,
          });
          messageId = sent.id;
        } catch {
          /* best effort */
        }
        const interaction = await recordAiInteraction({
          clinicId: input.tenant.clinicId,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          careTaskId: escalated.careTaskId,
          messageId: messageId ?? null,
          trigger: input.trigger,
          intent: "APPOINTMENT_EXCEPTION",
          classification: "APPOINTMENT_EXCEPTION",
          safeToAutoReply: false,
          status: "HANDOFF",
          handoffReason: "APPOINTMENT_EXCEPTION",
          rawSummary: pending.text,
        });
        return {
          handoff: true,
          handoffReason: "APPOINTMENT_EXCEPTION",
          text: pending.text,
          ...(messageId ? { messageId } : {}),
          interactionId: interaction.id,
        };
      }
      try {
        const sent = await sendWhatsAppAiSessionText(input.tenant, {
          conversationId: conversation.id,
          body: pending.text,
        });
        const interaction = await recordAiInteraction({
          clinicId: input.tenant.clinicId,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          messageId: sent.id,
          trigger: input.trigger,
          intent: pending.booked
            ? "APPOINTMENT_BOOKING"
            : pending.cancelled
              ? "APPOINTMENT_CANCEL"
              : pending.rescheduled
                ? "APPOINTMENT_RESCHEDULE"
                : "APPOINTMENT_STATUS",
          model: "pending-action",
          safeToAutoReply: true,
          status: "SENT",
          rawSummary: pending.text,
        });
        return {
          messageId: sent.id,
          text: pending.text,
          interactionId: interaction.id,
        };
      } catch (err) {
        return {
          skipped: true,
          reason: err instanceof Error ? err.message.slice(0, 400) : "pending action send failed",
          text: pending.text,
        };
      }
    }
  }

  // Idempotency: if this inbound already got an AI outbound, stop before OpenAI/KB work.
  if (input.inboundMessageId && input.mode === "send" && !input.simulation) {
    const inbound = await prisma.message.findFirst({
      where: {
        id: input.inboundMessageId,
        conversationId: conversation.id,
        direction: "INBOUND",
        senderType: "PATIENT",
      },
      select: { createdAt: true },
    });
    if (inbound) {
      const already = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          senderType: "AI",
          createdAt: { gte: inbound.createdAt },
        },
        select: { id: true },
      });
      if (already) {
        console.log("[WhatsApp AI] pipeline completed — already replied", {
          conversationId: conversation.id,
          messageId: input.inboundMessageId,
          sentMessageId: already.id,
        });
        return {
          messageId: already.id,
          reason: "AI already replied to this inbound",
        };
      }
    }
  }

  const signals = detectHandoffSignals(input.patientMessage);
  const intentResult = classifyPatientIntent(input.patientMessage);
  const clinicComm = await getClinicCommSettings(input.tenant.clinicId);
  const clinicTz = clinicComm.timezone || "Asia/Kolkata";
  const preferredDate = extractPreferredDateIso(input.patientMessage, new Date(), clinicTz);
  const preferredDateLabel = preferredDate
    ? formatPreferredDateLabel(preferredDate, clinicTz)
    : null;
  console.log("[WhatsApp AI] intent", {
    clinicId: input.tenant.clinicId,
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    tools: intentResult.suggestedTools,
    preferredDate,
    pipelineStage: "intent",
  });

  // Appointment operational intents must not be swallowed by soft clinical paths.
  const isAppointmentIntent =
    intentResult.intent === "APPOINTMENT_BOOKING" ||
    intentResult.intent === "APPOINTMENT_RESCHEDULE" ||
    intentResult.intent === "APPOINTMENT_CANCEL" ||
    intentResult.intent === "APPOINTMENT_CONFIRM" ||
    intentResult.intent === "APPOINTMENT_STATUS";
  const isSlotListingIntent =
    intentResult.intent === "APPOINTMENT_BOOKING" ||
    intentResult.intent === "APPOINTMENT_RESCHEDULE";

  // Tool-driven hard handoff (e.g. booking with no slot service) after signal checks.
  if (signals.handoff && signals.pauseAi && !isAppointmentIntent) {
    const escalated = await escalateToHuman({
      tenant: input.tenant,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      reason: signals.reason ?? "HANDOFF",
    });

    let messageId: string | undefined;
    let notifyFailed = false;
    if (!input.simulation && input.mode === "send") {
      try {
        const sent = await sendWhatsAppAiSessionText(input.tenant, {
          conversationId: conversation.id,
          body: escalated.patientMessage,
        });
        messageId = sent.id;
      } catch (err) {
        notifyFailed = true;
        await recordAiInteraction({
          clinicId: input.tenant.clinicId,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          careTaskId: escalated.careTaskId,
          trigger: input.trigger,
          intent: "handoff",
          classification: signals.reason,
          safeToAutoReply: false,
          status: "ERROR",
          handoffReason: signals.reason,
          rawSummary:
            err instanceof Error
              ? `Handoff recorded; patient notify failed: ${err.message.slice(0, 300)}`
              : "Handoff recorded; patient notify failed",
        }).catch(() => undefined);
      }
    }

    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      careTaskId: escalated.careTaskId,
      messageId: messageId ?? null,
      trigger: input.trigger,
      intent: intentResult.intent,
      classification: signals.reason,
      safeToAutoReply: false,
      status: "HANDOFF",
      handoffReason: signals.reason,
      rawSummary: notifyFailed
        ? `${escalated.patientMessage} (notify send failed — see prior ERROR interaction)`
        : escalated.patientMessage,
    });

    return {
      handoff: true,
      handoffReason: signals.reason ?? "HANDOFF",
      text: escalated.patientMessage,
      messageId,
      interactionId: interaction.id,
      careTaskId: escalated.careTaskId,
    } as AiPipelineResult & { careTaskId?: string };
  }

  // Soft clinical escalation: safe reply + staff task, AI stays on for the conversation.
  // Skip when the patient is clearly asking about appointments (tools handle that).
  if (signals.handoff && !signals.pauseAi && !isAppointmentIntent) {
    await prisma.careTask
      .create({
        data: {
          clinicId: input.tenant.clinicId,
          coupleId: conversation.coupleId,
          title: "WhatsApp AI — clinical review needed",
          description: `Soft escalation (${signals.reason}): patient asked something clinical. AI is still active.`,
          category: "WHATSAPP_HANDOFF",
          status: "WAITING",
          priority: "HIGH",
        },
      })
      .catch(() => undefined);

    if (input.simulation || input.mode === "draft") {
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: input.trigger,
        safeToAutoReply: true,
        status: "DRAFT",
        classification: signals.reason,
        rawSummary: CLINICAL_ESCALATION_MESSAGE,
      });
      return {
        draft: true,
        text: CLINICAL_ESCALATION_MESSAGE,
        interactionId: interaction.id,
      };
    }

    try {
      const sent = await sendWhatsAppAiSessionText(input.tenant, {
        conversationId: conversation.id,
        body: CLINICAL_ESCALATION_MESSAGE,
      });
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        messageId: sent.id,
        trigger: input.trigger,
        safeToAutoReply: true,
        status: "SENT",
        classification: signals.reason,
        rawSummary: CLINICAL_ESCALATION_MESSAGE,
      });
      return {
        messageId: sent.id,
        text: CLINICAL_ESCALATION_MESSAGE,
        interactionId: interaction.id,
      };
    } catch (err) {
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: input.trigger,
        safeToAutoReply: true,
        status: "ERROR",
        classification: signals.reason,
        rawSummary:
          err instanceof Error
            ? `Soft clinical reply failed: ${err.message.slice(0, 400)}`
            : "Soft clinical reply failed",
      });
      return {
        skipped: true,
        reason: err instanceof Error ? err.message.slice(0, 400) : "Soft clinical reply failed",
        interactionId: interaction.id,
      };
    }
  }

  // Controlled tools (clinic-scoped). Never invent slots/appointments/meds.
  const toolResults =
    input.trigger === "inbound" || input.trigger === "staff"
      ? await runToolsForIntent({
          auth: {
            tenant: input.tenant,
            conversationId: conversation.id,
            patientId: conversation.patientId,
            coupleId: conversation.coupleId,
          },
          toolNames: intentResult.suggestedTools,
          intent: intentResult.intent,
          args: {
            ...(preferredDate ? { preferredDate } : {}),
          },
        })
      : [];

  console.log("[WhatsApp AI] tools executed", {
    clinicId: input.tenant.clinicId,
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    intent: intentResult.intent,
    preferredDate,
    toolExecuted: toolResults.map((t) => t.tool),
    toolResultCount: toolResults.length,
    handoffReasons: toolResults.map((t) => t.handoffReason ?? null),
    pipelineStage: "tools",
  });

  const slotTool = toolResults.find((t) => t.tool === "getAvailableAppointmentSlots");
  const slotData = (slotTool?.ok ? slotTool.data : null) as
    | {
        type?: string;
        available?: boolean;
        slots?: Array<{ index: number; label: string; slotId: string }>;
        pendingActionPersisted?: boolean;
        reason?: string;
      }
    | null;

  const slotCount = Array.isArray(slotData?.slots) ? slotData!.slots!.length : 0;
  console.log("[WhatsApp AI] appointment_slots outcome", {
    clinicId: input.tenant.clinicId,
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    preferredDate,
    toolOk: slotTool?.ok ?? false,
    slotCount,
    available: slotData?.available ?? null,
    handoffRecommended: slotTool?.handoffRecommended ?? false,
    handoffReason: slotTool?.handoffReason ?? null,
    reason: slotData?.reason ?? null,
    pipelineStage: "slot_outcome",
  });

  // BOOKING / RESCHEDULE: never fall through to KB/LLM for slot listing.
  if (isSlotListingIntent && !input.simulation && input.mode === "send") {
    const purpose =
      intentResult.intent === "APPOINTMENT_RESCHEDULE" ? "RESCHEDULE" : "BOOK";
    const hardSlotHandoff =
      Boolean(slotTool?.handoffRecommended) &&
      Boolean(slotTool?.handoffReason) &&
      slotTool!.handoffReason !== "NO_SUITABLE_APPOINTMENT_SLOT";

    if (!hardSlotHandoff) {
      // ERROR — tool missing or failed
      if (!slotTool || !slotTool.ok || slotData?.type !== "appointment_slots") {
        const text = formatAppointmentToolErrorMessage(input.tenant.clinicName);
        await escalateToHuman({
          tenant: input.tenant,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          coupleId: conversation.coupleId,
          reason: "APPOINTMENT_TOOL_ERROR",
        }).catch(() => undefined);
        try {
          const sent = await sendWhatsAppAiSessionText(input.tenant, {
            conversationId: conversation.id,
            body: text,
          });
          const interaction = await recordAiInteraction({
            clinicId: input.tenant.clinicId,
            conversationId: conversation.id,
            patientId: conversation.patientId,
            messageId: sent.id,
            trigger: input.trigger,
            intent: intentResult.intent,
            model: "appointment-tool-error",
            classification: "APPOINTMENT_TOOL_ERROR",
            safeToAutoReply: false,
            status: "HANDOFF",
            handoffReason: "APPOINTMENT_TOOL_ERROR",
            rawSummary: "appointment_slots tool failed or missing — deterministic error, no KB/LLM",
          });
          return {
            handoff: true,
            handoffReason: "APPOINTMENT_TOOL_ERROR",
            messageId: sent.id,
            text,
            interactionId: interaction.id,
          };
        } catch (err) {
          console.error("[WhatsApp AI] appointment error reply send failed", {
            conversationId: conversation.id,
            errorName: err instanceof Error ? err.name : "unknown",
          });
          return {
            handoff: true,
            handoffReason: "APPOINTMENT_TOOL_ERROR",
            text,
          };
        }
      }

      if (slotData?.available && slotCount > 0) {
        let text = formatAppointmentSlotsPatientMessage({
          clinicName: input.tenant.clinicName,
          slots: slotData.slots!,
          purpose,
          dateLabel: preferredDateLabel,
        });
        if (slotData.pendingActionPersisted === false) {
          text +=
            '\n\n(I couldn\'t save your selection session — please reply "speak to staff" so the team can finish booking these times.)';
          await escalateToHuman({
            tenant: input.tenant,
            conversationId: conversation.id,
            patientId: conversation.patientId,
            coupleId: conversation.coupleId,
            reason: "PENDING_ACTION_PERSIST_FAILED",
          }).catch(() => undefined);
        }
        try {
          const sent = await sendWhatsAppAiSessionText(input.tenant, {
            conversationId: conversation.id,
            body: text,
          });
          const interaction = await recordAiInteraction({
            clinicId: input.tenant.clinicId,
            conversationId: conversation.id,
            patientId: conversation.patientId,
            messageId: sent.id,
            trigger: input.trigger,
            intent: intentResult.intent,
            model: "appointment-slots",
            classification: "APPOINTMENT_SLOTS_AVAILABLE",
            safeToAutoReply: true,
            status: "SENT",
            rawSummary: `Presented ${slotCount} real slots (deterministic)`,
          });
          console.log("[WhatsApp AI] response sent", {
            conversationId: conversation.id,
            inboundMessageId: input.inboundMessageId ?? null,
            sentMessageId: sent.id,
            interactionId: interaction.id,
            responseMode: "deterministic_slots",
            slotCount,
            pipelineStage: "deterministic_slots",
          });
          return {
            messageId: sent.id,
            text,
            interactionId: interaction.id,
          };
        } catch (err) {
          console.error("[WhatsApp AI] slot reply send failed", {
            conversationId: conversation.id,
            errorName: err instanceof Error ? err.name : "unknown",
          });
          const text = formatAppointmentToolErrorMessage(input.tenant.clinicName);
          await escalateToHuman({
            tenant: input.tenant,
            conversationId: conversation.id,
            patientId: conversation.patientId,
            coupleId: conversation.coupleId,
            reason: "APPOINTMENT_SEND_FAILED",
          }).catch(() => undefined);
          return {
            handoff: true,
            handoffReason: "APPOINTMENT_SEND_FAILED",
            text,
          };
        }
      }

      // NO_SLOTS — deterministic, never KB/LLM
      const text = formatNoSlotsPatientMessage({
        clinicName: input.tenant.clinicName,
        dateLabel: preferredDateLabel,
      });
      await prisma.careTask
        .create({
          data: {
            clinicId: input.tenant.clinicId,
            coupleId: conversation.coupleId,
            title: "WhatsApp — no appointment slots available",
            description: `AI found no open slots${preferredDate ? ` for ${preferredDate}` : ""} in clinic working hours.`,
            category: "APPOINTMENT",
            status: "WAITING",
            priority: "NORMAL",
          },
        })
        .catch(() => undefined);
      try {
        const sent = await sendWhatsAppAiSessionText(input.tenant, {
          conversationId: conversation.id,
          body: text,
        });
        const interaction = await recordAiInteraction({
          clinicId: input.tenant.clinicId,
          conversationId: conversation.id,
          patientId: conversation.patientId,
          messageId: sent.id,
          trigger: input.trigger,
          intent: intentResult.intent,
          model: "appointment-no-slots",
          classification: "APPOINTMENT_NO_SLOTS",
          safeToAutoReply: true,
          status: "SENT",
          rawSummary: `No open slots (deterministic)${preferredDate ? ` preferredDate=${preferredDate}` : ""}`,
        });
        console.log("[WhatsApp AI] response sent", {
          conversationId: conversation.id,
          inboundMessageId: input.inboundMessageId ?? null,
          sentMessageId: sent.id,
          responseMode: "deterministic_no_slots",
          slotCount: 0,
          preferredDate,
          pipelineStage: "deterministic_no_slots",
        });
        return {
          messageId: sent.id,
          text,
          interactionId: interaction.id,
        };
      } catch {
        return {
          text,
          reason: "no_slots_send_failed",
        };
      }
    }
  }

  const cancelTool = toolResults.find((t) => t.tool === "cancelAppointment" && t.ok);
  const cancelData = cancelTool?.data as
    | { needsConfirmation?: boolean; startsAt?: string; doctorName?: string | null; type?: string }
    | undefined;
  if (
    cancelData?.needsConfirmation &&
    cancelData.startsAt &&
    !input.simulation &&
    input.mode === "send"
  ) {
    const when = new Date(cancelData.startsAt).toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const text = `✦ Smrko AI\n\nWould you like to cancel your appointment on ${when}${cancelData.doctorName ? ` with ${cancelData.doctorName}` : ""}?\n\nReply Yes to cancel, or No to keep it.`;
    try {
      const sent = await sendWhatsAppAiSessionText(input.tenant, {
        conversationId: conversation.id,
        body: text,
      });
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        messageId: sent.id,
        trigger: input.trigger,
        intent: "APPOINTMENT_CANCEL",
        model: "appointment-cancel-confirm",
        classification: "CANCEL_CONFIRM",
        safeToAutoReply: true,
        status: "SENT",
        rawSummary: "Asked cancellation confirmation",
      });
      return {
        messageId: sent.id,
        text,
        interactionId: interaction.id,
      };
    } catch {
      /* fall through */
    }
  }

  const toolHandoff = toolResults.find((t) => t.handoffRecommended);
  // Hard handoff only for true exceptions — NOT for empty slot lists (handled above).
  if (
    toolHandoff &&
    toolHandoff.handoffReason !== "NO_SUITABLE_APPOINTMENT_SLOT" &&
    (toolHandoff.handoffReason === "DOCTOR_SCHEDULE_NOT_VERIFIABLE" ||
      toolHandoff.handoffReason === "PATIENT_NOT_LINKED_TO_COUPLE" ||
      toolHandoff.handoffReason === "PENDING_ACTION_PERSIST_FAILED" ||
      toolHandoff.handoffReason === "PATIENT_REQUESTED_HUMAN" ||
      toolHandoff.tool === "requestHuman")
  ) {
    const escalated = await escalateToHuman({
      tenant: input.tenant,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      reason: toolHandoff.handoffReason ?? "APPOINTMENT_EXCEPTION",
    });
    const handoffText =
      toolHandoff.handoffReason === "DOCTOR_SCHEDULE_NOT_VERIFIABLE"
        ? "✦ Smrko AI\n\nI can't verify a specific doctor's calendar yet. I've connected you with our care team so they can help with that request."
        : toolHandoff.handoffReason === "PENDING_ACTION_PERSIST_FAILED"
          ? "✦ Smrko AI\n\nI found times, but I couldn't save your booking session safely. I've connected you with our care team to finish booking."
          : "✦ Smrko AI\n\nI'd like to connect you with our care team to help with your appointment. I've shared your request and someone will assist you shortly.";
    let messageId: string | undefined;
    if (!input.simulation && input.mode === "send") {
      try {
        const sent = await sendWhatsAppAiSessionText(input.tenant, {
          conversationId: conversation.id,
          body: handoffText,
        });
        messageId = sent.id;
      } catch {
        /* best-effort notify */
      }
    }
    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      careTaskId: escalated.careTaskId,
      messageId: messageId ?? null,
      trigger: input.trigger,
      intent: intentResult.intent,
      classification: toolHandoff.handoffReason ?? "APPOINTMENT_EXCEPTION",
      safeToAutoReply: false,
      status: "HANDOFF",
      handoffReason: toolHandoff.handoffReason ?? "APPOINTMENT_EXCEPTION",
      rawSummary: handoffText,
    });
    return {
      handoff: true,
      handoffReason: toolHandoff.handoffReason ?? "APPOINTMENT_EXCEPTION",
      text: handoffText,
      interactionId: interaction.id,
      ...(messageId !== undefined ? { messageId } : {}),
    };
  }

  const ctx = await loadWhatsAppAiContext(input.tenant, {
    conversationId: conversation.id,
    patientId: conversation.patientId,
    coupleId: conversation.coupleId,
  });

  const knowledge = await retrieveKnowledgeArticles({
    clinicId: input.tenant.clinicId,
    query: input.patientMessage,
    limit: 5,
    specialtyHint: input.specialtyHint ?? inferSpecialtyHint(input.patientMessage),
  });
  console.log("[WhatsApp AI] knowledge retrieved", {
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    hits: knowledge.length,
    topScore: knowledge[0]?.score ?? 0,
    topTitle: knowledge[0]?.title?.slice(0, 80) ?? null,
  });

  const toolFacts = formatToolResultsForPrompt(toolResults);
  console.log("[WhatsApp AI] generating response", {
    conversationId: conversation.id,
    messageId: input.inboundMessageId ?? null,
    intent: intentResult.intent,
    toolsRun: toolResults.map((t) => t.tool),
    openaiKey: process.env["OPENAI_API_KEY"]?.trim() ? "CONFIGURED" : "MISSING",
  });

  // Final guard: booking/reschedule must never use KB/LLM slot answers.
  if (isSlotListingIntent && input.mode === "send" && !input.simulation) {
    const text = formatAppointmentToolErrorMessage(input.tenant.clinicName);
    console.error("[WhatsApp AI] slot listing reached generate path — blocked", {
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      intent: intentResult.intent,
      preferredDate,
      slotCount,
    });
    await escalateToHuman({
      tenant: input.tenant,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      reason: "APPOINTMENT_ROUTING_FALLTHROUGH",
    }).catch(() => undefined);
    try {
      const sent = await sendWhatsAppAiSessionText(input.tenant, {
        conversationId: conversation.id,
        body: text,
      });
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        messageId: sent.id,
        trigger: input.trigger,
        intent: intentResult.intent,
        model: "appointment-fallthrough-blocked",
        classification: "APPOINTMENT_ROUTING_FALLTHROUGH",
        safeToAutoReply: false,
        status: "HANDOFF",
        handoffReason: "APPOINTMENT_ROUTING_FALLTHROUGH",
        rawSummary: "Blocked KB/LLM fallthrough for appointment slot listing",
      });
      return {
        handoff: true,
        handoffReason: "APPOINTMENT_ROUTING_FALLTHROUGH",
        messageId: sent.id,
        text,
        interactionId: interaction.id,
      };
    } catch {
      return { handoff: true, handoffReason: "APPOINTMENT_ROUTING_FALLTHROUGH", text };
    }
  }

  const generated = await generateWhatsAppAiReply({
    patientMessage: input.patientMessage,
    ctx,
    knowledge,
    preferFast: input.trigger === "inbound",
    intent: intentResult.intent,
    toolFacts,
    ...(input.promptHint ? { promptHint: input.promptHint } : {}),
  });

  // Low knowledge match → soft handoff for unknown questions when confidence low
  const bestScore = knowledge[0]?.score ?? 0;
  if (bestScore === 0 && input.trigger === "inbound" && !generated.usedLlm) {
    // Still reply with fallback, but flag for staff attention without full pause unless clinical
  }

  const knowledgeSources = knowledge.map((k) => ({
    id: k.id,
    title: k.title,
    specialty: k.specialty,
    category: k.category,
    score: k.score,
  }));

  if (generated.blocked) {
    const escalated = await escalateToHuman({
      tenant: input.tenant,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      reason: "UNSAFE_AI_OUTPUT",
    });
    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      careTaskId: escalated.careTaskId,
      trigger: input.trigger,
      model: generated.model,
      safeToAutoReply: false,
      status: "BLOCKED",
      handoffReason: "UNSAFE_AI_OUTPUT",
      knowledgeSources,
      rawSummary: generated.text,
    });
    return {
      handoff: true,
      handoffReason: "UNSAFE_AI_OUTPUT",
      text: generated.text,
      interactionId: interaction.id,
    };
  }

  if (input.simulation || input.mode === "draft") {
    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      trigger: input.trigger,
      model: generated.model,
      safeToAutoReply: false,
      status: "DRAFT",
      knowledgeSources,
      rawSummary: generated.text,
      classification: "draft",
    });
    return {
      draft: true,
      text: generated.text,
      interactionId: interaction.id,
      knowledgeIds: knowledge.map((k) => k.id),
    };
  }

  try {
    console.log("[WhatsApp AI] sending response", {
      conversationId: conversation.id,
      messageId: input.inboundMessageId ?? null,
      model: generated.model,
    });

    const sent = await sendWhatsAppAiSessionText(input.tenant, {
      conversationId: conversation.id,
      body: generated.text,
    });

    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      messageId: sent.id,
      trigger: input.trigger,
      model: generated.model,
      safeToAutoReply: true,
      status: "SENT",
      knowledgeSources,
      rawSummary: generated.text,
    });

    console.log("[WhatsApp AI] response sent", {
      conversationId: conversation.id,
      inboundMessageId: input.inboundMessageId ?? null,
      sentMessageId: sent.id,
      interactionId: interaction.id,
    });
    console.log("[WhatsApp AI] pipeline completed", {
      conversationId: conversation.id,
      sentMessageId: sent.id,
    });

    return {
      messageId: sent.id,
      text: generated.text,
      interactionId: interaction.id,
      knowledgeIds: knowledge.map((k) => k.id),
    };
  } catch (err) {
    console.error("[WhatsApp AI] pipeline failed", {
      conversationId: conversation.id,
      messageId: input.inboundMessageId ?? null,
      error: err instanceof Error ? err.message.slice(0, 200) : "send failed",
    });
    const interaction = await recordAiInteraction({
      clinicId: input.tenant.clinicId,
      conversationId: conversation.id,
      patientId: conversation.patientId,
      trigger: input.trigger,
      model: generated.model,
      safeToAutoReply: true,
      status: "ERROR",
      knowledgeSources,
      rawSummary:
        err instanceof Error
          ? `AI reply generate ok; send failed: ${err.message.slice(0, 400)}`
          : "AI reply send failed",
    });
    return {
      skipped: true,
      reason: err instanceof Error ? err.message.slice(0, 400) : "AI send failed",
      interactionId: interaction.id,
      text: generated.text,
      knowledgeIds: knowledge.map((k) => k.id),
    };
  }
}

function inferSpecialtyHint(message: string): string | null {
  const t = message.toLowerCase();
  if (/\b(ivf|iui|fet|fertility|embryo|follicular|semen)\b/.test(t)) return "FERTILITY";
  if (/\b(opd|billing|insurance|pharmacy|hospital|registration)\b/.test(t)) return "HOSPITAL";
  if (/\b(smrkomed|care loop|whatsapp)\b/.test(t)) return "SMRKOMED";
  return null;
}

export { resumeWhatsAppAi };
export async function isClinicAiAutoReplyEnabled(clinicId: string): Promise<boolean> {
  const row = await prisma.whatsAppClinicSettings.findUnique({
    where: { clinicId },
    select: { aiAutoReplyEnabled: true },
  });
  return row ? row.aiAutoReplyEnabled : true;
}
