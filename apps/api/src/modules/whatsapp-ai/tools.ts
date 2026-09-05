/**
 * Controlled WhatsApp patient AI tools.
 * Tools call clinic-scoped Prisma/services only — never invent system data.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { escalateToHuman, pauseWhatsAppAi } from "./handoff";

export type ToolAuth = {
  tenant: TenantContext;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
};

export type ToolResult = {
  tool: string;
  ok: boolean;
  /** Safe JSON-serializable facts for the LLM prompt */
  data: Record<string, unknown>;
  /** When true, pipeline should hard-handoff after this tool */
  handoffRecommended?: boolean;
  handoffReason?: string;
};

const READ_TOOLS = new Set([
  "getPatientContext",
  "getCoupleContext",
  "getJourney",
  "getCurrentJourneyStage",
  "getActiveCareLoop",
  "getTodayCareTasks",
  "getCurrentCareTask",
  "getMedications",
  "getAppointments",
  "getPatientDocuments",
  "getClinicProfile",
  "getDoctorProfile",
  "getAvailableAppointmentSlots",
]);

const ACTION_TOOLS = new Set([
  "requestHuman",
  "pauseAI",
  "confirmAppointment",
  // Mutations reserved for later sub-phases with interactive confirm:
  // bookAppointment, rescheduleAppointment, cancelAppointment, completeCareTask
]);

export function isKnownPatientTool(name: string): boolean {
  return READ_TOOLS.has(name) || ACTION_TOOLS.has(name);
}

async function assertConversation(auth: ToolAuth) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: auth.conversationId,
      clinicId: auth.tenant.clinicId,
      channel: "WHATSAPP",
    },
    select: {
      id: true,
      patientId: true,
      coupleId: true,
      status: true,
      aiPausedAt: true,
    },
  });
  if (!conversation) {
    throw new Error("Conversation not found for tool auth");
  }
  return conversation;
}

export async function executePatientTool(
  tool: string,
  auth: ToolAuth,
  _args: Record<string, unknown> = {},
): Promise<ToolResult> {
  if (!isKnownPatientTool(tool)) {
    return { tool, ok: false, data: { error: "UNKNOWN_TOOL" } };
  }

  const conversation = await assertConversation(auth);
  const patientId = auth.patientId ?? conversation.patientId;
  const coupleId = auth.coupleId ?? conversation.coupleId;
  const clinicId = auth.tenant.clinicId;

  console.log("[WhatsApp AI] tool execution", {
    tool,
    clinicId,
    conversationId: auth.conversationId,
    patientId: patientId ?? null,
  });

  switch (tool) {
    case "getPatientContext": {
      if (!patientId) {
        return { tool, ok: true, data: { matched: false, note: "Unmatched WhatsApp contact" } };
      }
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, clinicId },
        select: { id: true, firstName: true, lastName: true, preferredLanguage: true },
      });
      return {
        tool,
        ok: true,
        data: patient
          ? {
              matched: true,
              patientId: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              preferredLanguage: patient.preferredLanguage,
            }
          : { matched: false },
      };
    }

    case "getCoupleContext": {
      if (!coupleId) return { tool, ok: true, data: { couple: null } };
      const couple = await prisma.couple.findFirst({
        where: { id: coupleId, clinicId },
        select: {
          id: true,
          careLoopActive: true,
          assignedDoctorId: true,
          assignedCoordinatorId: true,
        },
      });
      return { tool, ok: true, data: { couple: couple ?? null } };
    }

    case "getJourney":
    case "getCurrentJourneyStage":
    case "getActiveCareLoop": {
      if (!coupleId) return { tool, ok: true, data: { carePlan: null } };
      const plan = await prisma.carePlan.findFirst({
        where: { clinicId, coupleId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          currentStageName: true,
          currentStageIndex: true,
          name: true,
        },
      });
      return {
        tool,
        ok: true,
        data: {
          carePlan: plan
            ? {
                id: plan.id,
                type: plan.type,
                status: plan.status,
                stageName: plan.currentStageName,
                stageIndex: plan.currentStageIndex,
                name: plan.name,
              }
            : null,
        },
      };
    }

    case "getTodayCareTasks":
    case "getCurrentCareTask": {
      if (!coupleId && !patientId) return { tool, ok: true, data: { tasks: [] } };
      const tasks = await prisma.careTask.findMany({
        where: {
          clinicId,
          status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
          ...(coupleId ? { coupleId } : {}),
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: { id: true, title: true, status: true, dueDate: true, priority: true, category: true },
      });
      return {
        tool,
        ok: true,
        data: {
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate?.toISOString() ?? null,
            priority: t.priority,
            category: t.category,
          })),
        },
      };
    }

    case "getMedications": {
      if (!patientId) return { tool, ok: true, data: { reminders: [] } };
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          clinicId,
          patientId,
          status: { in: ["SCHEDULED", "SENT"] },
          scheduledAt: { gte: new Date(Date.now() - 86_400_000) },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          prescriptionItem: {
            select: { medicineName: true, dosage: true, timeOfDay: true, instructions: true },
          },
        },
      });
      return {
        tool,
        ok: true,
        data: {
          reminders: reminders.map((r) => ({
            id: r.id,
            scheduledAt: r.scheduledAt.toISOString(),
            status: r.status,
            medicineName: r.prescriptionItem.medicineName,
            dosage: r.prescriptionItem.dosage,
            timeOfDay: r.prescriptionItem.timeOfDay,
            instructions: r.prescriptionItem.instructions,
          })),
          note: "Share only scheduled reminder facts. Never advise dose changes.",
        },
      };
    }

    case "getAppointments": {
      const appts = await prisma.appointment.findMany({
        where: {
          clinicId,
          status: { in: ["CONFIRMED", "WAITING"] },
          startsAt: { gte: new Date(Date.now() - 86_400_000) },
          ...(coupleId ? { coupleId } : {}),
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: {
          id: true,
          type: true,
          startsAt: true,
          doctorName: true,
          status: true,
          room: true,
        },
      });
      return {
        tool,
        ok: true,
        data: {
          appointments: appts.map((a) => ({
            id: a.id,
            type: a.type,
            startsAt: a.startsAt.toISOString(),
            doctorName: a.doctorName,
            status: a.status,
            room: a.room,
          })),
        },
      };
    }

    case "getPatientDocuments": {
      if (!patientId) return { tool, ok: true, data: { documents: [], note: "No patient linked" } };
      const docs = await prisma.document.findMany({
        where: { clinicId, patientId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, status: true, createdAt: true },
      });
      return {
        tool,
        ok: true,
        data: {
          documents: docs.map((d) => ({
            id: d.id,
            name: d.name,
            status: d.status,
            createdAt: d.createdAt.toISOString(),
          })),
          note: "Do not invent report contents. Staff can send documents via WhatsApp.",
        },
      };
    }

    case "getClinicProfile": {
      const clinic = await prisma.clinic.findFirst({
        where: { id: clinicId, organizationId: auth.tenant.organizationId },
        select: { name: true, address: true, phone: true },
      });
      const settings = await prisma.whatsAppClinicSettings.findUnique({
        where: { clinicId },
        select: { workingHours: true, timezone: true },
      });
      return {
        tool,
        ok: true,
        data: {
          clinicName: clinic?.name ?? auth.tenant.clinicName,
          address: clinic?.address ?? null,
          phone: clinic?.phone ?? null,
          workingHours: settings?.workingHours ?? null,
          timezone: settings?.timezone ?? null,
          note: "Only state facts present here or in Knowledge Base. Do not invent hours/location.",
        },
      };
    }

    case "getDoctorProfile": {
      if (!coupleId) {
        return { tool, ok: true, data: { doctor: null, note: "No assigned doctor on file for this contact" } };
      }
      const couple = await prisma.couple.findFirst({
        where: { id: coupleId, clinicId },
        select: {
          assignedDoctor: { select: { id: true, name: true, title: true } },
          assignedCoordinator: { select: { id: true, name: true, title: true } },
        },
      });
      return {
        tool,
        ok: true,
        data: {
          doctor: couple?.assignedDoctor
            ? {
                id: couple.assignedDoctor.id,
                name: couple.assignedDoctor.name,
                title: couple.assignedDoctor.title,
              }
            : null,
          coordinator: couple?.assignedCoordinator
            ? {
                id: couple.assignedCoordinator.id,
                name: couple.assignedCoordinator.name,
                title: couple.assignedCoordinator.title,
              }
            : null,
        },
      };
    }

    case "getAvailableAppointmentSlots": {
      // Slot calendar service not yet implemented — never invent availability.
      return {
        tool,
        ok: true,
        data: {
          slots: [],
          available: false,
          reason: "SLOT_SERVICE_NOT_CONFIGURED",
          message:
            "Live slot booking is being connected. Offer to connect the patient with the care team to book.",
        },
        handoffRecommended: true,
        handoffReason: "NO_SUITABLE_APPOINTMENT_SLOT",
      };
    }

    case "confirmAppointment": {
      return {
        tool,
        ok: true,
        data: {
          confirmed: false,
          reason: "CONFIRM_REQUIRES_INTERACTIVE_FLOW",
          message: "Ask patient to confirm via staff or upcoming interactive confirm flow.",
        },
      };
    }

    case "requestHuman": {
      const escalated = await escalateToHuman({
        tenant: auth.tenant,
        conversationId: auth.conversationId,
        patientId,
        coupleId,
        reason: "PATIENT_REQUESTED_HUMAN",
      });
      return {
        tool,
        ok: true,
        data: { handoff: true, careTaskId: escalated.careTaskId },
        handoffRecommended: true,
        handoffReason: "PATIENT_REQUESTED_HUMAN",
      };
    }

    case "pauseAI": {
      await pauseWhatsAppAi(auth.tenant, auth.conversationId, "STAFF_OR_SYSTEM_PAUSE");
      return { tool, ok: true, data: { paused: true } };
    }

    default:
      return { tool, ok: false, data: { error: "UNIMPLEMENTED_TOOL" } };
  }
}

/** Run allowlisted tools for an intent; stop early if handoff recommended. */
export async function runToolsForIntent(input: {
  auth: ToolAuth;
  toolNames: string[];
  maxTools?: number;
}): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  const unique = [...new Set(input.toolNames)].slice(0, input.maxTools ?? 4);
  for (const name of unique) {
    if (!isKnownPatientTool(name)) continue;
    // requestHuman is handled by pipeline handoff path — skip duplicate escalate here
    if (name === "requestHuman") {
      results.push({
        tool: name,
        ok: true,
        data: { deferred: true },
        handoffRecommended: true,
        handoffReason: "PATIENT_REQUESTED_HUMAN",
      });
      break;
    }
    try {
      const result = await executePatientTool(name, input.auth);
      results.push(result);
      if (result.handoffRecommended) break;
    } catch (err) {
      results.push({
        tool: name,
        ok: false,
        data: { error: err instanceof Error ? err.message.slice(0, 120) : "tool_failed" },
      });
    }
  }
  return results;
}

export function formatToolResultsForPrompt(results: ToolResult[]): string {
  if (!results.length) return "No system tools were run for this message.";
  return results
    .map((r) => `### Tool ${r.tool} (${r.ok ? "ok" : "failed"})\n${JSON.stringify(r.data)}`)
    .join("\n\n");
}
