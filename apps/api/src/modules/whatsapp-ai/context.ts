import { prisma, type TenantContext } from "@smrkomed/database";

export type WhatsAppAiContext = {
  clinicName: string;
  patientFirstName: string | null;
  appointmentSummary: string | null;
  journeyStage: string | null;
  careTaskTitle: string | null;
  recentMessages: Array<{ role: "patient" | "clinic"; text: string }>;
};

export async function loadWhatsAppAiContext(
  tenant: TenantContext,
  input: { conversationId: string; patientId?: string | null; coupleId?: string | null },
): Promise<WhatsAppAiContext> {
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenant.clinicId, organizationId: tenant.organizationId },
    select: { name: true },
  });

  let patientFirstName: string | null = null;
  if (input.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: tenant.clinicId },
      select: { firstName: true },
    });
    patientFirstName = patient?.firstName ?? null;
  }

  let appointmentSummary: string | null = null;
  if (input.coupleId || input.patientId) {
    const appt = await prisma.appointment.findFirst({
      where: {
        clinicId: tenant.clinicId,
        ...(input.coupleId ? { coupleId: input.coupleId } : {}),
        status: { in: ["CONFIRMED", "WAITING"] },
        startsAt: { gte: new Date(Date.now() - 86_400_000) },
      },
      orderBy: { startsAt: "asc" },
      select: { type: true, startsAt: true, doctorName: true, status: true },
    });
    if (appt) {
      appointmentSummary = `${appt.type ?? "Appointment"} on ${appt.startsAt.toISOString().slice(0, 16)} with ${appt.doctorName ?? "clinic"} (${appt.status})`;
    }
  }

  let journeyStage: string | null = null;
  let careTaskTitle: string | null = null;
  if (input.coupleId) {
    const plan = await prisma.carePlan.findFirst({
      where: { clinicId: tenant.clinicId, coupleId: input.coupleId },
      orderBy: { updatedAt: "desc" },
      select: { currentStageName: true, status: true },
    });
    journeyStage = plan?.currentStageName ?? plan?.status ?? null;
    const task = await prisma.careTask.findFirst({
      where: {
        clinicId: tenant.clinicId,
        coupleId: input.coupleId,
        status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
      },
      orderBy: { dueDate: "asc" },
      select: { title: true },
    });
    careTaskTitle = task?.title ?? null;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: input.conversationId },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { direction: true, content: true, senderType: true },
  });

  const recentMessages = messages
    .reverse()
    .map((m) => ({
      role: m.direction === "INBOUND" ? ("patient" as const) : ("clinic" as const),
      text: m.content.slice(0, 400),
    }));

  return {
    clinicName: clinic?.name ?? tenant.clinicName,
    patientFirstName,
    appointmentSummary,
    journeyStage,
    careTaskTitle,
    recentMessages,
  };
}
