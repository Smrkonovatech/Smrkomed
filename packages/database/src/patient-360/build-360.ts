import { prisma } from "../client";
import type { TenantContext } from "../tenant";
import { buildUnifiedTimeline } from "./unified-timeline";

export type OperationalAlert = {
  id: string;
  level: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  title: string;
  reason: string;
  /** Operational attention only — never medical risk. */
  kind: "operational_attention";
};

function ageFromDob(dob: Date | null | undefined) {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function personLabel(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function buildAlerts(input: {
  overdueTasks: number;
  dueSoonTasks: number;
  missedAppointments: number;
  upcomingAppointments: number;
  pendingPayments: number;
  awaitingDocs: number;
  medsEndingSoon: number;
  pendingConsent: number;
  abhaPending: boolean;
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  if (input.overdueTasks > 0) {
    alerts.push({
      id: "overdue-tasks",
      level: "HIGH",
      category: "Follow-up",
      title: "Overdue care tasks",
      reason: `${input.overdueTasks} care task${input.overdueTasks === 1 ? "" : "s"} past due.`,
      kind: "operational_attention",
    });
  }
  if (input.missedAppointments > 0) {
    alerts.push({
      id: "missed-appt",
      level: "HIGH",
      category: "Appointment",
      title: "Missed / no-show appointment",
      reason: `${input.missedAppointments} recent missed or no-show appointment${input.missedAppointments === 1 ? "" : "s"}.`,
      kind: "operational_attention",
    });
  }
  if (input.pendingPayments > 0) {
    alerts.push({
      id: "pending-payment",
      level: "MEDIUM",
      category: "Payment",
      title: "Outstanding payment",
      reason: `${input.pendingPayments} unpaid or partially paid invoice${input.pendingPayments === 1 ? "" : "s"}.`,
      kind: "operational_attention",
    });
  }
  if (input.awaitingDocs > 0) {
    alerts.push({
      id: "missing-docs",
      level: "MEDIUM",
      category: "Documents",
      title: "Documents awaiting upload/review",
      reason: `${input.awaitingDocs} document${input.awaitingDocs === 1 ? "" : "s"} still awaiting action.`,
      kind: "operational_attention",
    });
  }
  if (input.medsEndingSoon > 0) {
    alerts.push({
      id: "meds-ending",
      level: "MEDIUM",
      category: "Medication",
      title: "Medication course ending soon",
      reason: `${input.medsEndingSoon} prescription item${input.medsEndingSoon === 1 ? "" : "s"} end within 7 days.`,
      kind: "operational_attention",
    });
  }
  if (input.dueSoonTasks > 0) {
    alerts.push({
      id: "due-soon",
      level: "MEDIUM",
      category: "Follow-up",
      title: "Follow-up due soon",
      reason: `${input.dueSoonTasks} task${input.dueSoonTasks === 1 ? "" : "s"} due in the next 48 hours.`,
      kind: "operational_attention",
    });
  }
  if (input.pendingConsent > 0) {
    alerts.push({
      id: "consent-pending",
      level: "MEDIUM",
      category: "Digital Health",
      title: "Consent pending",
      reason: `${input.pendingConsent} digital health consent request${input.pendingConsent === 1 ? "" : "s"} awaiting action.`,
      kind: "operational_attention",
    });
  }
  if (input.abhaPending) {
    alerts.push({
      id: "abha-pending",
      level: "LOW",
      category: "Digital Health",
      title: "ABHA verification pending",
      reason: "ABHA link requires verification. Not the same as consent or record exchange.",
      kind: "operational_attention",
    });
  }
  if (input.upcomingAppointments > 0) {
    alerts.push({
      id: "upcoming-appt",
      level: "LOW",
      category: "Appointment",
      title: "Upcoming appointment",
      reason: `${input.upcomingAppointments} confirmed appointment${input.upcomingAppointments === 1 ? "" : "s"} ahead.`,
      kind: "operational_attention",
    });
  }
  return alerts;
}

async function resolveCouple(tenant: TenantContext, coupleIdOrSlug: string) {
  const baseWhere = {
    clinicId: tenant.clinicId,
    clinic: { organizationId: tenant.organizationId },
  };
  const include = {
    primaryPatient: true,
    partnerPatient: true,
    assignedDoctor: { select: { id: true, name: true } },
    assignedCoordinator: { select: { id: true, name: true } },
    treatments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  } as const;

  const byId = await prisma.couple.findFirst({
    where: { id: coupleIdOrSlug, ...baseWhere },
    include,
  });
  if (byId) return byId;
  return prisma.couple.findFirst({
    where: { slug: coupleIdOrSlug, ...baseWhere },
    include,
  });
}

/**
 * Patient 360 aggregator — composed from existing SMRKOMED records.
 * No new patient DB; operational attention only (not medical risk).
 */
export async function buildPatient360(tenant: TenantContext, coupleIdOrSlug: string) {
  const couple = await resolveCouple(tenant, coupleIdOrSlug);
  if (!couple) return null;

  const patientIds = [couple.primaryPatientId, couple.partnerPatientId].filter(
    (id): id is string => Boolean(id),
  );
  const coupleIds = [couple.id];
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3_600_000);
  const in7d = new Date(now.getTime() + 7 * 86_400_000);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [
    nextAppointment,
    openTasks,
    overdueTasks,
    dueSoonTasks,
    missedAppts,
    upcomingAppts,
    activeCarePlan,
    prescriptions,
    invoices,
    docs,
    identity,
    pendingConsents,
    exchanges,
    conversations,
    insurancePolicies,
    timeline,
  ] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        startsAt: { gte: now },
        status: { in: ["CONFIRMED", "WAITING"] },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.careTask.count({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE"] },
      },
    }),
    prisma.careTask.count({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        OR: [
          { status: "OVERDUE" },
          {
            status: { in: ["WAITING", "IN_PROGRESS"] },
            dueDate: { lt: dayStart },
          },
        ],
      },
    }),
    prisma.careTask.count({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        status: { in: ["WAITING", "IN_PROGRESS"] },
        dueDate: { gte: dayStart, lte: in48h },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        status: "NO_SHOW",
        startsAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        startsAt: { gte: now, lte: in7d },
        status: { in: ["CONFIRMED", "WAITING"] },
      },
    }),
    prisma.carePlan.findFirst({
      where: { clinicId: tenant.clinicId, coupleId: couple.id, status: "ACTIVE" },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pharmacyPrescription.findMany({
      where: {
        clinicId: tenant.clinicId,
        patientId: { in: patientIds },
        status: { not: "CANCELLED" },
      },
      include: { items: true, doctor: { select: { name: true } } },
      orderBy: { prescriptionDate: "desc" },
      take: 20,
    }),
    prisma.billingInvoice.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ coupleId: couple.id }, { patientId: { in: patientIds } }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.document.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ coupleId: couple.id }, { patientId: { in: patientIds } }],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.digitalHealthIdentity.findUnique({
      where: { patientId: couple.primaryPatientId },
    }),
    prisma.digitalHealthConsent.count({
      where: {
        clinicId: tenant.clinicId,
        patientId: { in: patientIds },
        status: "PENDING",
      },
    }),
    prisma.healthRecordExchange.findMany({
      where: { clinicId: tenant.clinicId, patientId: { in: patientIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.conversation.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ coupleId: couple.id }, { patientId: { in: patientIds } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.insurancePolicy.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ coupleId: couple.id }, { patientId: { in: patientIds } }],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    buildUnifiedTimeline(tenant, { patientIds, coupleIds, limit: 80 }),
  ]);

  const outstandingInvoices = invoices.filter((i) => {
    const balance = Number(i.totalAmount) - Number(i.paidAmount);
    return balance > 0 && !["PAID", "CANCELLED"].includes(i.status);
  });
  const outstandingTotal = outstandingInvoices.reduce(
    (s, i) => s + Math.max(0, Number(i.totalAmount) - Number(i.paidAmount)),
    0,
  );

  const currentMeds = prescriptions.flatMap((rx) =>
    rx.items
      .filter((item) => !item.endDate || item.endDate.getTime() >= now.getTime())
      .map((item) => ({
        prescriptionId: rx.id,
        medicineName: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        timeOfDay: item.timeOfDay,
        beforeAfterFood: item.beforeAfterFood,
        instructions: item.instructions,
        startDate: item.startDate?.toISOString() ?? null,
        endDate: item.endDate?.toISOString() ?? null,
        prescribedStatus: rx.status,
        dispensedQty: item.quantityDispensed,
        prescribedQty: item.quantityPrescribed,
        dispenseLabel:
          item.quantityDispensed <= 0
            ? "PRESCRIBED"
            : item.quantityDispensed >= item.quantityPrescribed
              ? "DISPENSED"
              : "PARTIALLY_DISPENSED",
        doctorName: rx.doctorName ?? rx.doctor?.name ?? null,
      })),
  );

  const medsEndingSoon = prescriptions.reduce((count, rx) => {
    return (
      count +
      rx.items.filter((i) => i.endDate && i.endDate >= now && i.endDate <= in7d).length
    );
  }, 0);

  const awaitingDocs = docs.filter((d) =>
    ["AWAITING_UPLOAD", "DOCTOR_REVIEW"].includes(d.status),
  ).length;

  const abhaPending =
    identity?.status === "PENDING" || identity?.status === "VERIFICATION_REQUIRED";

  const alerts = buildAlerts({
    overdueTasks,
    dueSoonTasks,
    missedAppointments: missedAppts,
    upcomingAppointments: upcomingAppts,
    pendingPayments: outstandingInvoices.length,
    awaitingDocs,
    medsEndingSoon,
    pendingConsent: pendingConsents,
    abhaPending: Boolean(abhaPending),
  });

  const attentionLevel =
    alerts.some((a) => a.level === "HIGH")
      ? "HIGH"
      : alerts.some((a) => a.level === "MEDIUM")
        ? "MEDIUM"
        : alerts.length
          ? "LOW"
          : "ON_TRACK";

  const primary = couple.primaryPatient;
  const partner = couple.partnerPatient;
  const treatment = couple.treatments[0] ?? null;
  const latestConversation = conversations[0] ?? null;

  return {
    generatedAt: now.toISOString(),
    clinicName: tenant.clinicName,
    couple: {
      id: couple.id,
      slug: couple.slug,
      status: couple.status,
      careLoopActive: couple.careLoopActive,
      doctor: couple.assignedDoctor?.name ?? "Unassigned",
      coordinator: couple.assignedCoordinator?.name ?? "Unassigned",
      treatment: treatment?.label ?? null,
    },
    header: {
      patientName: personLabel(primary),
      patientId: primary.id,
      age: ageFromDob(primary.dateOfBirth),
      gender: primary.gender,
      contact: primary.phone ?? primary.whatsappNumber ?? primary.email ?? null,
      partnerName: partner ? personLabel(partner) : null,
      partnerId: partner?.id ?? null,
      abhaStatus: identity?.status ?? "NOT_LINKED",
      abhaMasked: identity?.abhaMasked ?? null,
      assignedDoctor: couple.assignedDoctor?.name ?? "Unassigned",
      assignedCoordinator: couple.assignedCoordinator?.name ?? "Unassigned",
      currentTreatment: treatment
        ? {
            id: treatment.id,
            label: treatment.label,
            kind: treatment.kind,
            status: treatment.status,
          }
        : null,
      currentCarePlan: activeCarePlan
        ? {
            id: activeCarePlan.id,
            type: activeCarePlan.type,
            name: activeCarePlan.name,
            status: activeCarePlan.status,
            steps: activeCarePlan.steps.map((s) => ({
              id: s.id,
              name: s.name,
              status: s.status,
              sortOrder: s.sortOrder,
            })),
          }
        : null,
      attentionStatus: attentionLevel,
      careLoopActive: couple.careLoopActive,
    },
    summaryCards: {
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            type: nextAppointment.type,
            startsAt: nextAppointment.startsAt.toISOString(),
            doctorName: nextAppointment.doctorName,
            status: nextAppointment.status,
          }
        : null,
      pendingTasks: openTasks,
      overdueTasks,
      followUpsDueSoon: dueSoonTasks,
      currentMedications: currentMeds.length,
      paymentStatus: outstandingInvoices.length === 0 ? "CLEAR" : "OUTSTANDING",
      outstandingAmountInr: outstandingTotal,
      insuranceStatus: insurancePolicies.length ? insurancePolicies[0]!.status : "NONE",
      insurancePolicyCount: insurancePolicies.length,
      documentsCount: docs.length,
      documentsAwaiting: awaitingDocs,
      documentStorageConfigured: docs.some((d) => Boolean(d.storageKey)),
      whatsappStatus: latestConversation
        ? latestConversation.automationPausedAt
          ? "AUTOMATION_PAUSED"
          : latestConversation.status
        : "NO_THREAD",
      conversationId: latestConversation?.id ?? null,
    },
    medications: {
      current: currentMeds,
      note: "Prescribed vs dispensed from pharmacy records. AI cannot prescribe.",
    },
    digitalHealth: {
      abha: {
        status: identity?.status ?? "NOT_LINKED",
        abhaMasked: identity?.abhaMasked ?? null,
        verificationStatus: identity?.verificationStatus ?? null,
        sandboxMode: identity?.sandboxMode ?? true,
      },
      pendingConsents,
      recentExchanges: exchanges.map((e) => ({
        id: e.id,
        status: e.status,
        purpose: e.purpose,
        sandboxMode: e.sandboxMode,
        createdAt: e.createdAt.toISOString(),
      })),
      note: "ABHA identity, consent, and record exchange are separate concepts.",
    },
    attention: {
      level: attentionLevel,
      label:
        attentionLevel === "HIGH"
          ? "Needs Attention"
          : attentionLevel === "MEDIUM"
            ? "Follow-up Risk"
            : attentionLevel === "LOW"
              ? "Monitor"
              : "On Track",
      alerts,
      note: "Operational attention indicators only — not medical risk scores.",
    },
    preparePatient: {
      whyHere: treatment?.label ?? activeCarePlan?.name ?? activeCarePlan?.type ?? null,
      currentTreatment: treatment?.label ?? null,
      lastConsultationHint:
        timeline.items.find((i) => i.type === "Consultation")?.title ?? null,
      recentEvents: timeline.items.slice(0, 5).map((i) => ({
        date: i.date,
        type: i.type,
        title: i.title,
      })),
      currentMedications: currentMeds.slice(0, 8).map((m) => ({
        name: m.medicineName,
        dosage: m.dosage,
        when: [m.frequency, m.timeOfDay, m.beforeAfterFood].filter(Boolean).join(" · "),
        status: m.dispenseLabel,
      })),
      pendingTasks: openTasks,
      upcomingAppointment: nextAppointment
        ? {
            type: nextAppointment.type,
            startsAt: nextAppointment.startsAt.toISOString(),
          }
        : null,
      payment: {
        status: outstandingInvoices.length ? "OUTSTANDING" : "CLEAR",
        outstandingAmountInr: outstandingTotal,
      },
      insurance: {
        status: insurancePolicies[0]?.status ?? "NONE",
        count: insurancePolicies.length,
      },
      documents: { count: docs.length, awaiting: awaitingDocs },
      abdm: {
        abhaStatus: identity?.status ?? "NOT_LINKED",
        pendingConsents,
      },
      communication: {
        whatsappStatus: latestConversation?.status ?? "NO_THREAD",
        automationPaused: Boolean(latestConversation?.automationPausedAt),
      },
      followUpPrompts: alerts.slice(0, 5).map((a) => a.title),
      disclaimer:
        "Prepared from SMRKOMED operational records only. Not medical advice. Review before use.",
    },
    timeline: {
      documentStorageNote: timeline.documentStorageNote,
      items: timeline.items,
    },
  };
}

export async function buildPatient360ByPatientId(tenant: TenantContext, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      clinicId: tenant.clinicId,
      clinic: { organizationId: tenant.organizationId },
    },
    select: { id: true },
  });
  if (!patient) return null;
  const couple = await prisma.couple.findFirst({
    where: {
      clinicId: tenant.clinicId,
      OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!couple) return null;
  return buildPatient360(tenant, couple.id);
}
