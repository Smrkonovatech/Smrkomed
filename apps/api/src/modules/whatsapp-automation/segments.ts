import type { Prisma, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { getClinicCommSettings, assertAutomationConsent, checkFrequencyLimits } from "./safety";

export type SegmentFilters = {
  status?: string | undefined;
  inactiveDays?: number | undefined;
  doctorUserId?: string | undefined;
  coordinatorUserId?: string | undefined;
  appointmentWithinDays?: number | undefined;
  appointmentStatus?: string | undefined;
  overdueTasks?: boolean | undefined;
  paymentOverdue?: boolean | undefined;
  whatsappConsent?: "GRANTED" | "REVOKED" | "PENDING" | "MISSING" | undefined;
  noUpcomingAppointment?: boolean | undefined;
  waitingForStaff?: boolean | undefined;
};

export async function previewSegment(tenant: TenantContext, filters: SegmentFilters) {
  const patientWhere: Prisma.PatientWhereInput = { clinicId: tenant.clinicId };
  if (filters.status) patientWhere.status = filters.status as never;
  if (filters.inactiveDays) {
    const since = new Date(Date.now() - filters.inactiveDays * 86_400_000);
    patientWhere.updatedAt = { lt: since };
  }

  if (filters.doctorUserId || filters.coordinatorUserId) {
    patientWhere.OR = [
      {
        primaryCouples: {
          some: {
            clinicId: tenant.clinicId,
            ...(filters.doctorUserId ? { assignedDoctorId: filters.doctorUserId } : {}),
            ...(filters.coordinatorUserId ? { assignedCoordinatorId: filters.coordinatorUserId } : {}),
          },
        },
      },
      {
        partnerCouples: {
          some: {
            clinicId: tenant.clinicId,
            ...(filters.doctorUserId ? { assignedDoctorId: filters.doctorUserId } : {}),
            ...(filters.coordinatorUserId ? { assignedCoordinatorId: filters.coordinatorUserId } : {}),
          },
        },
      },
    ];
  }

  let patients = await prisma.patient.findMany({
    where: patientWhere,
    select: { id: true, phone: true, whatsappNumber: true, firstName: true, lastName: true, status: true },
    take: 5000,
  });

  const exclusions: Record<string, number> = {};
  const bump = (reason: string) => {
    exclusions[reason] = (exclusions[reason] ?? 0) + 1;
  };

  if (filters.appointmentWithinDays != null) {
    const until = new Date(Date.now() + filters.appointmentWithinDays * 86_400_000);
    const appts = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: new Date(), lte: until },
        ...(filters.appointmentStatus ? { status: filters.appointmentStatus as never } : {}),
      },
      select: { coupleId: true },
    });
    const coupleIds = [...new Set(appts.map((a) => a.coupleId).filter(Boolean))] as string[];
    const couples = await prisma.couple.findMany({
      where: { clinicId: tenant.clinicId, id: { in: coupleIds } },
      select: { primaryPatientId: true, partnerPatientId: true },
    });
    const ids = new Set<string>();
    for (const c of couples) {
      ids.add(c.primaryPatientId);
      if (c.partnerPatientId) ids.add(c.partnerPatientId);
    }
    patients = patients.filter((p) => ids.has(p.id));
  }

  if (filters.noUpcomingAppointment) {
    const upcoming = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "WAITING"] },
      },
      select: { coupleId: true },
    });
    const coupleIds = [...new Set(upcoming.map((a) => a.coupleId).filter(Boolean))] as string[];
    const couples = await prisma.couple.findMany({
      where: { clinicId: tenant.clinicId, id: { in: coupleIds } },
      select: { primaryPatientId: true, partnerPatientId: true },
    });
    const withAppt = new Set<string>();
    for (const c of couples) {
      withAppt.add(c.primaryPatientId);
      if (c.partnerPatientId) withAppt.add(c.partnerPatientId);
    }
    patients = patients.filter((p) => !withAppt.has(p.id));
  }

  if (filters.overdueTasks) {
    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        status: { not: "COMPLETED" },
        dueDate: { lt: new Date() },
        coupleId: { not: null },
      },
      select: { coupleId: true },
      take: 2000,
    });
    const coupleIds = [...new Set(tasks.map((t) => t.coupleId).filter(Boolean))] as string[];
    const couples = await prisma.couple.findMany({
      where: { clinicId: tenant.clinicId, id: { in: coupleIds } },
      select: { primaryPatientId: true, partnerPatientId: true },
    });
    const ids = new Set<string>();
    for (const c of couples) {
      ids.add(c.primaryPatientId);
      if (c.partnerPatientId) ids.add(c.partnerPatientId);
    }
    patients = patients.filter((p) => ids.has(p.id));
  }

  if (filters.paymentOverdue) {
    const invoices = await prisma.billingInvoice.findMany({
      where: {
        clinicId: tenant.clinicId,
        dueDate: { lt: new Date() },
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        patientId: { not: null },
      },
      select: { patientId: true, totalAmount: true, paidAmount: true },
      take: 2000,
    });
    const ids = new Set(
      invoices
        .filter((i) => Number(i.totalAmount) - Number(i.paidAmount) > 0)
        .map((i) => i.patientId!)
        .filter(Boolean),
    );
    patients = patients.filter((p) => ids.has(p.id));
  }

  if (filters.waitingForStaff) {
    const waiting = await prisma.conversation.findMany({
      where: { clinicId: tenant.clinicId, channel: "WHATSAPP", status: "WAITING_STAFF", patientId: { not: null } },
      select: { patientId: true },
    });
    const ids = new Set(waiting.map((c) => c.patientId!));
    patients = patients.filter((p) => ids.has(p.id));
  }

  const settings = await getClinicCommSettings(tenant.clinicId);
  const consentRows = await prisma.consent.findMany({
    where: {
      clinicId: tenant.clinicId,
      consentType: "WHATSAPP_COMMUNICATION",
      channel: "WHATSAPP",
      patientId: { in: patients.map((p) => p.id) },
    },
  });
  const consentByPatient = new Map(consentRows.map((c) => [c.patientId, c.status]));

  const eligible: typeof patients = [];
  const excluded: Array<{ patientId: string; reason: string }> = [];

  for (const p of patients) {
    const phone = (p.whatsappNumber || p.phone || "").trim();
    if (!phone) {
      bump("NO_PHONE");
      excluded.push({ patientId: p.id, reason: "NO_PHONE" });
      continue;
    }
    const consentStatus = consentByPatient.get(p.id);
    if (filters.whatsappConsent === "GRANTED" && consentStatus !== "GRANTED") {
      bump("NO_CONSENT");
      excluded.push({ patientId: p.id, reason: "NO_CONSENT" });
      continue;
    }
    if (filters.whatsappConsent === "MISSING" && consentStatus) {
      continue;
    }
    if (consentStatus === "REVOKED") {
      bump("OPTED_OUT");
      excluded.push({ patientId: p.id, reason: "OPTED_OUT" });
      continue;
    }
    if (settings.requireConsentGranted && consentStatus !== "GRANTED") {
      bump("NO_CONSENT");
      excluded.push({ patientId: p.id, reason: "NO_CONSENT" });
      continue;
    }

    const prefs = await prisma.communicationPreference.findUnique({ where: { patientId: p.id } });
    if (prefs && !prefs.whatsappEnabled) {
      bump("OPTED_OUT");
      excluded.push({ patientId: p.id, reason: "OPTED_OUT" });
      continue;
    }

    const consentCheck = await assertAutomationConsent({
      clinicId: tenant.clinicId,
      patientId: p.id,
      requireGranted: settings.requireConsentGranted,
    });
    if (!consentCheck.ok) {
      bump("NO_CONSENT");
      excluded.push({ patientId: p.id, reason: "NO_CONSENT" });
      continue;
    }

    const freq = await checkFrequencyLimits({
      clinicId: tenant.clinicId,
      patientId: p.id,
      maxPerDay: settings.maxMessagesPerDay,
      minDelayMinutes: settings.minDelayMinutes,
    });
    if (!freq.ok) {
      bump("FREQUENCY_LIMIT");
      excluded.push({ patientId: p.id, reason: "FREQUENCY_LIMIT" });
      continue;
    }

    eligible.push(p);
  }

  return {
    audienceCount: patients.length,
    consentEligibleCount: eligible.length,
    skippedCount: excluded.length,
    eligiblePatientIds: eligible.map((p) => p.id),
    excluded,
    exclusionCounts: exclusions,
    sampleEligible: eligible.slice(0, 20).map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      status: p.status,
    })),
  };
}
