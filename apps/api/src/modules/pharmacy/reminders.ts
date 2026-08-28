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

/** Create upcoming demo WhatsApp reminders for a prescription item. Never sends real WhatsApp. */
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
  /** Hours from now for demo upcoming reminders (default: tomorrow same slot + day after). */
  offsetsHours?: number[];
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

  const offsets = input.offsetsHours ?? [4, 28];
  const rows = [];
  for (const hours of offsets) {
    const scheduledAt = new Date(Date.now() + hours * 3_600_000);
    if (input.endDate && scheduledAt > input.endDate) continue;
    if (input.startDate && scheduledAt < input.startDate && hours > 48) continue;
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
      instructions: string | null;
      product?: { imageUrl: string | null; name: string } | null;
    };
    patient?: { firstName: string; lastName: string };
  },
) {
  return {
    id: reminder.id,
    clinicId: reminder.clinicId,
    prescriptionItemId: reminder.prescriptionItemId,
    patientId: reminder.patientId,
    careTaskId: reminder.careTaskId,
    scheduledAt: reminder.scheduledAt.toISOString(),
    status: reminder.status,
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
    instructions: reminder.prescriptionItem?.instructions,
    productImageUrl: reminder.prescriptionItem?.product?.imageUrl ?? null,
    patientName: reminder.patient
      ? `${reminder.patient.firstName} ${reminder.patient.lastName}`.trim()
      : null,
  };
}
