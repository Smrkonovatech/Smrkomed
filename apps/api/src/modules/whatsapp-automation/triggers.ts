import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { startFlowExecution } from "./engine";

/**
 * Fire all ACTIVE flows for a clinic matching triggerType.
 * Failures on one flow do not block others. Idempotent per triggerEventId.
 */
export async function dispatchWhatsAppTrigger(input: {
  tenant: TenantContext;
  triggerType: string;
  triggerEventId: string;
  patientId?: string | null;
  coupleId?: string | null;
  conversationId?: string | null;
  vars?: Record<string, string>;
}) {
  if (input.patientId) {
    const paused = await prisma.conversation.findFirst({
      where: {
        clinicId: input.tenant.clinicId,
        patientId: input.patientId,
        channel: "WHATSAPP",
        automationPausedAt: { not: null },
      },
      select: { id: true },
    });
    if (paused) {
      return { matched: 0, results: [], skipped: "automation_paused" as const };
    }
  }

  const flows = await prisma.whatsAppFlow.findMany({
    where: {
      clinicId: input.tenant.clinicId,
      status: "ACTIVE",
      triggerType: input.triggerType,
      isLibrary: false,
    },
  });

  const results: Array<{ flowId: string; executionId?: string; duplicate?: boolean; error?: string }> = [];
  for (const flow of flows) {
    try {
      const { execution, duplicate } = await startFlowExecution({
        tenant: input.tenant,
        flowId: flow.id,
        triggerEventId: input.triggerEventId,
        ...(input.patientId != null ? { patientId: input.patientId } : {}),
        ...(input.coupleId != null ? { coupleId: input.coupleId } : {}),
        ...(input.conversationId != null ? { conversationId: input.conversationId } : {}),
        ...(input.vars ? { vars: input.vars } : {}),
      });
      results.push({ flowId: flow.id, executionId: execution.id, duplicate });
    } catch (err) {
      results.push({
        flowId: flow.id,
        error: err instanceof Error ? err.message : "Trigger failed",
      });
    }
  }
  return { matched: flows.length, results };
}
