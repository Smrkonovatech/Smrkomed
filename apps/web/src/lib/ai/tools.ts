import {
  prisma,
  type TenantContext,
  writeTenantAuditLog,
} from "@smrkomed/database";

import { AI_LIMITS } from "./config";
import { assertToolAllowed } from "./permissions";
import { buildClinicPriorities } from "./priorities";
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
      description: "Create a WhatsApp/SMS draft reminder. Does not send.",
      parameters: {
        type: "object",
        properties: {
          coupleSlug: { type: "string" },
          coupleId: { type: "string" },
          intent: { type: "string" },
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

    case "getNavigationHelp": {
      const topic = (optionalString(rawArgs, "topic") ?? "").toLowerCase();
      const routes = [
        { label: "Dashboard", href: "/", keywords: ["dashboard", "home", "summary", "priorit"] },
        { label: "Patients", href: "/patients", keywords: ["patient", "couple", "add couple"] },
        { label: "Tasks", href: "/tasks", keywords: ["task", "overdue", "follow"] },
        { label: "Appointments", href: "/appointments", keywords: ["appointment", "schedule"] },
        { label: "Documents", href: "/documents", keywords: ["document", "file", "report"] },
        { label: "Care Plans", href: "/care-plans", keywords: ["care plan", "journey"] },
        { label: "Care Loop", href: "/care-loop", keywords: ["care loop", "exception"] },
        { label: "CRM", href: "/crm", keywords: ["crm", "lead", "enquiry"] },
        { label: "Settings", href: "/settings", keywords: ["setting", "staff", "coordinator"] },
      ];
      const matches = routes.filter((r) =>
        r.keywords.some((k) => topic.includes(k) || k.includes(topic)),
      );
      return { routes: matches.length ? matches : routes.slice(0, 6) };
    }

    case "draftPatientMessage": {
      const couple = await resolveCouple(tenant, coupleArgs(rawArgs), page);
      const intent = (optionalString(rawArgs, "intent") ?? "appointment reminder").slice(0, 200);
      if (!couple) {
        return {
          draft: `Hi, this is a message from ${tenant.clinicName}. ${intent}. Please contact the clinic if you have questions.`,
          sent: false,
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
      const draft = when
        ? `Hi ${patientFirst}, this is a reminder from ${tenant.clinicName} regarding your appointment on ${when} with ${doctor}. Please reply if you need to reschedule.`
        : `Hi ${patientFirst}, this is ${tenant.clinicName}. ${intent}. Please reply if you have any questions.`;
      return { draft, sent: false, intent, couple: coupleLabel(couple) };
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
