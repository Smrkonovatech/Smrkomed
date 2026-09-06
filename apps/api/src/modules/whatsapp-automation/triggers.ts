import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { startFlowExecution } from "./engine";

export function isAppointmentFlow(flow: {
  libraryKey?: string | null;
  name?: string;
  definition?: unknown;
}): boolean {
  if (flow.libraryKey === "appointment_booking_whatsapp") return true;
  const name = (flow.name ?? "").toLowerCase();
  if (name.includes("appointment") || name.includes("booking")) return true;
  const def = flow.definition;
  if (def && typeof def === "object" && "nodes" in def && Array.isArray((def as { nodes: unknown[] }).nodes)) {
    const nodes = (def as { nodes: Array<{ type?: string }> }).nodes;
    const appointmentNodeTypes = new Set([
      "GET_DOCTORS",
      "GET_DOCTOR_DETAILS",
      "GET_AVAILABLE_DATES",
      "GET_AVAILABLE_SLOTS",
      "BOOK_APPOINTMENT",
      "EXTRACT_PREFERENCES",
    ]);
    return nodes.some((n) => n && n.type && appointmentNodeTypes.has(n.type));
  }
  return false;
}

/**
 * Fire all ACTIVE flows for a clinic matching triggerType.
 * Failures on one flow do not block others. Idempotent per triggerEventId.
 * For INCOMING_WHATSAPP triggers, filters appointment flows based on isAppointmentIntent.
 */
export async function dispatchWhatsAppTrigger(input: {
  tenant: TenantContext;
  triggerType: string;
  triggerEventId: string;
  patientId?: string | null;
  coupleId?: string | null;
  conversationId?: string | null;
  vars?: Record<string, string>;
  isAppointmentIntent?: boolean;
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

  const allFlows = await prisma.whatsAppFlow.findMany({
    where: {
      clinicId: input.tenant.clinicId,
      status: "ACTIVE",
      triggerType: input.triggerType,
      isLibrary: false,
    },
  });

  // Filter flows for INCOMING_WHATSAPP: appointment flows only execute for appointment intent;
  // non-appointment intent messages must not execute appointment flows.
  const flows =
    input.triggerType === "INCOMING_WHATSAPP" && input.isAppointmentIntent !== undefined
      ? allFlows.filter((f) =>
          input.isAppointmentIntent ? isAppointmentFlow(f) : !isAppointmentFlow(f),
        )
      : allFlows;

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

