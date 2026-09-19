/**
 * WhatsApp appointment book / reschedule / cancel — reuses Appointment table + WA triggers.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma, writeTenantAuditLog } from "@smrkomed/database";
import { Prisma } from "@prisma/client";

import { decodeSlotId, validateSlotStillAvailable, formatTimeIST, formatDateIST, formatTime12IST } from "./availability";

export type PendingAction =
  | {
      kind: "BOOK_CONFIRM";
      slotId: string;
      idempotencyKey: string;
      appointmentType: string;
      doctorName: string | null;
      startTime: string;
      durationMin: number;
    }
  | {
      kind: "CANCEL_CONFIRM";
      appointmentId: string;
      idempotencyKey: string;
    }
  | {
      kind: "RESCHEDULE_PICK";
      appointmentId: string;
      idempotencyKey: string;
    }
  | {
      kind: "RESCHEDULE_CONFIRM";
      appointmentId: string;
      slotId: string;
      idempotencyKey: string;
      startTime: string;
      durationMin: number;
      doctorName: string | null;
    }
  | {
      kind: "SLOT_CHOICE";
      purpose: "BOOK" | "RESCHEDULE";
      appointmentId?: string;
      slots: Array<{ index: number; slotId: string; label: string }>;
      idempotencyKey: string;
    };

async function dispatchApptTrigger(input: {
  tenant: TenantContext;
  triggerType: "APPOINTMENT_BOOKED" | "APPOINTMENT_CANCELLED" | "APPOINTMENT_RESCHEDULED";
  appointmentId: string;
  coupleId: string | null;
  doctorName: string | null;
  startsAt: Date;
}) {
  const { dispatchWhatsAppTrigger } = await import("../whatsapp-automation/triggers");
  await dispatchWhatsAppTrigger({
    tenant: input.tenant,
    triggerType: input.triggerType,
    triggerEventId:
      input.triggerType === "APPOINTMENT_BOOKED"
        ? input.appointmentId
        : `${input.triggerType.toLowerCase()}_${input.appointmentId}_${input.startsAt.getTime()}`,
    coupleId: input.coupleId,
    vars: {
      appointment_date: formatDateIST(input.startsAt),
      appointment_time: formatTime12IST(input.startsAt),
      "appointment.date": formatDateIST(input.startsAt),
      "appointment.time": formatTime12IST(input.startsAt),
      doctor_name: input.doctorName ?? "",
      "doctor.name": input.doctorName ?? "",
      clinic_name: input.tenant.clinicName,
      "clinic.name": input.tenant.clinicName,
      source: "whatsapp_ai",
    },
  }).catch(() => undefined);
}

function appointmentCareDueTime(startsAt: Date): string {
  return formatTimeIST(startsAt);
}

async function notifyStaffAiAppointmentAction(input: {
  clinicId: string;
  conversationId: string;
  title: string;
  body: string;
}) {
  const { realtimeBus } = await import("../realtime/bus");
  realtimeBus.publish({
    type: "CONVERSATION_UPDATED",
    clinicId: input.clinicId,
    conversationId: input.conversationId,
    patch: { updatedAt: new Date().toISOString() },
  });
  const staff = await prisma.clinicMembership.findFirst({
    where: { clinicId: input.clinicId, status: "ACTIVE" },
    select: { userId: true },
  });
  if (!staff) return;
  await prisma.notification
    .create({
      data: {
        clinicId: input.clinicId,
        userId: staff.userId,
        title: input.title,
        body: input.body,
        href: "/whatsapp/inbox",
        status: "UNREAD",
      },
    })
    .catch(() => undefined);
}

/** Create once, or update existing open CareTask for this appointment (no duplicates). */
async function ensureCareTaskForAppointment(input: {
  clinicId: string;
  coupleId: string | null;
  appointmentId: string;
  title: string;
  description: string;
  startsAt: Date;
  doctorName?: string | null;
  appointmentType?: string | null;
  mode?: "create" | "reschedule";
}) {
  if (!input.coupleId) return;
  const existing = await prisma.careTask.findFirst({
    where: {
      clinicId: input.clinicId,
      coupleId: input.coupleId,
      category: "APPOINTMENT",
      description: { contains: input.appointmentId },
      status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
    },
    select: { id: true, dueDate: true },
  });

  const dueDate = input.startsAt;
  const dueTime = appointmentCareDueTime(input.startsAt);
  const metadata = {
    appointmentId: input.appointmentId,
    doctorName: input.doctorName ?? null,
    appointmentType: input.appointmentType ?? null,
    source: "WHATSAPP_AI",
    startsAt: input.startsAt.toISOString(),
  };

  if (existing) {
    await prisma.careTask.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        description: input.description,
        dueDate,
        dueTime,
        ...(input.mode === "reschedule"
          ? {
              rescheduledAt: new Date(),
              rescheduledReason: "WhatsApp AI reschedule",
              originalDueDate: existing.dueDate ?? dueDate,
            }
          : {}),
        metadata,
      },
    });
    return existing.id;
  }

  if (input.mode === "reschedule") {
    // Established book path creates CareTasks; if none exists on reschedule, create one.
  }

  const task = await prisma.careTask.create({
    data: {
      clinicId: input.clinicId,
      coupleId: input.coupleId,
      title: input.title,
      description: input.description,
      category: "APPOINTMENT",
      status: "WAITING",
      priority: "NORMAL",
      dueDate,
      dueTime,
      source: "WHATSAPP_AI",
      metadata,
    },
  });
  return task.id;
}

export async function setConversationPendingAction(input: {
  clinicId: string;
  conversationId: string;
  action: PendingAction | null;
  ttlMinutes?: number;
}) {
  const expiresAt =
    input.action == null
      ? null
      : new Date(Date.now() + (input.ttlMinutes ?? 30) * 60_000);
  await prisma.conversation.updateMany({
    where: { id: input.conversationId, clinicId: input.clinicId },
    data: {
      pendingAction: input.action === null ? Prisma.DbNull : (input.action as Prisma.InputJsonValue),
      pendingActionExpiresAt: expiresAt,
    },
  });
}

export async function getConversationPendingAction(input: {
  clinicId: string;
  conversationId: string;
}): Promise<PendingAction | null> {
  const row = await prisma.conversation.findFirst({
    where: { id: input.conversationId, clinicId: input.clinicId },
    select: { pendingAction: true, pendingActionExpiresAt: true },
  });
  if (!row?.pendingAction) return null;
  if (row.pendingActionExpiresAt && row.pendingActionExpiresAt < new Date()) {
    await setConversationPendingAction({
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      action: null,
    });
    return null;
  }
  return row.pendingAction as PendingAction;
}

export async function bookAppointmentFromSlot(input: {
  tenant: TenantContext;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  slotId: string;
  idempotencyKey: string;
  notes?: string;
}): Promise<
  | {
      ok: true;
      appointmentId: string;
      alreadyExisted: boolean;
      startsAt: string;
      doctorName: string | null;
      type: string;
      clinicId?: string;
      clinicName?: string;
    }
  | { ok: false; reason: string; handoffRecommended?: boolean }
> {
  console.log("[APPOINTMENT_CONFIRM_STARTED]", {
    clinicId: input.tenant.clinicId,
    conversationId: input.conversationId,
    patientId: input.patientId ?? null,
    coupleId: input.coupleId ?? null,
    slotId: input.slotId,
  });

  const decoded = decodeSlotId(input.slotId);
  if (!decoded) return { ok: false, reason: "INVALID_SLOT" };

  const existingIdem = await prisma.whatsAppBookingIdempotency.findUnique({
    where: {
      clinicId_key: { clinicId: input.tenant.clinicId, key: input.idempotencyKey },
    },
  });
  if (existingIdem) {
    const appt = await prisma.appointment.findFirst({
      where: { id: existingIdem.appointmentId },
    });
    if (appt) {
      console.log("[APPOINTMENT_CREATED]", {
        clinicId: appt.clinicId,
        appointmentId: appt.id,
        alreadyExisted: true,
        startsAt: appt.startsAt.toISOString(),
      });
      return {
        ok: true,
        appointmentId: appt.id,
        alreadyExisted: true,
        startsAt: appt.startsAt.toISOString(),
        doctorName: appt.doctorName,
        type: appt.type,
        clinicId: appt.clinicId,
      };
    }
  }

  const startTime = new Date(decoded.startMs);
  let doctorName = decoded.doctorName || null;
  if (doctorName && !doctorName.startsWith("Dr.") && !doctorName.startsWith("Dr ")) {
    doctorName = `Dr. ${doctorName.trim()}`;
  }
  if (!doctorName) {
    const { getClinicDoctors } = await import("../appointment-booking/slot-engine");
    const docs = await getClinicDoctors(input.tenant.clinicId);
    if (docs.length > 0 && docs[0]?.displayName) {
      doctorName = docs[0].displayName;
    }
  }

  // 1. Resolve doctor's active clinic membership if doctorName is provided
  let appointmentClinicId = input.tenant.clinicId;
  let targetClinicProfile: { id: string; name: string; city: string | null } | null = null;
  let assignedDoctorUserId: string | null = null;

  if (doctorName) {
    const cleanDocName = doctorName.replace(/^Dr\s*\.?\s*/i, "").trim();
    // Check current tenant clinic first
    const localMembership = await prisma.clinicMembership.findFirst({
      where: {
        clinicId: input.tenant.clinicId,
        user: {
          name: { contains: cleanDocName, mode: "insensitive" },
        },
        status: "ACTIVE",
      },
      include: {
        clinic: { select: { id: true, name: true, city: true } },
      },
    });

    if (localMembership?.clinic) {
      appointmentClinicId = localMembership.clinic.id;
      targetClinicProfile = localMembership.clinic;
      assignedDoctorUserId = localMembership.userId;
    } else {
      // Check other branches/clinics (e.g. Dr. Jismon J in Hospex Kochi)
      const docMembership = await prisma.clinicMembership.findFirst({
        where: {
          user: {
            name: { contains: cleanDocName, mode: "insensitive" },
          },
          status: "ACTIVE",
        },
        include: {
          clinic: { select: { id: true, name: true, city: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (docMembership?.clinic) {
        appointmentClinicId = docMembership.clinic.id;
        targetClinicProfile = docMembership.clinic;
        assignedDoctorUserId = docMembership.userId;
      }
    }
  }

  if (!targetClinicProfile) {
    targetClinicProfile = await prisma.clinic.findUnique({
      where: { id: appointmentClinicId },
      select: { id: true, name: true, city: true },
    });
  }

  const resolvedClinicName = targetClinicProfile?.city
    ? `${targetClinicProfile.name}, ${targetClinicProfile.city}`
    : targetClinicProfile?.name || input.tenant.clinicName || "Hospex";

  // Validate slot availability in the target clinic
  const valid = await validateSlotStillAvailable({
    clinicId: appointmentClinicId,
    startTime,
    durationMin: decoded.durationMin,
    doctorName,
  });
  if (!valid.ok) {
    console.log("[APPOINTMENT_CREATE_FAILED]", {
      clinicId: appointmentClinicId,
      reason: valid.reason,
      slotId: input.slotId,
    });
    return { ok: false, reason: valid.reason, handoffRecommended: valid.reason === "CLINIC_CLOSED" };
  }

  console.log("[APPOINTMENT_SLOT_REVALIDATED]", {
    clinicId: appointmentClinicId,
    slotId: input.slotId,
    valid: true,
  });

  // 2. Resolve or align Couple and Patients to the target clinic
  let coupleId = input.coupleId ?? null;
  if (!coupleId && input.patientId) {
    const couple = await prisma.couple.findFirst({
      where: {
        clinicId: { in: [appointmentClinicId, input.tenant.clinicId] },
        OR: [{ primaryPatientId: input.patientId }, { partnerPatientId: input.patientId }],
      },
      select: { id: true, clinicId: true, assignedDoctorId: true },
    });
    if (couple) {
      coupleId = couple.id;
      if (couple.clinicId !== appointmentClinicId || (assignedDoctorUserId && !couple.assignedDoctorId)) {
        await prisma.couple.update({
          where: { id: couple.id },
          data: {
            clinicId: appointmentClinicId,
            ...(assignedDoctorUserId ? { assignedDoctorId: assignedDoctorUserId } : {}),
          },
        }).catch(() => undefined);
      }
    } else {
      // Auto-create a lightweight couple record for fertility care integration
      try {
        const newCouple = await prisma.couple.create({
          data: {
            clinicId: appointmentClinicId,
            slug: `c-${input.patientId.slice(-8)}-${Date.now().toString(36)}`,
            primaryPatientId: input.patientId,
            ...(assignedDoctorUserId ? { assignedDoctorId: assignedDoctorUserId } : {}),
          },
          select: { id: true },
        });
        coupleId = newCouple.id;
        console.log("[COUPLE_CREATED]", {
          clinicId: appointmentClinicId,
          coupleId: newCouple.id,
          primaryPatientId: input.patientId,
        });
      } catch (coupleErr) {
        console.warn("[whatsapp-booking] Non-blocking: could not create couple, proceeding with individual appointment", coupleErr);
      }
    }
  } else if (coupleId) {
    await prisma.couple.updateMany({
      where: { id: coupleId },
      data: {
        clinicId: appointmentClinicId,
        ...(assignedDoctorUserId ? { assignedDoctorId: assignedDoctorUserId } : {}),
      },
    }).catch(() => undefined);
  }

  // Ensure patients are associated with target appointmentClinicId
  if (input.patientId) {
    await prisma.patient.updateMany({
      where: { id: input.patientId, clinicId: { not: appointmentClinicId } },
      data: { clinicId: appointmentClinicId },
    }).catch(() => undefined);
  }

  // Ensure conversation reflects appointmentClinicId
  if (input.conversationId) {
    await prisma.conversation.updateMany({
      where: { id: input.conversationId, clinicId: { not: appointmentClinicId } },
      data: { clinicId: appointmentClinicId, ...(coupleId ? { coupleId } : {}) },
    }).catch(() => undefined);
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: appointmentClinicId,
        ...(coupleId ? { coupleId } : {}),
        type: decoded.appointmentType,
        startsAt: startTime,
        durationMin: decoded.durationMin,
        doctorName,
        status: "CONFIRMED",
        notes: input.notes ?? `Booked via WhatsApp AI (${input.conversationId})`,
      },
    });

    await prisma.whatsAppBookingIdempotency.create({
      data: {
        clinicId: input.tenant.clinicId,
        key: input.idempotencyKey,
        appointmentId: appointment.id,
        conversationId: input.conversationId,
      },
    });

    console.log("[APPOINTMENT_CREATED]", {
      clinicId: appointmentClinicId,
      appointmentId: appointment.id,
      alreadyExisted: false,
      startsAt: appointment.startsAt.toISOString(),
      doctorName: appointment.doctorName,
      patientId: input.patientId ?? null,
      coupleId,
    });

    await writeTenantAuditLog(input.tenant, {
      action: "whatsapp.ai.appointment.book",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: {
        source: "WHATSAPP_AI",
        conversationId: input.conversationId,
        slotId: input.slotId,
        idempotencyKey: input.idempotencyKey,
        targetClinicId: appointmentClinicId,
      },
    }).catch(() => undefined);

    if (coupleId) {
      await ensureCareTaskForAppointment({
        clinicId: appointmentClinicId,
        coupleId,
        appointmentId: appointment.id,
        title: `AI booked appointment — ${appointment.type}`,
        description: `WhatsApp AI booked appointment ${appointment.id} at ${appointment.startsAt.toISOString()}`,
        startsAt: appointment.startsAt,
        doctorName: appointment.doctorName,
        appointmentType: appointment.type,
        mode: "create",
      }).catch(() => undefined);
    }

    await notifyStaffAiAppointmentAction({
      clinicId: appointmentClinicId,
      conversationId: input.conversationId,
      title: "AI booked appointment",
      body: `${appointment.type} · ${appointment.startsAt.toISOString()}${appointment.doctorName ? ` · ${appointment.doctorName}` : ""}`,
    }).catch(() => undefined);

    // Emit automation only after successful mutation (+ idempotency row).
    await dispatchApptTrigger({
      tenant: {
        ...input.tenant,
        clinicId: appointmentClinicId,
      },
      triggerType: "APPOINTMENT_BOOKED",
      appointmentId: appointment.id,
      coupleId,
      doctorName: appointment.doctorName,
      startsAt: appointment.startsAt,
    });

    console.log("[APPOINTMENT_CONFIRMATION_SENT]", {
      clinicId: appointmentClinicId,
      appointmentId: appointment.id,
      conversationId: input.conversationId,
    });

    return {
      ok: true,
      appointmentId: appointment.id,
      alreadyExisted: false,
      startsAt: appointment.startsAt.toISOString(),
      doctorName: appointment.doctorName,
      type: appointment.type,
      clinicId: appointmentClinicId,
      clinicName: resolvedClinicName,
    };
  } catch (err) {
    console.error("[APPOINTMENT_CREATE_FAILED]", {
      clinicId: input.tenant.clinicId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Unique idempotency race
    const again = await prisma.whatsAppBookingIdempotency.findUnique({
      where: {
        clinicId_key: { clinicId: input.tenant.clinicId, key: input.idempotencyKey },
      },
    });
    if (again) {
      const appt = await prisma.appointment.findFirst({
        where: { id: again.appointmentId, clinicId: input.tenant.clinicId },
      });
      if (appt) {
        return {
          ok: true,
          appointmentId: appt.id,
          alreadyExisted: true,
          startsAt: appt.startsAt.toISOString(),
          doctorName: appt.doctorName,
          type: appt.type,
        };
      }
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message.slice(0, 120) : "BOOK_FAILED",
      handoffRecommended: true,
    };
  }
}

export async function rescheduleAppointmentFromSlot(input: {
  tenant: TenantContext;
  conversationId: string;
  appointmentId: string;
  slotId: string;
  idempotencyKey: string;
}): Promise<
  | { ok: true; appointmentId: string; startsAt: string; doctorName?: string | null; alreadyExisted: boolean }
  | { ok: false; reason: string; handoffRecommended?: boolean }
> {
  const existingIdem = await prisma.whatsAppBookingIdempotency.findUnique({
    where: {
      clinicId_key: { clinicId: input.tenant.clinicId, key: input.idempotencyKey },
    },
  });
  if (existingIdem) {
    const appt = await prisma.appointment.findFirst({
      where: { id: existingIdem.appointmentId, clinicId: input.tenant.clinicId },
    });
    if (appt) {
      return {
        ok: true,
        appointmentId: appt.id,
        startsAt: appt.startsAt.toISOString(),
        doctorName: appt.doctorName,
        alreadyExisted: true,
      };
    }
  }

  const decoded = decodeSlotId(input.slotId);
  if (!decoded) return { ok: false, reason: "INVALID_SLOT" };

  const existing = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      clinicId: input.tenant.clinicId,
      status: { in: ["CONFIRMED", "WAITING"] },
    },
  });
  if (!existing) return { ok: false, reason: "APPOINTMENT_NOT_FOUND", handoffRecommended: true };

  const startTime = new Date(decoded.startMs);
  const doctorName = decoded.doctorName ?? existing.doctorName;
  const valid = await validateSlotStillAvailable({
    clinicId: input.tenant.clinicId,
    startTime,
    durationMin: decoded.durationMin,
    doctorName,
    excludeAppointmentId: existing.id,
  });
  if (!valid.ok) return { ok: false, reason: valid.reason };

  const updated = await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      startsAt: startTime,
      durationMin: decoded.durationMin,
      doctorName,
      notes: `${existing.notes ?? ""}\nRescheduled via WhatsApp AI`.trim(),
    },
  });

  await prisma.whatsAppBookingIdempotency.create({
    data: {
      clinicId: input.tenant.clinicId,
      key: input.idempotencyKey,
      appointmentId: updated.id,
      conversationId: input.conversationId,
    },
  }).catch(() => undefined);

  await writeTenantAuditLog(input.tenant, {
    action: "whatsapp.ai.appointment.reschedule",
    entityType: "Appointment",
    entityId: updated.id,
    metadata: {
      source: "WHATSAPP_AI",
      conversationId: input.conversationId,
      from: existing.startsAt.toISOString(),
      to: updated.startsAt.toISOString(),
    },
  }).catch(() => undefined);

  await ensureCareTaskForAppointment({
    clinicId: input.tenant.clinicId,
    coupleId: updated.coupleId,
    appointmentId: updated.id,
    title: `AI rescheduled appointment — ${updated.type}`,
    description: `WhatsApp AI rescheduled appointment ${updated.id} to ${updated.startsAt.toISOString()}`,
    startsAt: updated.startsAt,
    doctorName: updated.doctorName,
    appointmentType: updated.type,
    mode: "reschedule",
  }).catch(() => undefined);

  await notifyStaffAiAppointmentAction({
    clinicId: input.tenant.clinicId,
    conversationId: input.conversationId,
    title: "AI rescheduled appointment",
    body: `${updated.type} · ${existing.startsAt.toISOString()} → ${updated.startsAt.toISOString()}`,
  }).catch(() => undefined);

  await dispatchApptTrigger({
    tenant: input.tenant,
    triggerType: "APPOINTMENT_RESCHEDULED",
    appointmentId: updated.id,
    coupleId: updated.coupleId,
    doctorName: updated.doctorName,
    startsAt: updated.startsAt,
  });

  return {
    ok: true,
    appointmentId: updated.id,
    startsAt: updated.startsAt.toISOString(),
    doctorName: updated.doctorName,
    alreadyExisted: false,
  };
}

export async function cancelAppointmentForWhatsApp(input: {
  tenant: TenantContext;
  conversationId: string;
  appointmentId: string;
  idempotencyKey: string;
}): Promise<
  | { ok: true; appointmentId: string; alreadyCancelled: boolean }
  | { ok: false; reason: string; handoffRecommended?: boolean }
> {
  const existingIdem = await prisma.whatsAppBookingIdempotency.findUnique({
    where: {
      clinicId_key: { clinicId: input.tenant.clinicId, key: input.idempotencyKey },
    },
  });
  if (existingIdem) {
    return { ok: true, appointmentId: existingIdem.appointmentId, alreadyCancelled: true };
  }

  const existing = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, clinicId: input.tenant.clinicId },
  });
  if (!existing) return { ok: false, reason: "APPOINTMENT_NOT_FOUND", handoffRecommended: true };
  if (existing.status === "CANCELLED") {
    return { ok: true, appointmentId: existing.id, alreadyCancelled: true };
  }

  const updated = await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      notes: `${existing.notes ?? ""}\nCancelled via WhatsApp AI`.trim(),
    },
  });

  await prisma.whatsAppBookingIdempotency.create({
    data: {
      clinicId: input.tenant.clinicId,
      key: input.idempotencyKey,
      appointmentId: updated.id,
      conversationId: input.conversationId,
    },
  }).catch(() => undefined);

  await writeTenantAuditLog(input.tenant, {
    action: "whatsapp.ai.appointment.cancel",
    entityType: "Appointment",
    entityId: updated.id,
    metadata: { source: "WHATSAPP_AI", conversationId: input.conversationId },
  }).catch(() => undefined);

  if (updated.coupleId) {
    await prisma.careTask.updateMany({
      where: {
        clinicId: input.tenant.clinicId,
        coupleId: updated.coupleId,
        category: "APPOINTMENT",
        description: { contains: updated.id },
        status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
      },
      data: { status: "CANCELLED" },
    }).catch(() => undefined);
  }

  await notifyStaffAiAppointmentAction({
    clinicId: input.tenant.clinicId,
    conversationId: input.conversationId,
    title: "AI cancelled appointment",
    body: `${updated.type} · ${updated.startsAt.toISOString()}`,
  }).catch(() => undefined);

  await dispatchApptTrigger({
    tenant: input.tenant,
    triggerType: "APPOINTMENT_CANCELLED",
    appointmentId: updated.id,
    coupleId: updated.coupleId,
    doctorName: updated.doctorName,
    startsAt: updated.startsAt,
  });

  return { ok: true, appointmentId: updated.id, alreadyCancelled: false };
}

export function formatSlotLabel(slot: { startTime: string; doctorName: string | null; appointmentType: string }): string {
  const d = new Date(slot.startTime);
  const when = d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const cleanDoc = slot.doctorName
    ? slot.doctorName.startsWith("Dr.")
      ? slot.doctorName
      : `Dr. ${slot.doctorName.replace(/^Dr\.?\s*/i, "").trim()}`
    : null;
  const doc = cleanDoc ? ` · ${cleanDoc}` : "";
  return `${when}${doc} · ${slot.appointmentType}`;
}
