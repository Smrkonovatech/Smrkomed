import { prisma } from "../client";
import type { TenantContext } from "../tenant";

export type UnifiedTimelineItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  sourceModule: string;
  actor: string | null;
  patientId: string | null;
  coupleId: string | null;
  clinic: string;
  relatedTreatmentId: string | null;
  href: string | null;
  recordStatus: string | null;
};

/**
 * Chronological events from existing SMRKOMED records only.
 * Does not manufacture history.
 */
export async function buildUnifiedTimeline(
  tenant: TenantContext,
  input: { patientIds: string[]; coupleIds: string[]; limit?: number },
): Promise<{
  items: UnifiedTimelineItem[];
  documentStorageNote: string | null;
}> {
  const limit = input.limit ?? 120;
  const { patientIds, coupleIds } = input;
  const clinicName = tenant.clinicName;
  const clinicId = tenant.clinicId;

  const [
    appointments,
    prescriptions,
    sales,
    documents,
    treatments,
    carePlans,
    consultations,
    careTasks,
    reminders,
    invoices,
    payments,
    identities,
    consents,
    exchanges,
    conversations,
  ] = await Promise.all([
    coupleIds.length
      ? prisma.appointment.findMany({
          where: { clinicId, coupleId: { in: coupleIds } },
          orderBy: { startsAt: "desc" },
          take: 40,
        })
      : [],
    patientIds.length
      ? prisma.pharmacyPrescription.findMany({
          where: { clinicId, patientId: { in: patientIds } },
          include: { items: true, doctor: { select: { name: true } } },
          orderBy: { prescriptionDate: "desc" },
          take: 40,
        })
      : [],
    patientIds.length
      ? prisma.pharmacySale.findMany({
          where: { clinicId, patientId: { in: patientIds } },
          orderBy: { soldAt: "desc" },
          take: 20,
        })
      : [],
    prisma.document.findMany({
      where: {
        clinicId,
        OR: [
          ...(patientIds.length ? [{ patientId: { in: patientIds } }] : []),
          ...(coupleIds.length ? [{ coupleId: { in: coupleIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    coupleIds.length
      ? prisma.treatment.findMany({
          where: { clinicId, coupleId: { in: coupleIds } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : [],
    coupleIds.length
      ? prisma.carePlan.findMany({
          where: { clinicId, coupleId: { in: coupleIds } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : [],
    coupleIds.length
      ? prisma.consultationNote.findMany({
          where: { clinicId, coupleId: { in: coupleIds } },
          include: { createdBy: { select: { name: true } } },
          orderBy: { consultationDate: "desc" },
          take: 40,
        })
      : [],
    coupleIds.length
      ? prisma.careTask.findMany({
          where: { clinicId, coupleId: { in: coupleIds } },
          orderBy: { updatedAt: "desc" },
          take: 40,
        })
      : [],
    patientIds.length
      ? prisma.medicationReminder.findMany({
          where: { clinicId, patientId: { in: patientIds } },
          include: { prescriptionItem: { select: { medicineName: true } } },
          orderBy: { scheduledAt: "desc" },
          take: 30,
        })
      : [],
    prisma.billingInvoice.findMany({
      where: {
        clinicId,
        OR: [
          ...(patientIds.length ? [{ patientId: { in: patientIds } }] : []),
          ...(coupleIds.length ? [{ coupleId: { in: coupleIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.billingPayment.findMany({
      where: {
        clinicId,
        OR: [
          ...(patientIds.length ? [{ patientId: { in: patientIds } }] : []),
          ...(coupleIds.length ? [{ coupleId: { in: coupleIds } }] : []),
        ],
      },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
    patientIds.length
      ? prisma.digitalHealthIdentity.findMany({
          where: { clinicId, patientId: { in: patientIds } },
        })
      : [],
    patientIds.length
      ? prisma.digitalHealthConsent.findMany({
          where: { clinicId, patientId: { in: patientIds } },
          orderBy: { requestedAt: "desc" },
          take: 20,
        })
      : [],
    patientIds.length
      ? prisma.healthRecordExchange.findMany({
          where: { clinicId, patientId: { in: patientIds } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    prisma.conversation.findMany({
      where: {
        clinicId,
        OR: [
          ...(patientIds.length ? [{ patientId: { in: patientIds } }] : []),
          ...(coupleIds.length ? [{ coupleId: { in: coupleIds } }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: {
        id: true,
        patientId: true,
        coupleId: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        automationPausedAt: true,
      },
    }),
  ]);

  const items: UnifiedTimelineItem[] = [];

  for (const a of appointments) {
    items.push({
      id: `appt-${a.id}`,
      date: a.startsAt.toISOString(),
      type: "Appointment",
      title: a.type,
      sourceModule: "Appointments",
      actor: a.doctorName,
      patientId: null,
      coupleId: a.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/appointments",
      recordStatus: a.status,
    });
  }

  for (const c of consultations) {
    items.push({
      id: `consult-${c.id}`,
      date: c.consultationDate.toISOString(),
      type: "Consultation",
      title: c.reasonForVisit?.slice(0, 100) || "Consultation note",
      sourceModule: "Consultation",
      actor: c.createdBy?.name ?? null,
      patientId: null,
      coupleId: c.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: null,
    });
  }

  for (const rx of prescriptions) {
    items.push({
      id: `rx-${rx.id}`,
      date: rx.prescriptionDate.toISOString(),
      type: "Prescription",
      title: rx.items.map((i) => i.medicineName).join(", ") || "Prescription",
      sourceModule: "Pharmacy",
      actor: rx.doctorName ?? rx.doctor?.name ?? null,
      patientId: rx.patientId,
      coupleId: rx.coupleId,
      clinic: clinicName,
      relatedTreatmentId: rx.treatmentId,
      href: `/pharmacy/prescriptions/${rx.id}`,
      recordStatus: rx.status,
    });
  }

  for (const sale of sales) {
    items.push({
      id: `sale-${sale.id}`,
      date: sale.soldAt.toISOString(),
      type: "Pharmacy dispensed",
      title: sale.invoiceNumber,
      sourceModule: "Pharmacy",
      actor: null,
      patientId: sale.patientId,
      coupleId: sale.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: `/pharmacy/sales/${sale.id}`,
      recordStatus: sale.paymentStatus,
    });
  }

  for (const r of reminders) {
    items.push({
      id: `medrem-${r.id}`,
      date: r.scheduledAt.toISOString(),
      type: "Medication reminder",
      title: r.prescriptionItem.medicineName,
      sourceModule: "Pharmacy",
      actor: null,
      patientId: r.patientId,
      coupleId: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: r.status,
    });
  }

  for (const t of treatments) {
    items.push({
      id: `tx-${t.id}`,
      date: (t.startedAt ?? t.createdAt).toISOString(),
      type: "Treatment",
      title: t.label,
      sourceModule: "Treatments",
      actor: null,
      patientId: null,
      coupleId: t.coupleId,
      clinic: clinicName,
      relatedTreatmentId: t.id,
      href: null,
      recordStatus: t.status,
    });
  }

  for (const p of carePlans) {
    items.push({
      id: `cp-${p.id}`,
      date: p.updatedAt.toISOString(),
      type: "Care plan",
      title: String(p.type),
      sourceModule: "Care Loop",
      actor: null,
      patientId: null,
      coupleId: p.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: p.status,
    });
  }

  for (const task of careTasks) {
    items.push({
      id: `task-${task.id}`,
      date: (task.completedAt ?? task.dueDate ?? task.createdAt).toISOString(),
      type: task.status === "COMPLETED" ? "Care task completed" : "Care task",
      title: task.title,
      sourceModule: "Care Loop",
      actor: null,
      patientId: null,
      coupleId: task.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/care-loop",
      recordStatus: task.status,
    });
  }

  for (const d of documents) {
    items.push({
      id: `doc-${d.id}`,
      date: d.createdAt.toISOString(),
      type: "Document",
      title: d.name,
      sourceModule: "Documents",
      actor: null,
      patientId: d.patientId,
      coupleId: d.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: d.storageKey ? d.status : "METADATA_ONLY",
    });
  }

  for (const inv of invoices) {
    items.push({
      id: `inv-${inv.id}`,
      date: inv.createdAt.toISOString(),
      type: "Invoice",
      title: inv.invoiceNumber,
      sourceModule: "Payments",
      actor: null,
      patientId: inv.patientId,
      coupleId: inv.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/payments",
      recordStatus: inv.status,
    });
  }

  for (const pay of payments) {
    items.push({
      id: `pay-${pay.id}`,
      date: (pay.paidAt ?? pay.createdAt).toISOString(),
      type: "Payment",
      title: `Payment ${pay.status}`,
      sourceModule: "Payments",
      actor: null,
      patientId: pay.patientId,
      coupleId: pay.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/payments",
      recordStatus: pay.status,
    });
  }

  for (const idn of identities) {
    if (idn.linkedAt || idn.updatedAt) {
      items.push({
        id: `abha-${idn.id}`,
        date: (idn.linkedAt ?? idn.updatedAt).toISOString(),
        type: "ABHA identity",
        title: `ABHA ${idn.status.replaceAll("_", " ")}`,
        sourceModule: "Digital Health",
        actor: null,
        patientId: idn.patientId,
        coupleId: null,
        clinic: clinicName,
        relatedTreatmentId: null,
        href: null,
        recordStatus: idn.status,
      });
    }
  }

  for (const cons of consents) {
    items.push({
      id: `dhc-${cons.id}`,
      date: cons.requestedAt.toISOString(),
      type: "Digital health consent",
      title: cons.purpose.slice(0, 120),
      sourceModule: "Digital Health",
      actor: cons.requestedByName,
      patientId: cons.patientId,
      coupleId: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: cons.status,
    });
  }

  for (const ex of exchanges) {
    items.push({
      id: `hre-${ex.id}`,
      date: (ex.sharedAt ?? ex.preparedAt ?? ex.createdAt).toISOString(),
      type: "Health record exchange",
      title: ex.purpose.slice(0, 120),
      sourceModule: "Digital Health",
      actor: null,
      patientId: ex.patientId,
      coupleId: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/digital-health",
      recordStatus: ex.status,
    });
  }

  for (const conv of conversations) {
    items.push({
      id: `wa-${conv.id}`,
      date: conv.updatedAt.toISOString(),
      type: "WhatsApp conversation",
      title: conv.automationPausedAt ? "Conversation (automation paused)" : "WhatsApp thread updated",
      sourceModule: "WhatsApp",
      actor: null,
      patientId: conv.patientId,
      coupleId: conv.coupleId,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: "/whatsapp/inbox",
      recordStatus: conv.status,
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));

  const storageConfigured = documents.some((d) => Boolean(d.storageKey));
  return {
    items: items.slice(0, limit),
    documentStorageNote: storageConfigured
      ? null
      : "Document storage is not configured. Only document metadata from SMRKOMED is listed.",
  };
}
