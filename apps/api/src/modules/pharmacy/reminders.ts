import { prisma, type TenantContext } from "@smrkomed/database";

export function buildMedicationWhatsAppMessage(input: {
  patientFirstName: string;
  clinicName: string;
  medicineName: string;
  dosage: string;
  timeOfDay: string;
  instructions: string;
  appointmentLabel?: string | null;
}) {
  if (input.appointmentLabel) {
    return [
      `Hello ${input.patientFirstName},`,
      "",
      `Reminder from ${input.clinicName}.`,
      "",
      input.appointmentLabel,
      "",
      "Medication:",
      input.medicineName,
      "",
      "Instruction:",
      input.instructions,
      "",
      "Please follow the instructions provided by your doctor.",
      "",
      `— ${input.clinicName}`,
      "",
      "[DEMO — Message simulated, not sent]",
    ].join("\n");
  }

  return [
    `Hello ${input.patientFirstName},`,
    "",
    `Medication reminder from ${input.clinicName}.`,
    "",
    `Medicine: ${input.medicineName}`,
    `Dose: ${input.dosage}`,
    `Time: ${input.timeOfDay}`,
    `Instruction: ${input.instructions}`,
    "",
    "Please follow the medication instructions provided by your care team.",
    "",
    `— ${input.clinicName}`,
    "",
    "[DEMO — Message simulated, not sent]",
  ].join("\n");
}

export async function patientHasWhatsAppConsent(patientId: string) {
  const consent = await prisma.consent.findUnique({
    where: {
      patientId_consentType_channel: {
        patientId,
        consentType: "WHATSAPP_COMMUNICATION",
        channel: "WHATSAPP",
      },
    },
  });
  return consent?.status === "GRANTED";
}

/** Parse "8:00 AM", "20:00", "Morning" into local hour/minute. Defaults 9:00. */
export function parseTimeOfDay(timeOfDay: string | null | undefined): { h: number; m: number } {
  const raw = (timeOfDay ?? "").trim();
  if (!raw) return { h: 9, m: 0 };
  const lower = raw.toLowerCase();
  if (lower.includes("morning")) return { h: 8, m: 0 };
  if (lower.includes("afternoon") || lower.includes("noon")) return { h: 13, m: 0 };
  if (lower.includes("evening")) return { h: 18, m: 0 };
  if (lower.includes("night") || lower.includes("bed")) return { h: 21, m: 0 };

  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return { h: 9, m: 0 };
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const ampm = match[3]?.toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23) h = 9;
  return { h, m: Number.isFinite(m) ? m : 0 };
}

function daysBetween(start: Date, end: Date) {
  const a = new Date(start);
  a.setHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Create upcoming medication schedule reminders from prescription fields only.
 * Does not invent dosage. demoMode stays true until Meta send path claims the reminder.
 */
export async function scheduleMedicationReminders(input: {
  tenant: TenantContext;
  prescriptionItemId: string;
  patientId: string;
  careTaskId?: string | null;
  medicineName: string;
  dosage: string;
  timeOfDay: string;
  instructions: string;
  startDate?: Date | null;
  endDate?: Date | null;
  appointmentLabel?: string | null;
  /** Legacy demo offsets — used only when no start/end window. */
  offsetsHours?: number[];
  /** Max schedule rows to create (cap for safety). */
  maxSlots?: number;
}) {
  const hasConsent = await patientHasWhatsAppConsent(input.patientId);
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  const clinic = await prisma.clinic.findUnique({ where: { id: input.tenant.clinicId } });
  const body = buildMedicationWhatsAppMessage({
    patientFirstName: patient?.firstName ?? "there",
    clinicName: clinic?.name ?? input.tenant.clinicName,
    medicineName: input.medicineName,
    dosage: input.dosage || "As prescribed",
    timeOfDay: input.timeOfDay || "As scheduled",
    instructions: input.instructions || "Follow your care team instructions.",
    appointmentLabel: input.appointmentLabel ?? null,
  });

  const { h, m } = parseTimeOfDay(input.timeOfDay);
  const maxSlots = input.maxSlots ?? 14;
  const scheduledDates: Date[] = [];

  const start = input.startDate ? new Date(input.startDate) : new Date();
  const end = input.endDate
    ? new Date(input.endDate)
    : new Date(start.getTime() + 7 * 86_400_000);

  if (input.startDate || input.endDate) {
    const span = Math.min(daysBetween(start, end) + 1, maxSlots);
    for (let i = 0; i < span; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      day.setHours(h, m, 0, 0);
      if (day.getTime() < Date.now() - 60_000) continue;
      if (day > end) break;
      scheduledDates.push(day);
    }
  } else {
    const offsets = input.offsetsHours ?? [4, 28];
    for (const hours of offsets) {
      scheduledDates.push(new Date(Date.now() + hours * 3_600_000));
    }
  }

  const rows = [];
  for (const scheduledAt of scheduledDates.slice(0, maxSlots)) {
    rows.push(
      await prisma.medicationReminder.create({
        data: {
          clinicId: input.tenant.clinicId,
          prescriptionItemId: input.prescriptionItemId,
          patientId: input.patientId,
          careTaskId: input.careTaskId ?? null,
          scheduledAt,
          status: hasConsent ? "SCHEDULED" : "SKIPPED_NO_CONSENT",
          channel: "WHATSAPP",
          demoMode: true,
          demoMessageBody: body,
          failureReason: hasConsent ? null : "WhatsApp reminders are disabled for this patient.",
        },
      }),
    );
  }
  return { hasConsent, reminders: rows, demoMessageBody: body };
}

/** Operational status for UI — derived from stored status + clock. */
export function adherenceLabel(status: string, scheduledAt: Date, now = new Date()): string {
  if (["TAKEN", "MISSED", "SKIPPED", "COMPLETED", "CANCELLED", "SKIPPED_NO_CONSENT"].includes(status)) {
    return status;
  }
  if (["SENT", "DELIVERED"].includes(status)) return "DUE";
  const t = scheduledAt.getTime();
  if (t > now.getTime() + 15 * 60_000) return "UPCOMING";
  if (t > now.getTime() - 2 * 3_600_000) return "DUE";
  if (status === "SCHEDULED" || status === "PENDING" || status === "DUE") return "MISSED";
  return status;
}

export function serializeReminder(
  reminder: {
    id: string;
    clinicId: string;
    prescriptionItemId: string;
    patientId: string;
    careTaskId: string | null;
    scheduledAt: Date;
    status: string;
    channel: string;
    demoMode: boolean;
    demoMessageBody: string | null;
    failureReason: string | null;
    sentAt: Date | null;
    createdAt: Date;
    prescriptionItem?: {
      medicineName: string;
      dosage: string | null;
      frequency: string | null;
      timeOfDay: string | null;
      beforeAfterFood?: string | null;
      instructions: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      product?: { imageUrl: string | null; name: string } | null;
    };
    patient?: { firstName: string; lastName: string };
  },
) {
  const adherence = adherenceLabel(reminder.status, reminder.scheduledAt);
  return {
    id: reminder.id,
    clinicId: reminder.clinicId,
    prescriptionItemId: reminder.prescriptionItemId,
    patientId: reminder.patientId,
    careTaskId: reminder.careTaskId,
    scheduledAt: reminder.scheduledAt.toISOString(),
    status: reminder.status,
    adherenceStatus: adherence,
    channel: reminder.channel,
    demoMode: reminder.demoMode,
    demoMessageBody: reminder.demoMessageBody,
    failureReason: reminder.failureReason,
    sentAt: reminder.sentAt?.toISOString() ?? null,
    createdAt: reminder.createdAt.toISOString(),
    medicineName: reminder.prescriptionItem?.medicineName,
    dosage: reminder.prescriptionItem?.dosage,
    frequency: reminder.prescriptionItem?.frequency,
    timeOfDay: reminder.prescriptionItem?.timeOfDay,
    beforeAfterFood: reminder.prescriptionItem?.beforeAfterFood ?? null,
    instructions: reminder.prescriptionItem?.instructions,
    startDate: reminder.prescriptionItem?.startDate?.toISOString() ?? null,
    endDate: reminder.prescriptionItem?.endDate?.toISOString() ?? null,
    productImageUrl: reminder.prescriptionItem?.product?.imageUrl ?? null,
    patientName: reminder.patient
      ? `${reminder.patient.firstName} ${reminder.patient.lastName}`.trim()
      : null,
  };
}
