import {
  prisma,
  buildPatient360,
  type TenantContext,
  writeTenantAuditLog,
} from "@smrkomed/database";

import { AI_LIMITS } from "./config";
import { assertToolAllowed } from "./permissions";
import { buildClinicPriorities } from "./priorities";
import {
  buildFollowUpQueue,
  buildPatientAttention,
  scorePatientAttention,
} from "./attention";
import { clipText } from "./safety";
import type { AiPageContext, AiProposedAction, AiToolName } from "./types";

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function coupleArgs(rawArgs: Record<string, unknown>) {
  const coupleId = optionalString(rawArgs, "coupleId");
  const coupleSlug = optionalString(rawArgs, "coupleSlug");
  return {
    ...(coupleId ? { coupleId } : {}),
    ...(coupleSlug ? { coupleSlug } : {}),
  };
}

function clinicScope(tenant: TenantContext) {
  return {
    clinicId: tenant.clinicId,
    clinic: { organizationId: tenant.organizationId },
  };
}

function coupleLabel(couple: {
  primaryPatient: { firstName: string; lastName: string };
  partnerPatient?: { firstName: string; lastName: string } | null;
}) {
  const primary = `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim();
  if (!couple.partnerPatient) return primary;
  const partner = `${couple.partnerPatient.firstName} ${couple.partnerPatient.lastName}`.trim();
  return `${primary} + ${partner}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysOverdue(dueDate: Date | null) {
  if (!dueDate) return null;
  const days = Math.floor((startOfToday().getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : 0;
}

async function resolveCouple(
  tenant: TenantContext,
  args: { coupleId?: string; coupleSlug?: string },
  page?: AiPageContext,
) {
  const slug = args.coupleSlug || page?.coupleSlug;
  const id = args.coupleId || page?.coupleId;
  const where = id
    ? { id, ...clinicScope(tenant) }
    : slug
      ? { slug, ...clinicScope(tenant) }
      : null;
  if (!where) return null;
  return prisma.couple.findFirst({
    where,
    include: {
      primaryPatient: true,
      partnerPatient: true,
      assignedDoctor: { select: { id: true, name: true, title: true } },
      assignedCoordinator: { select: { id: true, name: true, title: true } },
      treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
      carePlans: {
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}

const coupleRefParams = {
  type: "object",
  properties: {
    coupleSlug: { type: "string" },
    coupleId: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const AI_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "getClinicSummary",
      description: "Get clinic operational summary counts from SmrkoMed (deterministic).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClinicPriorities",
      description: "Get ranked clinic priorities (URGENT/HIGH/MEDIUM/LOW) from deterministic rules.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getCouple",
      description: "Get a couple/patient profile by slug or id within the current clinic.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getCoupleSummary",
      description:
        "Full patient/couple journey summary: treatment, care plan, tasks, appointments, consultations, documents, activity.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientJourney",
      description:
        "Compact patient journey for summaries and consultation prep (stage, tasks, last consult, next steps).",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "searchPatients",
      description: "Search couples/patients in the current clinic by name, phone, email, or slug.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getOverdueTasks",
      description: "List overdue care tasks with days overdue.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getCoupleTasks",
      description: "List care tasks for a couple.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTodaysAppointments",
      description: "List today's appointments for the current clinic.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getUpcomingAppointments",
      description: "List upcoming appointments in the next 7 days.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getActivity",
      description: "Get recent clinic-wide activity/audit entries.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getRecentActivity",
      description: "Get recent activity for a couple when slug/id provided, otherwise clinic-wide.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getConsultationNotes",
      description: "Get saved consultation text summaries (never audio).",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getCarePlanStatus",
      description: "Get care plan stage, completed/pending/overdue tasks for a couple.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFollowUpQueue",
      description:
        "Operational follow-up queue grouped as URGENT, DUE_SOON, INACTIVE, UPCOMING.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getInactivePatients",
      description: "Couples with no recent clinic activity (default 7 days). Operational only.",
      parameters: {
        type: "object",
        properties: { days: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getStaff",
      description: "List active clinic staff (name, role) for assignment questions.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTeamWorkload",
      description:
        "Deterministic staff workload: active patients, today's appointments, overdue tasks, follow-ups due.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPrepareMyDay",
      description:
        "Today's appointment prep checklist with operational warnings from clinic records.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientAttentionScore",
      description:
        "Deterministic operational attention score (LOW/MEDIUM/HIGH/CRITICAL). Never medical risk.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getNavigationHelp",
      description: "Return SmrkoMed navigation routes for a topic.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string" } },
        required: ["topic"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draftPatientMessage",
      description:
        "Create WhatsApp, SMS, call-script, or follow-up draft. Does not send. channel: whatsapp|sms|call|reminder.",
      parameters: {
        type: "object",
        properties: {
          coupleSlug: { type: "string" },
          coupleId: { type: "string" },
          intent: { type: "string" },
          channel: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "proposeCreateTask",
      description:
        "Propose creating a care task. Does NOT create it. Returns a confirmation payload for the UI.",
      parameters: {
        type: "object",
        properties: {
          coupleSlug: { type: "string" },
          coupleId: { type: "string" },
          title: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          dueDate: { type: "string", description: "ISO date YYYY-MM-DD" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTodaysCollections",
      description:
        "Deterministic today's successful payment collections total and count for the current clinic (INR).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getOutstandingPayments",
      description:
        "List outstanding (unpaid/partial) billing invoices for the clinic from the database.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFailedPayments",
      description: "List recent failed payments for the current clinic.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientPaymentHistory",
      description: "Payment and invoice history for a couple/patient (deterministic DB totals).",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getOverdueInvoices",
      description: "List overdue billing invoices (due date passed, not fully paid).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getClinicOutstandingTotal",
      description: "Sum of outstanding invoice balances for the current clinic.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientMedications",
      description:
        "List current prescribed medicines for a patient from pharmacy records only. Does not invent dosages.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          coupleId: { type: "string" },
          coupleSlug: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMedicationSchedule",
      description: "Upcoming/due/missed medication reminder slots from stored pharmacy schedules.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string" },
          status: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPrescriptionSummary",
      description: "Summarize a pharmacy prescription by id (medicines, status, dispensing).",
      parameters: {
        type: "object",
        properties: { prescriptionId: { type: "string" } },
        required: ["prescriptionId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPharmacyInventory",
      description: "Search clinic pharmacy products and available stock. Read-only.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getLowStockMedicines",
      description: "List pharmacy products at or below reorder level.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPendingDispensing",
      description: "List prescriptions pending or partially dispensed.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMedicationFollowUps",
      description:
        "Today's medication follow-ups: due reminders, missed doses, and medicines starting tomorrow.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientDigitalHealthStatus",
      description: "ABHA / digital health identity status for a patient (masked). Read-only.",
      parameters: {
        type: "object",
        properties: { patientId: { type: "string" }, coupleId: { type: "string" }, coupleSlug: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientConsents",
      description: "Digital health information consents for a patient (not WhatsApp messaging consent).",
      parameters: {
        type: "object",
        properties: { patientId: { type: "string" }, coupleId: { type: "string" }, coupleSlug: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientHealthTimeline",
      description: "Operational digital health timeline from SMRKOMED records only.",
      parameters: {
        type: "object",
        properties: { patientId: { type: "string" }, coupleId: { type: "string" }, coupleSlug: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getRecordSharingStatus",
      description: "Health record exchange prepare/share statuses for the clinic or a patient.",
      parameters: {
        type: "object",
        properties: { patientId: { type: "string" }, limit: { type: "number" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatient360",
      description:
        "Full Patient 360 operational view (header, summary cards, attention alerts, meds, digital health). Deterministic; not diagnosis.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientTimeline",
      description: "Unified chronological timeline from existing module records only.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getCurrentMedications",
      description: "Current prescribed/dispensed medications for a couple/patient. AI cannot prescribe.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPendingCareTasks",
      description: "Open care tasks for a couple from Care Loop.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientDocuments",
      description: "Document metadata for a couple. Blob storage may be unconfigured.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientCommunicationSummary",
      description: "WhatsApp conversation status summary (no auto-send).",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientPaymentStatus",
      description: "Payment / outstanding invoice summary for a couple.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPatientInsuranceStatus",
      description: "Insurance policy status summary for a couple.",
      parameters: coupleRefParams,
    },
  },
  {
    type: "function" as const,
    function: {
      name: "preparePatientConsultation",
      description:
        "Prepare Patient briefing from live records (why here, meds, tasks, payment, ABDM). Not medical advice.",
      parameters: coupleRefParams,
    },
  },
];

export async function runAiTool(
  tenant: TenantContext,
  name: AiToolName,
  rawArgs: Record<string, unknown>,
  page?: AiPageContext,
): Promise<unknown> {
  assertToolAllowed(tenant, name);

  switch (name) {
    case "getClinicSummary": {
      const [
        activeCouples,
        activePatients,
        overdueTasks,
        pendingTasks,
        todayAppointments,
        activeCarePlans,
        upcomingSoon,
      ] = await Promise.all([
        prisma.couple.count({ where: { ...clinicScope(tenant), status: "ACTIVE" } }),
        prisma.patient.count({ where: { clinicId: tenant.clinicId, status: "ACTIVE" } }),
        prisma.careTask.count({
          where: {
            ...clinicScope(tenant),
            OR: [
              { status: "OVERDUE" },
              {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                dueDate: { lt: startOfToday() },
              },
            ],
          },
        }),
        prisma.careTask.count({
          where: {
            ...clinicScope(tenant),
            status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE"] },
          },
        }),
        prisma.appointment.count({
          where: {
            ...clinicScope(tenant),
            startsAt: { gte: startOfToday(), lte: endOfToday() },
          },
        }),
        prisma.carePlan.count({
          where: { ...clinicScope(tenant), status: "ACTIVE" },
        }),
        prisma.appointment.count({
          where: {
            ...clinicScope(tenant),
            startsAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 2 * 60 * 60 * 1000),
            },
            status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
          },
        }),
      ]);
      return {
        clinicName: tenant.clinicName,
        activeCouples,
        activePatients,
        pendingTasks,
        overdueTasks,
        appointmentsToday: todayAppointments,
        activeCarePlans,
        appointmentsNext2Hours: upcomingSoon,
      };
    }

    case "getClinicPriorities": {
      const [overdueTasks, todayAppointments, pausedCouples] = await Promise.all([
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            OR: [
              { status: "OVERDUE" },
              {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                dueDate: { lt: startOfToday() },
              },
            ],
          },
          take: 30,
          orderBy: { dueDate: "asc" },
          include: {
            couple: { include: { primaryPatient: true, partnerPatient: true } },
          },
        }),
        prisma.appointment.findMany({
          where: {
            ...clinicScope(tenant),
            startsAt: { gte: startOfToday(), lte: endOfToday() },
          },
          take: 40,
          include: {
            couple: { include: { primaryPatient: true, partnerPatient: true } },
          },
        }),
        prisma.couple.findMany({
          where: { ...clinicScope(tenant), careLoopActive: false, status: "ACTIVE" },
          take: 20,
          include: { primaryPatient: true, partnerPatient: true },
        }),
      ]);

      const priorities = buildClinicPriorities({
        overdueTasks: overdueTasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          coupleSlug: t.couple?.slug ?? null,
          coupleLabel: t.couple ? coupleLabel(t.couple) : null,
        })),
        todayAppointments: todayAppointments.map((a) => ({
          id: a.id,
          type: a.type,
          startsAt: a.startsAt,
          status: a.status,
          coupleSlug: a.couple?.slug ?? null,
          coupleLabel: a.couple ? coupleLabel(a.couple) : null,
        })),
        pausedCouples: pausedCouples.map((c) => ({
          id: c.id,
          slug: c.slug,
          label: coupleLabel(c),
        })),
      });

      return {
        count: priorities.length,
        items: priorities,
        note: "Priorities are calculated from clinic records, not medical urgency.",
      };
    }

    case "getCouple": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const treatment = couple.treatments[0];
      const plan = couple.carePlans[0];
      const currentStep = plan?.steps.find((s) => s.sortOrder === plan.currentStep) ?? plan?.steps[0];
      return {
        id: couple.id,
        slug: couple.slug,
        label: coupleLabel(couple),
        status: couple.status,
        careLoopActive: couple.careLoopActive,
        doctor: couple.assignedDoctor?.name ?? "Unassigned",
        coordinator: couple.assignedCoordinator?.name ?? "Unassigned",
        treatment: treatment
          ? {
              kind: treatment.kind,
              label: treatment.label,
              status: treatment.status,
              stage: treatment.stageName,
            }
          : null,
        carePlan: plan
          ? {
              name: plan.name,
              type: plan.type,
              status: plan.status,
              currentStage: currentStep?.name ?? null,
            }
          : null,
        primary: {
          name: `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`,
          phone: couple.primaryPatient.phone,
        },
        partner: couple.partnerPatient
          ? {
              name: `${couple.partnerPatient.firstName} ${couple.partnerPatient.lastName}`,
              phone: couple.partnerPatient.phone,
            }
          : null,
      };
    }

    case "getCoupleSummary": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const [tasks, appointments, notes, documents, activity] = await Promise.all([
        prisma.careTask.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        prisma.appointment.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { startsAt: "desc" },
          take: 10,
        }),
        prisma.consultationNote.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { consultationDate: "desc" },
          take: 5,
          include: { createdBy: { select: { name: true } } },
        }),
        prisma.document.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { category: { select: { name: true } } },
        }),
        prisma.auditLog.findMany({
          where: {
            clinicId: tenant.clinicId,
            organizationId: tenant.organizationId,
            OR: [
              { entityType: "Couple", entityId: couple.id },
              { entityType: "ConsultationNote" },
              { entityType: "CareTask" },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        }),
      ]);
      const treatment = couple.treatments[0];
      const plan = couple.carePlans[0];
      const currentStep = plan?.steps.find((s) => s.sortOrder === plan.currentStep) ?? plan?.steps[0];
      const pending = tasks.filter((t) =>
        ["WAITING", "IN_PROGRESS", "OVERDUE", "ESCALATED"].includes(t.status),
      );
      const overdue = tasks.filter(
        (t) =>
          t.status === "OVERDUE" ||
          (["WAITING", "IN_PROGRESS"].includes(t.status) && t.dueDate && t.dueDate < startOfToday()),
      );
      const upcoming = appointments
        .filter((a) => a.startsAt >= new Date() && !["CANCELLED", "NO_SHOW"].includes(a.status))
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

      return {
        couple: coupleLabel(couple),
        slug: couple.slug,
        status: couple.status,
        treatment: treatment
          ? {
              kind: treatment.kind,
              label: treatment.label,
              status: treatment.status,
              stage: treatment.stageName,
            }
          : null,
        doctor: couple.assignedDoctor?.name ?? "Unassigned",
        coordinator: couple.assignedCoordinator?.name ?? "Unassigned",
        carePlan: plan
          ? {
              name: plan.name,
              currentStage: currentStep?.name ?? null,
              status: plan.status,
            }
          : null,
        pendingTasks: pending.map((t) => ({
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
        })),
        overdueTasks: overdue.map((t) => ({
          title: t.title,
          daysOverdue: daysOverdue(t.dueDate),
        })),
        nextAppointment: upcoming
          ? {
              type: upcoming.type,
              startsAt: upcoming.startsAt,
              doctor: upcoming.doctorName,
              status: upcoming.status,
            }
          : null,
        consultations: notes.map((n) => ({
          date: n.consultationDate,
          author: n.createdBy?.name ?? "Staff",
          reasonForVisit: n.reasonForVisit,
          nextSteps: n.nextSteps,
          summaryPreview: n.summary.slice(0, 400),
        })),
        documents: documents.map((d) => ({
          name: d.name,
          category: d.category?.name ?? null,
          status: d.status,
          uploaded: d.createdAt,
        })),
        recentActivity: activity.map((a) => ({
          action: a.action,
          entityType: a.entityType,
          createdAt: a.createdAt,
        })),
      };
    }

    case "getPatientJourney": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I couldn't find that information in SmrkoMed." };
      const [tasks, notes, upcomingAppt] = await Promise.all([
        prisma.careTask.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { updatedAt: "desc" },
          take: 15,
        }),
        prisma.consultationNote.findMany({
          where: { coupleId: couple.id, clinicId: tenant.clinicId },
          orderBy: { consultationDate: "desc" },
          take: 3,
          include: { createdBy: { select: { name: true } } },
        }),
        prisma.appointment.findFirst({
          where: {
            coupleId: couple.id,
            clinicId: tenant.clinicId,
            startsAt: { gte: new Date() },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          orderBy: { startsAt: "asc" },
        }),
      ]);
      const treatment = couple.treatments[0];
      const plan = couple.carePlans[0];
      const currentStep = plan?.steps.find((s) => s.sortOrder === plan.currentStep) ?? plan?.steps[0];
      const openTasks = tasks.filter((t) =>
        ["WAITING", "IN_PROGRESS", "OVERDUE", "ESCALATED"].includes(t.status),
      );
      const completed = tasks.filter((t) => t.status === "COMPLETED");
      const lastNote = notes[0];
      return {
        couple: coupleLabel(couple),
        slug: couple.slug,
        treatment: treatment?.kind ?? null,
        stage: treatment?.stageName ?? currentStep?.name ?? null,
        doctor: couple.assignedDoctor?.name ?? "Unassigned",
        coordinator: couple.assignedCoordinator?.name ?? "Unassigned",
        openTasks: openTasks.map((t) => t.title).slice(0, 8),
        completedTaskCount: completed.length,
        lastConsultation: lastNote
          ? {
              date: lastNote.consultationDate,
              reasonForVisit: lastNote.reasonForVisit,
              nextSteps: lastNote.nextSteps,
              summaryPreview: lastNote.summary.slice(0, 500),
            }
          : null,
        nextAppointment: upcomingAppt
          ? {
              type: upcomingAppt.type,
              startsAt: upcomingAppt.startsAt,
              doctor: upcomingAppt.doctorName,
            }
          : null,
        nextExpectedAction:
          openTasks[0]?.title ??
          lastNote?.nextSteps ??
          (couple.assignedCoordinator?.name ? "Review open items with coordinator" : null),
        note: "Operational summary from SmrkoMed records only — not a clinical assessment.",
      };
    }

    case "searchPatients": {
      const query = (optionalString(rawArgs, "query") ?? "").trim().slice(0, 80);
      if (!query) return { items: [], note: "No patients yet." };
      const items = await prisma.couple.findMany({
        where: {
          ...clinicScope(tenant),
          OR: [
            { slug: { contains: query, mode: "insensitive" } },
            { primaryPatient: { firstName: { contains: query, mode: "insensitive" } } },
            { primaryPatient: { lastName: { contains: query, mode: "insensitive" } } },
            { primaryPatient: { phone: { contains: query } } },
            { primaryPatient: { email: { contains: query, mode: "insensitive" } } },
            { partnerPatient: { firstName: { contains: query, mode: "insensitive" } } },
            { partnerPatient: { lastName: { contains: query, mode: "insensitive" } } },
            { partnerPatient: { phone: { contains: query } } },
          ],
        },
        take: 12,
        include: {
          primaryPatient: true,
          partnerPatient: true,
          treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
        },
      });
      return {
        items: items.map((c) => ({
          id: c.id,
          slug: c.slug,
          label: coupleLabel(c),
          status: c.status,
          treatment: c.treatments[0]?.kind ?? null,
          href: `/patients/${c.slug}`,
        })),
        note: items.length === 0 ? "No matching patients in this clinic." : undefined,
      };
    }

    case "getOverdueTasks": {
      const tasks = await prisma.careTask.findMany({
        where: {
          ...clinicScope(tenant),
          OR: [
            { status: "OVERDUE" },
            {
              status: { in: ["WAITING", "IN_PROGRESS"] },
              dueDate: { lt: startOfToday() },
            },
          ],
        },
        take: 25,
        orderBy: { dueDate: "asc" },
        include: {
          couple: { include: { primaryPatient: true, partnerPatient: true } },
          assignments: { include: { user: { select: { name: true } } }, take: 2 },
        },
      });
      return {
        count: tasks.length,
        items: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          daysOverdue: daysOverdue(t.dueDate),
          couple: t.couple ? coupleLabel(t.couple) : null,
          coupleSlug: t.couple?.slug ?? null,
          assignees: t.assignments.map((a) => a.user.name),
        })),
        note: tasks.length === 0 ? "No overdue tasks." : undefined,
      };
    }

    case "getCoupleTasks": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const tasks = await prisma.careTask.findMany({
        where: { coupleId: couple.id, clinicId: tenant.clinicId },
        orderBy: { updatedAt: "desc" },
        take: 25,
      });
      return {
        couple: coupleLabel(couple),
        items: tasks.map((t) => ({
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          category: t.category,
          daysOverdue: daysOverdue(t.dueDate),
        })),
      };
    }

    case "getTodaysAppointments": {
      const rows = await prisma.appointment.findMany({
        where: {
          ...clinicScope(tenant),
          startsAt: { gte: startOfToday(), lte: endOfToday() },
        },
        orderBy: { startsAt: "asc" },
        take: 40,
        include: {
          couple: { include: { primaryPatient: true, partnerPatient: true } },
        },
      });
      return {
        count: rows.length,
        items: rows.map((a) => ({
          type: a.type,
          startsAt: a.startsAt,
          status: a.status,
          doctor: a.doctorName,
          room: a.room,
          couple: a.couple ? coupleLabel(a.couple) : null,
          coupleSlug: a.couple?.slug ?? null,
        })),
        note: rows.length === 0 ? "No appointments scheduled today." : undefined,
      };
    }

    case "getUpcomingAppointments": {
      const rows = await prisma.appointment.findMany({
        where: {
          ...clinicScope(tenant),
          startsAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { startsAt: "asc" },
        take: 30,
        include: {
          couple: { include: { primaryPatient: true, partnerPatient: true } },
        },
      });
      return {
        count: rows.length,
        items: rows.map((a) => ({
          type: a.type,
          startsAt: a.startsAt,
          status: a.status,
          doctor: a.doctorName,
          couple: a.couple ? coupleLabel(a.couple) : null,
          coupleSlug: a.couple?.slug ?? null,
        })),
      };
    }

    case "getActivity": {
      const logs = await prisma.auditLog.findMany({
        where: { clinicId: tenant.clinicId, organizationId: tenant.organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return {
        items: logs.map((l) => ({
          action: l.action,
          entityType: l.entityType,
          createdAt: l.createdAt,
        })),
      };
    }

    case "getRecentActivity": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (couple) {
        const [notes, tasks, appointments] = await Promise.all([
          prisma.consultationNote.findMany({
            where: { coupleId: couple.id, clinicId: tenant.clinicId },
            orderBy: { consultationDate: "desc" },
            take: 5,
          }),
          prisma.careTask.findMany({
            where: { coupleId: couple.id, clinicId: tenant.clinicId },
            orderBy: { updatedAt: "desc" },
            take: 8,
          }),
          prisma.appointment.findMany({
            where: { coupleId: couple.id, clinicId: tenant.clinicId },
            orderBy: { startsAt: "desc" },
            take: 5,
          }),
        ]);
        return {
          couple: coupleLabel(couple),
          timeline: [
            ...notes.map((n) => ({
              kind: "consultation",
              at: n.consultationDate,
              label: "Consultation summary",
            })),
            ...tasks.map((t) => ({
              kind: "task",
              at: t.updatedAt,
              label: `${t.title} · ${t.status}`,
            })),
            ...appointments.map((a) => ({
              kind: "appointment",
              at: a.startsAt,
              label: `${a.type} · ${a.status}`,
            })),
          ]
            .sort((a, b) => b.at.getTime() - a.at.getTime())
            .slice(0, 20),
        };
      }
      return runAiTool(tenant, "getActivity", {}, page);
    }

    case "getConsultationNotes": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const notes = await prisma.consultationNote.findMany({
        where: { clinicId: tenant.clinicId, coupleId: couple.id },
        orderBy: { consultationDate: "desc" },
        take: 5,
        include: { createdBy: { select: { name: true } } },
      });
      return {
        couple: coupleLabel(couple),
        items: notes.map((n) => ({
          id: n.id,
          consultationDate: n.consultationDate,
          author: n.createdBy?.name ?? "Staff",
          reasonForVisit: n.reasonForVisit,
          nextSteps: n.nextSteps,
          summary: n.summary.slice(0, 4000),
        })),
        note: notes.length === 0 ? "No consultation summaries saved yet." : undefined,
      };
    }

    case "getCarePlanStatus": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const plan = couple.carePlans[0];
      if (!plan) {
        return {
          couple: coupleLabel(couple),
          carePlan: null,
          note: "No active care plan found for this couple.",
        };
      }
      const tasks = await prisma.careTask.findMany({
        where: { coupleId: couple.id, clinicId: tenant.clinicId, carePlanId: plan.id },
        take: 40,
      });
      const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStep) ?? plan.steps[0];
      return {
        couple: coupleLabel(couple),
        carePlan: {
          name: plan.name,
          type: plan.type,
          status: plan.status,
          currentStage: currentStep?.name ?? null,
          steps: plan.steps.map((s) => ({ name: s.name, status: s.status, order: s.sortOrder })),
        },
        completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
        pendingTasks: tasks.filter((t) =>
          ["WAITING", "IN_PROGRESS"].includes(t.status),
        ).length,
        overdueTasks: tasks.filter(
          (t) =>
            t.status === "OVERDUE" ||
            (["WAITING", "IN_PROGRESS"].includes(t.status) &&
              t.dueDate &&
              t.dueDate < startOfToday()),
        ).length,
        upcomingSteps: plan.steps
          .filter((s) => s.sortOrder >= (plan.currentStep ?? 0))
          .slice(0, 5)
          .map((s) => s.name),
      };
    }

    case "getFollowUpQueue": {
      const endSoon = new Date(startOfToday());
      endSoon.setDate(endSoon.getDate() + 7);
      const [overdueTasks, todayTasks, upcomingTasks, couples] = await Promise.all([
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            OR: [
              { status: "OVERDUE" },
              {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                dueDate: { lt: startOfToday() },
              },
            ],
          },
          take: 20,
          orderBy: { dueDate: "asc" },
          include: {
            couple: {
              include: {
                primaryPatient: true,
                partnerPatient: true,
                treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
            assignments: { include: { user: { select: { name: true } } }, take: 1 },
          },
        }),
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            status: { in: ["WAITING", "IN_PROGRESS"] },
            dueDate: { gte: startOfToday(), lte: endOfToday() },
          },
          take: 20,
          include: {
            couple: {
              include: {
                primaryPatient: true,
                partnerPatient: true,
                treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
            assignments: { include: { user: { select: { name: true } } }, take: 1 },
          },
        }),
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            status: { in: ["WAITING", "IN_PROGRESS"] },
            dueDate: { gt: endOfToday(), lte: endSoon },
          },
          take: 15,
          include: {
            couple: {
              include: {
                primaryPatient: true,
                partnerPatient: true,
                treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
            assignments: { include: { user: { select: { name: true } } }, take: 1 },
          },
        }),
        prisma.couple.findMany({
          where: { ...clinicScope(tenant), status: "ACTIVE" },
          take: 80,
          include: {
            primaryPatient: true,
            partnerPatient: true,
            assignedDoctor: { select: { name: true } },
            assignedCoordinator: { select: { name: true } },
            treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
            careTasks: {
              where: {
                OR: [
                  { status: "OVERDUE" },
                  {
                    status: { in: ["WAITING", "IN_PROGRESS"] },
                    dueDate: { lt: startOfToday() },
                  },
                ],
              },
              take: 5,
            },
            appointments: {
              where: {
                OR: [
                  { status: "NO_SHOW" },
                  {
                    startsAt: { gte: new Date() },
                    status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
                  },
                ],
              },
              take: 5,
            },
            documents: { where: { status: "AWAITING_UPLOAD" }, take: 3 },
            consultationNotes: { orderBy: { consultationDate: "desc" }, take: 1 },
          },
        }),
      ]);

      const mapTask = (
        t: (typeof overdueTasks)[number],
      ) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        coupleId: t.coupleId,
        coupleSlug: t.couple?.slug ?? null,
        coupleLabel: t.couple ? coupleLabel(t.couple) : null,
        treatment: t.couple?.treatments[0]?.kind ?? null,
        assignedStaff: t.assignments[0]?.user.name ?? null,
      });

      const attention = buildPatientAttention({
        couples: couples.map((c) => ({
          id: c.id,
          slug: c.slug,
          label: coupleLabel(c),
          treatment: c.treatments[0]?.kind ?? null,
          stage: c.treatments[0]?.stageName ?? null,
          careLoopActive: c.careLoopActive,
          doctorName: c.assignedDoctor?.name ?? null,
          coordinatorName: c.assignedCoordinator?.name ?? null,
          updatedAt: c.updatedAt,
          overdueTaskCount: c.careTasks.length,
          pendingTaskCount: c.careTasks.length,
          missedAppointmentCount: c.appointments.filter((a) => a.status === "NO_SHOW").length,
          upcomingAppointmentCount: c.appointments.filter((a) => a.status !== "NO_SHOW").length,
          pendingDocumentCount: c.documents.length,
          lastConsultationAt: c.consultationNotes[0]?.consultationDate ?? null,
        })),
      });

      const queue = buildFollowUpQueue({
        overdueTasks: overdueTasks.map(mapTask),
        todayTasks: todayTasks.map(mapTask),
        upcomingTasks: upcomingTasks.map(mapTask),
        noResponse: attention.filter((a) => a.category === "Needs Attention"),
        inactive: attention.filter((a) => a.category === "No Recent Activity"),
      });

      return {
        count: queue.length,
        groups: {
          URGENT: queue.filter((q) => q.bucket === "URGENT").length,
          DUE_SOON: queue.filter((q) => q.bucket === "DUE_SOON").length,
          INACTIVE: queue.filter((q) => q.bucket === "INACTIVE").length,
          UPCOMING: queue.filter((q) => q.bucket === "UPCOMING").length,
        },
        items: queue,
        note: queue.length === 0 ? "No follow-ups queued from clinic records." : undefined,
      };
    }

    case "getInactivePatients": {
      const daysRaw = rawArgs["days"];
      const days =
        typeof daysRaw === "number" && Number.isFinite(daysRaw)
          ? Math.min(Math.max(Math.floor(daysRaw), 3), 90)
          : 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const couples = await prisma.couple.findMany({
        where: {
          ...clinicScope(tenant),
          status: "ACTIVE",
          updatedAt: { lt: cutoff },
        },
        take: 25,
        orderBy: { updatedAt: "asc" },
        include: {
          primaryPatient: true,
          partnerPatient: true,
          treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
          assignedDoctor: { select: { name: true } },
          assignedCoordinator: { select: { name: true } },
        },
      });
      return {
        inactiveDays: days,
        count: couples.length,
        items: couples.map((c) => ({
          id: c.id,
          slug: c.slug,
          label: coupleLabel(c),
          treatment: c.treatments[0]?.kind ?? null,
          doctor: c.assignedDoctor?.name ?? "Unassigned",
          coordinator: c.assignedCoordinator?.name ?? "Unassigned",
          lastUpdatedAt: c.updatedAt,
          href: `/patients/${c.slug}`,
        })),
        note:
          couples.length === 0
            ? `No patients inactive for ${days}+ days in clinic records.`
            : "Operational inactivity based on couple record update time — not medical risk.",
      };
    }

    case "getStaff": {
      const query = (optionalString(rawArgs, "query") ?? "").trim().toLowerCase();
      const memberships = await prisma.clinicMembership.findMany({
        where: {
          clinicId: tenant.clinicId,
          status: "ACTIVE",
          clinic: { organizationId: tenant.organizationId },
        },
        take: 40,
        include: {
          user: { select: { id: true, name: true, title: true, email: true } },
          role: { select: { key: true, name: true } },
        },
      });
      const items = memberships
        .map((m) => ({
          id: m.user.id,
          name: m.user.name,
          title: m.user.title,
          role: m.role.name,
          roleKey: m.role.key,
        }))
        .filter(
          (s) =>
            !query ||
            s.name.toLowerCase().includes(query) ||
            s.role.toLowerCase().includes(query) ||
            (s.title ?? "").toLowerCase().includes(query),
        );
      return {
        count: items.length,
        items,
        note: items.length === 0 ? "No staff found for this clinic." : undefined,
      };
    }

    case "getTeamWorkload": {
      const memberships = await prisma.clinicMembership.findMany({
        where: {
          clinicId: tenant.clinicId,
          status: "ACTIVE",
          clinic: { organizationId: tenant.organizationId },
        },
        take: 40,
        include: {
          user: { select: { id: true, name: true, title: true } },
          role: { select: { key: true, name: true } },
        },
      });
      const couples = await prisma.couple.findMany({
        where: { ...clinicScope(tenant), status: "ACTIVE" },
        take: 200,
        include: {
          assignedDoctor: { select: { id: true, name: true } },
          assignedCoordinator: { select: { id: true, name: true } },
        },
      });
      const [todayAppts, openTasks, overdueTasks] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            ...clinicScope(tenant),
            startsAt: { gte: startOfToday(), lte: endOfToday() },
            status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
          },
          take: 100,
        }),
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE", "ESCALATED"] },
          },
          take: 200,
        }),
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            OR: [
              { status: "OVERDUE" },
              {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                dueDate: { lt: startOfToday() },
              },
            ],
          },
          take: 100,
        }),
      ]);
      const items = memberships.map((m) => {
        const isDoctor = /DOCTOR|doctor/i.test(m.role.key);
        const assignedCouples = couples.filter((c) =>
          isDoctor
            ? c.assignedDoctorId === m.user.id
            : c.assignedCoordinatorId === m.user.id,
        );
        const activePatients = assignedCouples.length;
        const appointmentsToday = todayAppts.filter((a) => a.doctorName === m.user.name).length;
        const coupleIds = new Set(assignedCouples.map((c) => c.id));
        const open = openTasks.filter((t) => t.coupleId && coupleIds.has(t.coupleId)).length;
        const overdue = overdueTasks.filter((t) => t.coupleId && coupleIds.has(t.coupleId)).length;
        const followUpsDue = openTasks.filter(
          (t) =>
            t.coupleId &&
            coupleIds.has(t.coupleId) &&
            t.dueDate &&
            t.dueDate >= startOfToday() &&
            t.dueDate <= endOfToday(),
        ).length;
        return {
          id: m.user.id,
          name: m.user.name,
          role: m.role.name,
          activePatients,
          openTasks: open,
          appointmentsToday,
          overdueTasks: overdue,
          followUpsDue,
        };
      });
      return {
        count: items.length,
        items: items
          .filter((i) => i.activePatients || i.appointmentsToday || i.overdueTasks || i.openTasks)
          .sort(
            (a, b) =>
              b.overdueTasks + b.followUpsDue + b.appointmentsToday -
              (a.overdueTasks + a.followUpsDue + a.appointmentsToday),
          )
          .slice(0, 12),
        note: "Workload is calculated from clinic records, not estimated by AI.",
      };
    }

    case "getPrepareMyDay": {
      const [appts, overdueTasks, attentionCouples] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            ...clinicScope(tenant),
            startsAt: { gte: startOfToday(), lte: endOfToday() },
            status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
          },
          orderBy: { startsAt: "asc" },
          take: 20,
          include: {
            couple: {
              include: {
                primaryPatient: true,
                partnerPatient: true,
                treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
                careTasks: {
                  where: {
                    OR: [
                      { status: "OVERDUE" },
                      {
                        status: { in: ["WAITING", "IN_PROGRESS"] },
                        dueDate: { lt: startOfToday() },
                      },
                    ],
                  },
                  take: 5,
                },
                consultationNotes: { orderBy: { consultationDate: "desc" }, take: 1 },
              },
            },
          },
        }),
        prisma.careTask.findMany({
          where: {
            ...clinicScope(tenant),
            OR: [
              { status: "OVERDUE" },
              {
                status: { in: ["WAITING", "IN_PROGRESS"] },
                dueDate: { lt: startOfToday() },
              },
            ],
          },
          take: 8,
          include: {
            couple: {
              include: {
                primaryPatient: true,
                partnerPatient: true,
                treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
              },
            },
          },
        }),
        prisma.couple.findMany({
          where: {
            ...clinicScope(tenant),
            status: "ACTIVE",
            OR: [{ careLoopActive: false }],
          },
          take: 5,
          include: {
            primaryPatient: true,
            partnerPatient: true,
            treatments: { orderBy: { updatedAt: "desc" }, take: 1 },
          },
        }),
      ]);

      const items: Array<{
        time: string;
        kind: string;
        type: string;
        couple: string | null;
        coupleSlug: string | null;
        treatment: string | null;
        checklist: string[];
        href: string;
      }> = [];

      for (const a of appts) {
        const couple = a.couple;
        const overdue = couple?.careTasks.length ?? 0;
        items.push({
          time: a.startsAt.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          }),
          kind: "appointment",
          type: a.type,
          couple: couple ? coupleLabel(couple) : null,
          coupleSlug: couple?.slug ?? null,
          treatment: couple?.treatments[0]?.kind ?? null,
          checklist: [
            couple?.consultationNotes[0]
              ? "Review previous consultation summary"
              : "No previous consultation summary on record",
            couple?.treatments[0]?.stageName
              ? `Current stage: ${couple.treatments[0].stageName}`
              : "Review current treatment stage",
            overdue > 0
              ? `${overdue} overdue care task(s) — follow up`
              : "No overdue care tasks on record",
            "Review recent communication / activity",
            "Confirm next planned action",
          ],
          href: couple ? `/patients/${couple.slug}` : "/appointments",
        });
      }

      for (const task of overdueTasks) {
        const couple = task.couple;
        if (!couple) continue;
        items.push({
          time: "Overdue",
          kind: "overdue_task",
          type: task.title,
          couple: coupleLabel(couple),
          coupleSlug: couple.slug,
          treatment: couple.treatments[0]?.kind ?? null,
          checklist: [
            `Task: ${task.title}`,
            task.dueDate
              ? `Due: ${task.dueDate.toLocaleDateString("en-IN")}`
              : "Due date not recorded",
            couple.treatments[0]?.stageName
              ? `Stage: ${couple.treatments[0].stageName}`
              : "Stage not available in SmrkoMed",
          ],
          href: `/patients/${couple.slug}`,
        });
      }

      for (const couple of attentionCouples) {
        if (items.some((i) => i.coupleSlug === couple.slug && i.kind === "follow_up")) continue;
        items.push({
          time: "Follow-up",
          kind: "follow_up",
          type: "Follow-up required",
          couple: coupleLabel(couple),
          coupleSlug: couple.slug,
          treatment: couple.treatments[0]?.kind ?? null,
          checklist: [
            "Reason: Care Loop inactive / no recent activity signal",
            "Suggested action: Coordinator follow-up",
          ],
          href: `/patients/${couple.slug}`,
        });
      }

      return {
        count: items.length,
        items: items.slice(0, 16),
        note:
          items.length === 0
            ? "No appointments, overdue tasks, or follow-ups queued for today."
            : "Prep checklist is operational and based on SmrkoMed records only.",
      };
    }

    case "getPatientAttentionScore": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) {
        return {
          found: false,
          note: "I couldn't find that patient in SmrkoMed.",
        };
      }
      const [overdueTaskCount, pendingTaskCount, missedAppointmentCount, upcomingAppointmentCount, exceptionCount] =
        await Promise.all([
          prisma.careTask.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              OR: [
                { status: "OVERDUE" },
                {
                  status: { in: ["WAITING", "IN_PROGRESS"] },
                  dueDate: { lt: startOfToday() },
                },
              ],
            },
          }),
          prisma.careTask.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE", "ESCALATED"] },
            },
          }),
          prisma.appointment.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              status: "NO_SHOW",
            },
          }),
          prisma.appointment.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              startsAt: { gte: new Date() },
              status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
            },
          }),
          prisma.escalation.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              type: "NO_RESPONSE",
              status: { in: ["OPEN", "IN_PROGRESS"] },
            },
          }),
        ]);

      const inactiveDays = couple.updatedAt
        ? Math.floor((Date.now() - couple.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const score = scorePatientAttention({
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: coupleLabel(couple),
        ...(couple.treatments?.[0]?.kind ? { treatment: couple.treatments[0].kind } : {}),
        careLoopPaused: couple.careLoopActive === false,
        statusNeedsAttention: false,
        overdueTaskCount,
        pendingTaskCount,
        missedAppointmentCount,
        upcomingAppointmentCount,
        unassignedDoctor: !couple.assignedDoctorId,
        unassignedCoordinator: !couple.assignedCoordinatorId,
        noResponseException: exceptionCount > 0,
        ...(inactiveDays >= 7 ? { inactiveDays } : {}),
      });

      return {
        ...score,
        note: "Operational engagement score only — not medical or clinical risk.",
      };
    }

    case "getNavigationHelp": {
      const topic = (optionalString(rawArgs, "topic") ?? "").toLowerCase();
      const routes = [
        { label: "Dashboard / Command Center", href: "/", keywords: ["dashboard", "home", "summary", "priorit", "attention", "command"] },
        { label: "Patients", href: "/patients", keywords: ["patient", "couple", "add couple", "inactive"] },
        { label: "Tasks / Follow-up Queue", href: "/tasks", keywords: ["task", "overdue", "follow"] },
        { label: "Appointments", href: "/appointments", keywords: ["appointment", "schedule", "today"] },
        { label: "Documents", href: "/documents", keywords: ["document", "file", "report"] },
        { label: "Care Plans", href: "/care-plans", keywords: ["care plan", "journey"] },
        { label: "Care Loop", href: "/care-loop", keywords: ["care loop", "exception", "unanswered", "no response"] },
        { label: "CRM", href: "/crm", keywords: ["crm", "lead", "enquiry"] },
        { label: "Settings", href: "/settings", keywords: ["setting", "staff", "coordinator", "workload"] },
      ];
      const matches = routes.filter((r) =>
        r.keywords.some((k) => topic.includes(k) || k.includes(topic)),
      );
      return { routes: matches.length ? matches : routes.slice(0, 6) };
    }

    case "draftPatientMessage": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      const intent = (optionalString(rawArgs, "intent") ?? "appointment reminder").slice(0, 200);
      const channel = (optionalString(rawArgs, "channel") ?? "whatsapp").toLowerCase();
      if (!couple) {
        return {
          draft: `Hi, this is a message from ${tenant.clinicName}. ${intent}. Please contact the clinic if you have questions.`,
          sent: false,
          channel,
          note: "Draft only — not sent. Couple context unavailable.",
        };
      }
      const nextAppt = await prisma.appointment.findFirst({
        where: {
          clinicId: tenant.clinicId,
          coupleId: couple.id,
          startsAt: { gte: new Date() },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        orderBy: { startsAt: "asc" },
      });
      const when = nextAppt
        ? nextAppt.startsAt.toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : null;
      const patientFirst = couple.primaryPatient.firstName;
      const doctor = nextAppt?.doctorName ?? couple.assignedDoctor?.name ?? "your doctor";
      const intentLower = intent.toLowerCase();
      let draft: string;
      if (/call|script|phone/.test(channel) || /call script/.test(intentLower)) {
        draft = [
          `Call script — ${tenant.clinicName}`,
          `Patient: ${patientFirst}`,
          `Opening: Hi ${patientFirst}, this is calling from ${tenant.clinicName}.`,
          `Purpose: ${intent}`,
          when ? `Reference: Next recorded appointment is ${when} with ${doctor}.` : "Reference: Confirm any open follow-ups from clinic records.",
          "Close: Thank you — please let us know if you need anything from the care team.",
          "",
          "Draft only — not dialed or sent.",
        ].join("\n");
      } else if (when && /appointment|reminder|schedule/.test(intentLower)) {
        draft = `Hi ${patientFirst}, this is a reminder from ${tenant.clinicName} regarding your appointment on ${when} with ${doctor}. Please reply if you need to reschedule.`;
      } else if (/follow|check in|check-in/.test(intentLower)) {
        draft = `Hi ${patientFirst}, this is ${tenant.clinicName}. We wanted to check in after your recent visit and see if you need any support from the care team. Please reply if you have questions.`;
      } else if (/task|scan|test|prep/.test(intentLower) && when) {
        draft = `Hi ${patientFirst}, this is ${tenant.clinicName}. A reminder about your upcoming care item ahead of your appointment on ${when}. Please contact us if you need help.`;
      } else if (when) {
        draft = `Hi ${patientFirst}, this is ${tenant.clinicName}. ${intent}. Your next recorded appointment is on ${when}. Please reply if you have questions.`;
      } else {
        draft = `Hi ${patientFirst}, this is ${tenant.clinicName}. ${intent}. Please reply if you have any questions.`;
      }
      return {
        draft,
        sent: false,
        intent,
        channel,
        couple: coupleLabel(couple),
        label: "AI Draft",
      };
    }

    case "proposeCreateTask": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      const title = (optionalString(rawArgs, "title") ?? "").trim().slice(0, 200);
      if (!title) return { error: "Task title is required." };
      if (!couple) {
        return {
          error:
            "Select a patient/couple first, or open a patient profile so Smrko AI knows who the task is for.",
        };
      }
      const dueDate = optionalString(rawArgs, "dueDate");
      const category = optionalString(rawArgs, "category") ?? "Follow-up";
      const description = optionalString(rawArgs, "description");
      const dueLabel = dueDate
        ? new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        : "Not set";
      const proposedAction: AiProposedAction = {
        type: "createTask",
        preview: {
          title,
          coupleLabel: coupleLabel(couple),
          dueLabel,
          assignedHint: couple.assignedCoordinator?.name ?? "Coordinator",
        },
        payload: {
          coupleId: couple.id,
          title,
          category,
          ...(description ? { description } : {}),
          ...(dueDate ? { dueDate } : {}),
        },
      };
      return {
        proposedAction,
        created: false,
        note: "Task is proposed only. Wait for staff confirmation in the UI.",
      };
    }

    case "getTodaysCollections": {
      const start = startOfToday();
      const end = endOfToday();
      const [agg, count] = await Promise.all([
        prisma.billingPayment.aggregate({
          where: {
            ...clinicScope(tenant),
            status: "SUCCESS",
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        prisma.billingPayment.count({
          where: {
            ...clinicScope(tenant),
            status: "SUCCESS",
            paidAt: { gte: start, lte: end },
          },
        }),
      ]);
      return {
        date: start.toISOString().slice(0, 10),
        successfulPayments: count,
        totalCollectedInr: Number(agg._sum.amount ?? 0),
        currency: "INR",
        source: "database",
      };
    }

    case "getOutstandingPayments": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 20), 50);
      const invoices = await prisma.billingInvoice.findMany({
        where: {
          ...clinicScope(tenant),
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          couple: {
            select: {
              slug: true,
              primaryPatient: { select: { firstName: true, lastName: true } },
              partnerPatient: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: limit,
      });
      return {
        items: invoices.map((inv) => {
          const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
          return {
            invoiceNumber: inv.invoiceNumber,
            title: inv.title,
            status: inv.status,
            totalAmount: Number(inv.totalAmount),
            paidAmount: Number(inv.paidAmount),
            outstanding,
            dueDate: inv.dueDate?.toISOString() ?? null,
            patient: inv.patient
              ? `${inv.patient.firstName} ${inv.patient.lastName}`.trim()
              : inv.couple
                ? coupleLabel(inv.couple)
                : null,
          };
        }),
        source: "database",
      };
    }

    case "getFailedPayments": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 20), 50);
      const rows = await prisma.billingPayment.findMany({
        where: { ...clinicScope(tenant), status: "FAILED" },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return {
        items: rows.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          provider: p.provider,
          method: p.method,
          failureReason: p.failureReason,
          invoiceNumber: p.invoice?.invoiceNumber ?? null,
          patient: p.patient ? `${p.patient.firstName} ${p.patient.lastName}`.trim() : null,
          updatedAt: p.updatedAt.toISOString(),
        })),
        source: "database",
      };
    }

    case "getPatientPaymentHistory": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "Couple not found in this clinic." };
      const [invoices, payments] = await Promise.all([
        prisma.billingInvoice.findMany({
          where: { clinicId: tenant.clinicId, coupleId: couple.id },
          orderBy: { issuedAt: "desc" },
          take: 30,
        }),
        prisma.billingPayment.findMany({
          where: { clinicId: tenant.clinicId, coupleId: couple.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ]);
      const totalBilled = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
      const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
      return {
        couple: coupleLabel(couple),
        totalBilled,
        totalPaid,
        outstanding: Math.max(0, totalBilled - totalPaid),
        invoices: invoices.map((i) => ({
          invoiceNumber: i.invoiceNumber,
          status: i.status,
          totalAmount: Number(i.totalAmount),
          paidAmount: Number(i.paidAmount),
          outstanding: Number(i.totalAmount) - Number(i.paidAmount),
        })),
        payments: payments.map((p) => ({
          amount: Number(p.amount),
          status: p.status,
          provider: p.provider,
          method: p.method,
          paidAt: p.paidAt?.toISOString() ?? null,
        })),
        source: "database",
      };
    }

    case "getOverdueInvoices": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 20), 50);
      const now = new Date();
      const invoices = await prisma.billingInvoice.findMany({
        where: {
          ...clinicScope(tenant),
          dueDate: { lt: now },
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          couple: {
            select: {
              slug: true,
              primaryPatient: { select: { firstName: true, lastName: true } },
              partnerPatient: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: limit,
      });
      return {
        items: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          outstanding: Number(inv.totalAmount) - Number(inv.paidAmount),
          dueDate: inv.dueDate?.toISOString() ?? null,
          daysOverdue: daysOverdue(inv.dueDate),
          patient: inv.patient
            ? `${inv.patient.firstName} ${inv.patient.lastName}`.trim()
            : inv.couple
              ? coupleLabel(inv.couple)
              : null,
        })),
        source: "database",
      };
    }

    case "getClinicOutstandingTotal": {
      const invoices = await prisma.billingInvoice.findMany({
        where: {
          ...clinicScope(tenant),
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        select: { totalAmount: true, paidAmount: true },
      });
      const outstandingTotal = invoices.reduce(
        (s, i) => s + Math.max(0, Number(i.totalAmount) - Number(i.paidAmount)),
        0,
      );
      return {
        outstandingInvoiceCount: invoices.length,
        outstandingTotalInr: outstandingTotal,
        currency: "INR",
        source: "database",
      };
    }

    case "getPatientMedications": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      let patientId = optionalString(rawArgs, "patientId");
      if (!patientId && couple) patientId = couple.primaryPatient.id;
      if (!patientId) return { error: "patientId or couple context required.", medicines: [] };
      const prescriptions = await prisma.pharmacyPrescription.findMany({
        where: {
          clinicId: tenant.clinicId,
          patientId,
          status: { not: "CANCELLED" },
        },
        include: {
          doctor: { select: { name: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
        },
        orderBy: { prescriptionDate: "desc" },
        take: 20,
      });
      return {
        patientId,
        medicines: prescriptions.flatMap((rx) =>
          rx.items.map((item) => ({
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            timeOfDay: item.timeOfDay,
            beforeAfterFood: item.beforeAfterFood,
            duration: item.duration,
            instructions: item.instructions,
            startDate: item.startDate?.toISOString() ?? null,
            endDate: item.endDate?.toISOString() ?? null,
            prescribedBy: rx.doctorName ?? rx.doctor?.name ?? null,
            prescriptionStatus: rx.status,
          })),
        ),
        note: "Data from clinic prescriptions only. Do not invent dosage or medical advice.",
        source: "database",
      };
    }

    case "getMedicationSchedule": {
      const patientId = optionalString(rawArgs, "patientId");
      const status = optionalString(rawArgs, "status");
      const limit = Math.min(Number(rawArgs["limit"] ?? 40), 100);
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          clinicId: tenant.clinicId,
          ...(patientId ? { patientId } : {}),
          ...(status ? { status: status as never } : {}),
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          prescriptionItem: {
            select: {
              medicineName: true,
              dosage: true,
              timeOfDay: true,
              instructions: true,
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: limit,
      });
      const now = new Date();
      return {
        items: reminders.map((r) => {
          let adherence: string = r.status;
          if (!["TAKEN", "MISSED", "SKIPPED", "COMPLETED", "CANCELLED", "SKIPPED_NO_CONSENT"].includes(r.status)) {
            const t = r.scheduledAt.getTime();
            if (t > now.getTime() + 15 * 60_000) adherence = "UPCOMING";
            else if (t > now.getTime() - 2 * 3_600_000) adherence = "DUE";
            else if (["SCHEDULED", "PENDING", "DUE"].includes(r.status)) adherence = "MISSED";
          }
          return {
            id: r.id,
            patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
            medicineName: r.prescriptionItem.medicineName,
            dosage: r.prescriptionItem.dosage,
            timeOfDay: r.prescriptionItem.timeOfDay,
            scheduledAt: r.scheduledAt.toISOString(),
            status: r.status,
            adherenceStatus: adherence,
            demoMode: r.demoMode,
          };
        }),
        note: "Schedule from stored pharmacy reminders only.",
        source: "database",
      };
    }

    case "getPrescriptionSummary": {
      const prescriptionId = optionalString(rawArgs, "prescriptionId");
      if (!prescriptionId) return { error: "prescriptionId required." };
      const rx = await prisma.pharmacyPrescription.findFirst({
        where: { id: prescriptionId, clinicId: tenant.clinicId },
        include: {
          patient: true,
          items: true,
        },
      });
      if (!rx) return { error: "Prescription could not be found." };
      return {
        id: rx.id,
        status: rx.status,
        patientName: `${rx.patient.firstName} ${rx.patient.lastName}`.trim(),
        prescriptionDate: rx.prescriptionDate.toISOString(),
        items: rx.items.map((i) => ({
          medicineName: i.medicineName,
          dosage: i.dosage,
          quantityPrescribed: i.quantityPrescribed,
          quantityDispensed: i.quantityDispensed,
          instructions: i.instructions,
        })),
        source: "database",
      };
    }

    case "getPharmacyInventory": {
      const q = optionalString(rawArgs, "q")?.trim();
      const limit = Math.min(Number(rawArgs["limit"] ?? 25), 50);
      const products = await prisma.pharmacyProduct.findMany({
        where: {
          clinicId: tenant.clinicId,
          status: { not: "ARCHIVED" },
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { genericName: { contains: q, mode: "insensitive" } },
                  { brandName: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { batches: { select: { availableQuantity: true, expiryDate: true } } },
        take: limit,
        orderBy: { name: "asc" },
      });
      return {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          genericName: p.genericName,
          status: p.status,
          availableQuantity: p.batches.reduce((s, b) => s + b.availableQuantity, 0),
          reorderLevel: p.reorderLevel,
          sellingPrice: Number(p.defaultSellingPrice),
        })),
        source: "database",
      };
    }

    case "getLowStockMedicines": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 30), 100);
      const products = await prisma.pharmacyProduct.findMany({
        where: { clinicId: tenant.clinicId, status: "ACTIVE" },
        include: { batches: { select: { availableQuantity: true } } },
        take: 200,
      });
      const low = products
        .map((p) => {
          const stock = p.batches.reduce((s, b) => s + b.availableQuantity, 0);
          const threshold = Math.max(p.minimumStock, p.reorderLevel);
          return { id: p.id, name: p.name, stock, threshold, reorderLevel: p.reorderLevel };
        })
        .filter((p) => p.threshold > 0 && p.stock <= p.threshold)
        .slice(0, limit);
      return { count: low.length, items: low, source: "database" };
    }

    case "getPendingDispensing": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 25), 50);
      const rows = await prisma.pharmacyPrescription.findMany({
        where: {
          clinicId: tenant.clinicId,
          status: { in: ["PENDING", "PARTIALLY_DISPENSED"] },
        },
        include: {
          patient: true,
          items: { select: { medicineName: true, quantityPrescribed: true, quantityDispensed: true } },
        },
        orderBy: { prescriptionDate: "desc" },
        take: limit,
      });
      return {
        count: rows.length,
        items: rows.map((rx) => ({
          id: rx.id,
          status: rx.status,
          patientName: `${rx.patient.firstName} ${rx.patient.lastName}`.trim(),
          prescriptionDate: rx.prescriptionDate.toISOString(),
          medicines: rx.items.map((i) => i.medicineName),
        })),
        source: "database",
      };
    }

    case "getMedicationFollowUps": {
      const limit = Math.min(Number(rawArgs["limit"] ?? 30), 50);
      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const [due, missed, starting] = await Promise.all([
        prisma.medicationReminder.findMany({
          where: {
            clinicId: tenant.clinicId,
            status: { in: ["SCHEDULED", "PENDING", "DUE", "SENT"] },
            scheduledAt: {
              gte: new Date(now.getTime() - 2 * 3_600_000),
              lte: new Date(now.getTime() + 2 * 3_600_000),
            },
          },
          include: {
            patient: true,
            prescriptionItem: { select: { medicineName: true, dosage: true, timeOfDay: true } },
          },
          take: limit,
          orderBy: { scheduledAt: "asc" },
        }),
        prisma.medicationReminder.findMany({
          where: {
            clinicId: tenant.clinicId,
            status: "MISSED",
            scheduledAt: { gte: new Date(now.getTime() - 7 * 86_400_000) },
          },
          include: {
            patient: true,
            prescriptionItem: { select: { medicineName: true } },
          },
          take: limit,
          orderBy: { scheduledAt: "desc" },
        }),
        prisma.pharmacyPrescriptionItem.findMany({
          where: {
            prescription: { clinicId: tenant.clinicId, status: { not: "CANCELLED" } },
            startDate: { gte: tomorrowStart, lte: tomorrowEnd },
          },
          include: {
            prescription: { include: { patient: true } },
          },
          take: limit,
        }),
      ]);

      return {
        due: due.map((r) => ({
          reminderId: r.id,
          patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
          medicineName: r.prescriptionItem.medicineName,
          dosage: r.prescriptionItem.dosage,
          scheduledAt: r.scheduledAt.toISOString(),
        })),
        missed: missed.map((r) => ({
          reminderId: r.id,
          patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
          medicineName: r.prescriptionItem.medicineName,
          scheduledAt: r.scheduledAt.toISOString(),
        })),
        startingTomorrow: starting.map((i) => ({
          medicineName: i.medicineName,
          patientName: `${i.prescription.patient.firstName} ${i.prescription.patient.lastName}`.trim(),
          startDate: i.startDate?.toISOString() ?? null,
          timeOfDay: i.timeOfDay,
        })),
        note: "Operational follow-ups from pharmacy data. Do not prescribe or change doses.",
        source: "database",
      };
    }

    case "getPatientDigitalHealthStatus": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      let patientId = optionalString(rawArgs, "patientId");
      if (!patientId && couple) patientId = couple.primaryPatient.id;
      if (!patientId) return { error: "patientId or couple context required." };
      const identity = await prisma.digitalHealthIdentity.findFirst({
        where: { clinicId: tenant.clinicId, patientId },
      });
      return {
        patientId,
        status: identity?.status ?? "NOT_LINKED",
        abhaMasked: identity?.abhaMasked ?? null,
        verificationStatus: identity?.verificationStatus ?? null,
        sandboxMode: identity?.sandboxMode ?? true,
        note: "ABHA link ≠ consent. Do not approve or link via AI.",
        source: "database",
      };
    }

    case "getPatientConsents": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      let patientId = optionalString(rawArgs, "patientId");
      if (!patientId && couple) patientId = couple.primaryPatient.id;
      if (!patientId) return { error: "patientId or couple context required." };
      const rows = await prisma.digitalHealthConsent.findMany({
        where: { clinicId: tenant.clinicId, patientId },
        orderBy: { requestedAt: "desc" },
        take: 30,
      });
      return {
        patientId,
        consents: rows.map((r) => ({
          id: r.id,
          purpose: r.purpose,
          status: r.status,
          expiresAt: r.expiresAt?.toISOString() ?? null,
          sandboxMode: r.sandboxMode,
        })),
        note: "Digital health consents only. AI must not approve/revoke.",
        source: "database",
      };
    }

    case "getPatientHealthTimeline": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      let patientId = optionalString(rawArgs, "patientId");
      if (!patientId && couple) patientId = couple.primaryPatient.id;
      if (!patientId) return { error: "patientId or couple context required." };
      const [rx, sales] = await Promise.all([
        prisma.pharmacyPrescription.findMany({
          where: { clinicId: tenant.clinicId, patientId },
          include: { items: { select: { medicineName: true } } },
          orderBy: { prescriptionDate: "desc" },
          take: 10,
        }),
        prisma.pharmacySale.findMany({
          where: { clinicId: tenant.clinicId, patientId },
          orderBy: { soldAt: "desc" },
          take: 10,
        }),
      ]);
      return {
        patientId,
        recent: [
          ...rx.map((r) => ({
            type: "Prescription",
            date: r.prescriptionDate.toISOString(),
            title: r.items.map((i) => i.medicineName).join(", "),
            status: r.status,
          })),
          ...sales.map((s) => ({
            type: "Dispensed",
            date: s.soldAt.toISOString(),
            title: s.invoiceNumber,
            status: s.paymentStatus,
          })),
        ].sort((a, b) => b.date.localeCompare(a.date)),
        note: "Summary of existing SMRKOMED records only.",
        source: "database",
      };
    }

    case "getRecordSharingStatus": {
      const patientId = optionalString(rawArgs, "patientId");
      const limit = Math.min(Number(rawArgs["limit"] ?? 25), 50);
      const rows = await prisma.healthRecordExchange.findMany({
        where: {
          clinicId: tenant.clinicId,
          ...(patientId ? { patientId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          patientId: r.patientId,
          status: r.status,
          purpose: r.purpose,
          failureReason: r.failureReason,
          sandboxMode: r.sandboxMode,
          sharedAt: r.sharedAt?.toISOString() ?? null,
        })),
        note: "SHARED only when provider confirmed. AI cannot share records.",
        source: "database",
      };
    }

    case "getPatient360": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        header: view.header,
        summaryCards: view.summaryCards,
        attention: view.attention,
        digitalHealth: view.digitalHealth,
        note: "Operational Patient 360. Not diagnosis. AI cannot prescribe or mutate without confirmation.",
        source: "database",
      };
    }

    case "getPatientTimeline": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        timeline: view.timeline,
        note: "Derived from existing records only.",
        source: "database",
      };
    }

    case "getCurrentMedications": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return { medications: view.medications, source: "database" };
    }

    case "getPendingCareTasks": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const tasks = await prisma.careTask.findMany({
        where: {
          clinicId: tenant.clinicId,
          coupleId: couple.id,
          status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE"] },
        },
        orderBy: { dueDate: "asc" },
        take: 30,
      });
      return {
        couple: coupleLabel(couple),
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate?.toISOString() ?? null,
        })),
        source: "database",
      };
    }

    case "getPatientDocuments": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const docs = await prisma.document.findMany({
        where: { clinicId: tenant.clinicId, coupleId: couple.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { category: { select: { name: true } } },
      });
      const storageConfigured = docs.some((d) => Boolean(d.storageKey));
      return {
        documents: docs.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          category: d.category?.name ?? null,
          storage: d.storageKey ? "STORED" : "METADATA_ONLY",
        })),
        documentStorageNote: storageConfigured
          ? null
          : "Document storage is not configured.",
        source: "database",
      };
    }

    case "getPatientCommunicationSummary": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        whatsappStatus: view.summaryCards.whatsappStatus,
        conversationId: view.summaryCards.conversationId,
        note: "AI cannot send WhatsApp automatically. Consent and automation rules apply.",
        source: "database",
      };
    }

    case "getPatientPaymentStatus": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        paymentStatus: view.summaryCards.paymentStatus,
        outstandingAmountInr: view.summaryCards.outstandingAmountInr,
        source: "database",
      };
    }

    case "getPatientInsuranceStatus": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        insuranceStatus: view.summaryCards.insuranceStatus,
        policyCount: view.summaryCards.insurancePolicyCount,
        source: "database",
      };
    }

    case "preparePatientConsultation": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      if (!couple) return { error: "I don't have that information in SmrkoMed." };
      const view = await buildPatient360(tenant, couple.id);
      if (!view) return { error: "I don't have that information in SmrkoMed." };
      return {
        preparePatient: view.preparePatient,
        attention: view.attention,
        note: "Briefing only. Review clinically before acting. AI cannot diagnose or prescribe.",
        source: "database",
      };
    }

    default:
      return { error: "Unknown tool." };
  }
}

export async function executeToolAndSerialize(
  tenant: TenantContext,
  name: AiToolName,
  argsJson: string,
  page?: AiPageContext,
) {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    args = {};
  }
  const result = await runAiTool(tenant, name, args, page);
  void writeTenantAuditLog(tenant, {
    action: "ai.tool",
    entityType: "AiBuddy",
    metadata: { tool: name },
  }).catch(() => undefined);
  return clipText(JSON.stringify(result), AI_LIMITS.maxToolResultChars);
}
