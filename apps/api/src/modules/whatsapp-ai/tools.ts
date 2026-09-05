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
  "bookAppointment",
  "rescheduleAppointment",
  "cancelAppointment",
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
  args: Record<string, unknown> = {},
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

  const str = (k: string) => (typeof args[k] === "string" ? String(args[k]).trim() : "");

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
      const { getAvailableAppointmentSlots } = await import("../appointments/availability");
      const { formatSlotLabel, setConversationPendingAction } = await import(
        "../appointments/whatsapp-booking"
      );
      // Doctor-specific availability requires DoctorSchedule/calendar — never invent.
      const requestedDoctor = str("doctorName") || str("requestedDoctor") || null;
      if (requestedDoctor) {
        return {
          tool,
          ok: true,
          data: {
            type: "appointment_slots",
            slots: [],
            available: false,
            reason: "DOCTOR_SCHEDULE_NOT_VERIFIABLE",
            message:
              "Doctor-specific availability cannot be verified without DoctorSchedule/calendar. Connect the patient with the care team. Do not show generic clinic slots as belonging to this doctor.",
          },
          handoffRecommended: true,
          handoffReason: "DOCTOR_SCHEDULE_NOT_VERIFIABLE",
        };
      }
      // Clinic working-hours slots only — doctorId/doctorName stay null (no DoctorSchedule).
      const result = await getAvailableAppointmentSlots({
        clinicId,
        doctorName: null,
        appointmentType: str("appointmentType") || "Consultation",
        preferredDate: str("preferredDate") || null,
      });
      if (!result.available) {
        return {
          tool,
          ok: true,
          data: {
            type: "appointment_slots",
            slots: [],
            available: false,
            reason: result.reason ?? "NO_OPEN_SLOTS_IN_RANGE",
            timezone: result.timezone,
            message:
              "No open appointment slots were found in clinic working hours for the requested window. Tell the patient clearly — do not invent times. Offer care team help if they want.",
          },
          // Soft signal: pipeline should NOT pause AI / claim booking is impossible.
          handoffRecommended: false,
          handoffReason: "NO_SUITABLE_APPOINTMENT_SLOT",
        };
      }
      const labeled = result.slots.map((s, index) => ({
        index: index + 1,
        slotId: s.slotId,
        label: formatSlotLabel(s),
        startTime: s.startTime,
        endTime: s.endTime,
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        appointmentType: s.appointmentType,
        timezone: s.timezone,
        location: s.location,
      }));
      const idempotencyKey = `slot_choice_${auth.conversationId}_${Date.now()}`;
      const purpose = str("purpose") === "RESCHEDULE" ? "RESCHEDULE" : "BOOK";
      const appointmentId = str("appointmentId") || undefined;
      let pendingActionPersisted = true;
      try {
        await setConversationPendingAction({
          clinicId,
          conversationId: auth.conversationId,
          action: {
            kind: "SLOT_CHOICE",
            purpose,
            ...(appointmentId ? { appointmentId } : {}),
            slots: labeled.map((s) => ({ index: s.index, slotId: s.slotId, label: s.label })),
            idempotencyKey,
          },
        });
      } catch (err) {
        pendingActionPersisted = false;
        console.error("[WhatsApp AI] pendingAction persist failed", {
          clinicId,
          conversationId: auth.conversationId,
          errorName: err instanceof Error ? err.name : "unknown",
          // Likely missing migration columns — still return slots to the patient.
        });
      }
      return {
        tool,
        ok: true,
        data: {
          type: "appointment_slots",
          available: true,
          timezone: result.timezone,
          slots: labeled,
          pendingActionPersisted,
          doctorScheduleNote:
            "Slots are clinic working-hour openings, not doctor-verified calendars. doctorId is null until DoctorSchedule exists.",
          instruction:
            "Present these REAL slots to the patient numbered 1..N. Ask them to reply with the number. Do not invent other times. Do not attribute slots to a named doctor.",
        },
        ...(pendingActionPersisted
          ? {}
          : {
              handoffRecommended: true,
              handoffReason: "PENDING_ACTION_PERSIST_FAILED",
            }),
      };
    }

    case "bookAppointment": {
      const slotId = str("slotId");
      if (!slotId) return { tool, ok: false, data: { error: "MISSING_SLOT_ID" } };
      const { bookAppointmentFromSlot, setConversationPendingAction } = await import(
        "../appointments/whatsapp-booking"
      );
      const idempotencyKey =
        str("idempotencyKey") || `book_${auth.conversationId}_${slotId}`;
      const booked = await bookAppointmentFromSlot({
        tenant: auth.tenant,
        conversationId: auth.conversationId,
        patientId,
        coupleId,
        slotId,
        idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId,
        conversationId: auth.conversationId,
        action: null,
      });
      if (!booked.ok) {
        return {
          tool,
          ok: false,
          data: booked,
          handoffRecommended: Boolean(booked.handoffRecommended),
          handoffReason: booked.reason,
        };
      }
      return {
        tool,
        ok: true,
        data: {
          booked: true,
          alreadyExisted: booked.alreadyExisted,
          appointmentId: booked.appointmentId,
          startsAt: booked.startsAt,
          doctorName: booked.doctorName,
          type: booked.type,
          message: "Appointment booked in SmrkoMed. Confirm details to the patient.",
        },
      };
    }

    case "rescheduleAppointment": {
      const appointmentId = str("appointmentId");
      const slotId = str("slotId");
      if (!appointmentId || !slotId) {
        return { tool, ok: false, data: { error: "MISSING_APPOINTMENT_OR_SLOT" } };
      }
      const { rescheduleAppointmentFromSlot, setConversationPendingAction } = await import(
        "../appointments/whatsapp-booking"
      );
      const idempotencyKey =
        str("idempotencyKey") || `reschedule_${auth.conversationId}_${appointmentId}_${slotId}`;
      const result = await rescheduleAppointmentFromSlot({
        tenant: auth.tenant,
        conversationId: auth.conversationId,
        appointmentId,
        slotId,
        idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId,
        conversationId: auth.conversationId,
        action: null,
      });
      if (!result.ok) {
        return {
          tool,
          ok: false,
          data: result,
          handoffRecommended: Boolean(result.handoffRecommended),
          handoffReason: result.reason,
        };
      }
      return { tool, ok: true, data: { rescheduled: true, ...result } };
    }

    case "cancelAppointment": {
      const appointmentId = str("appointmentId");
      if (!appointmentId) {
        // Load next appointment and ask confirm
        const appts = await prisma.appointment.findMany({
          where: {
            clinicId,
            status: { in: ["CONFIRMED", "WAITING"] },
            startsAt: { gte: new Date() },
            ...(coupleId ? { coupleId } : {}),
          },
          orderBy: { startsAt: "asc" },
          take: 1,
        });
        if (!appts[0]) {
          return { tool, ok: true, data: { cancelled: false, reason: "NO_UPCOMING_APPOINTMENT" } };
        }
        const appt = appts[0];
        const { setConversationPendingAction } = await import("../appointments/whatsapp-booking");
        const idempotencyKey = `cancel_${auth.conversationId}_${appt.id}`;
        await setConversationPendingAction({
          clinicId,
          conversationId: auth.conversationId,
          action: {
            kind: "CANCEL_CONFIRM",
            appointmentId: appt.id,
            idempotencyKey,
          },
        });
        return {
          tool,
          ok: true,
          data: {
            needsConfirmation: true,
            appointmentId: appt.id,
            startsAt: appt.startsAt.toISOString(),
            doctorName: appt.doctorName,
            type: appt.type,
            instruction: 'Ask: "Would you like to cancel your appointment on [date]? Reply Yes to cancel or No to keep it."',
          },
        };
      }
      if (str("confirmed") !== "true" && args["confirmed"] !== true) {
        const { setConversationPendingAction } = await import("../appointments/whatsapp-booking");
        const idempotencyKey = `cancel_${auth.conversationId}_${appointmentId}`;
        await setConversationPendingAction({
          clinicId,
          conversationId: auth.conversationId,
          action: { kind: "CANCEL_CONFIRM", appointmentId, idempotencyKey },
        });
        return {
          tool,
          ok: true,
          data: { needsConfirmation: true, appointmentId },
        };
      }
      const { cancelAppointmentForWhatsApp, setConversationPendingAction } = await import(
        "../appointments/whatsapp-booking"
      );
      const idempotencyKey =
        str("idempotencyKey") || `cancel_${auth.conversationId}_${appointmentId}`;
      const result = await cancelAppointmentForWhatsApp({
        tenant: auth.tenant,
        conversationId: auth.conversationId,
        appointmentId,
        idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId,
        conversationId: auth.conversationId,
        action: null,
      });
      if (!result.ok) {
        return {
          tool,
          ok: false,
          data: result,
          handoffRecommended: Boolean(result.handoffRecommended),
          handoffReason: result.reason,
        };
      }
      return { tool, ok: true, data: { cancelled: true, ...result } };
    }

    case "confirmAppointment": {
      return {
        tool,
        ok: true,
        data: {
          confirmed: false,
          reason: "USE_NATURAL_LANGUAGE_OR_SLOT_NUMBER",
          message: "Ask the patient to reply Confirm or a slot number from the list.",
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

/** Run allowlisted tools for an intent; stop early only for hard handoffs. */
export async function runToolsForIntent(input: {
  auth: ToolAuth;
  toolNames: string[];
  intent?: string;
  /** Extra tool args (e.g. preferredDate from NL parse). */
  args?: Record<string, unknown>;
  maxTools?: number;
}): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  const unique = [...new Set(input.toolNames)].slice(0, input.maxTools ?? 4);

  const baseArgs: Record<string, unknown> = { ...(input.args ?? {}) };
  if (input.intent === "APPOINTMENT_RESCHEDULE") {
    baseArgs["purpose"] = "RESCHEDULE";
    const next = await prisma.appointment.findFirst({
      where: {
        clinicId: input.auth.tenant.clinicId,
        status: { in: ["CONFIRMED", "WAITING"] },
        startsAt: { gte: new Date() },
        ...(input.auth.coupleId ? { coupleId: input.auth.coupleId } : {}),
      },
      orderBy: { startsAt: "asc" },
      select: { id: true },
    });
    if (next) baseArgs["appointmentId"] = next.id;
  }

  for (const name of unique) {
    if (!isKnownPatientTool(name)) continue;
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
      const result = await executePatientTool(name, input.auth, baseArgs);
      results.push(result);
      // Soft no-slot result must not block remaining tools (e.g. getAppointments).
      if (
        result.handoffRecommended &&
        result.handoffReason !== "NO_SUITABLE_APPOINTMENT_SLOT"
      ) {
        break;
      }
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

/** Deterministic WhatsApp copy for real slot lists — avoids LLM inventing inability. */
export function formatAppointmentSlotsPatientMessage(input: {
  clinicName: string;
  slots: Array<{ index: number; label: string }>;
  purpose?: string;
}): string {
  const header =
    input.purpose === "RESCHEDULE"
      ? `Here are available times to reschedule your appointment at ${input.clinicName}:`
      : `Here are available appointment times at ${input.clinicName}:`;
  const lines = input.slots.map((s) => `${s.index}. ${s.label}`);
  return `✦ Smrko AI\n\n${header}\n\n${lines.join("\n")}\n\nReply with the number of the time you prefer (for example: 2).`;
}

export function formatNoSlotsPatientMessage(clinicName: string): string {
  return `✦ Smrko AI\n\nI checked ${clinicName}'s open hours and there are no available appointment times in the next few days. I can try another day if you suggest one, or connect you with our care team — just say "speak to staff".`;
}
