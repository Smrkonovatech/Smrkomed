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
import { retrieveKnowledgeArticles } from "./knowledge";
import { detectHandoffSignals, CLINICAL_ESCALATION_MESSAGE } from "./safety";

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

  if (!input.force && input.trigger === "inbound") {
    const enabled = await clinicAiEnabled(input.tenant.clinicId);
    if (!enabled) {
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

  if (conversation.aiPausedAt || conversation.status === "HUMAN_HANDOFF") {
    // Patient inbound must auto-resume (even when force=true for settings bypass).
    // force=true used to skip this and permanently block auto-reply after Take over.
    let keepPaused = false;
    if (input.trigger === "inbound") {
      // Patient wrote again with Auto AI path — always resume so replies are not stuck after Take over.
      await resumeWhatsAppAi(input.tenant, conversation.id);
      const refreshed = await prisma.conversation.findFirst({
        where: { id: input.conversationId, clinicId: input.tenant.clinicId },
      });
      if (refreshed) Object.assign(conversation, refreshed);
      console.log("[WhatsApp AI] auto-resumed after patient inbound", {
        conversationId: conversation.id,
      });
    } else if (input.force) {
      await resumeWhatsAppAi(input.tenant, conversation.id);
      const refreshed = await prisma.conversation.findFirst({
        where: { id: input.conversationId, clinicId: input.tenant.clinicId },
      });
      if (refreshed) Object.assign(conversation, refreshed);
    } else {
      keepPaused = true;
    }

    if (
      keepPaused ||
      conversation.aiPausedAt != null ||
      conversation.status === "HUMAN_HANDOFF"
    ) {
      const interaction = await recordAiInteraction({
        clinicId: input.tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: input.trigger,
        safeToAutoReply: false,
        status: "SKIPPED",
        classification: "AI_PAUSED",
        handoffReason: conversation.handoffReason,
        rawSummary: keepPaused
          ? "AI paused — human control (not an inbound auto-resume)"
          : "AI paused — human control",
      });
      return { skipped: true, reason: "AI paused under human control", interactionId: interaction.id };
    }
  }

  const signals = detectHandoffSignals(input.patientMessage);
  if (signals.handoff && signals.pauseAi) {
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
      intent: "handoff",
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
  if (signals.handoff && !signals.pauseAi) {
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

  const ctx = await loadWhatsAppAiContext(input.tenant, {
    conversationId: conversation.id,
    patientId: conversation.patientId,
    coupleId: conversation.coupleId,
  });

  const knowledge = await retrieveKnowledgeArticles({
    clinicId: input.tenant.clinicId,
    query: input.patientMessage,
    limit: 5,
    specialtyHint: input.specialtyHint ?? null,
  });

  const generated = await generateWhatsAppAiReply({
    patientMessage: input.patientMessage,
    ctx,
    knowledge,
    preferFast: input.trigger === "inbound",
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
    // Avoid double auto-reply if webhook + background both fire.
    if (input.inboundMessageId) {
      const inbound = await prisma.message.findFirst({
        where: { id: input.inboundMessageId, conversationId: conversation.id },
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
          return {
            messageId: already.id,
            text: generated.text,
            reason: "AI already replied to this inbound",
          };
        }
      }
    }

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

    return {
      messageId: sent.id,
      text: generated.text,
      interactionId: interaction.id,
      knowledgeIds: knowledge.map((k) => k.id),
    };
  } catch (err) {
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

export { resumeWhatsAppAi };
export async function isClinicAiAutoReplyEnabled(clinicId: string): Promise<boolean> {
  const row = await prisma.whatsAppClinicSettings.findUnique({
    where: { clinicId },
    select: { aiAutoReplyEnabled: true },
  });
  return row ? row.aiAutoReplyEnabled : true;
}
