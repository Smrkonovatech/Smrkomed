import type { Prisma, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { HttpError } from "../../lib/errors";
import { maskPhone } from "../../integrations/providers/whatsapp/phone";

export type InboxFilter =
  | "all"
  | "unread"
  | "assigned_to_me"
  | "unassigned"
  | "waiting_patient"
  | "waiting_staff"
  | "automation_active"
  | "human_handoff"
  | "escalated"
  | "closed";

export async function assertClinicStaff(clinicId: string, userId: string) {
  const membership = await prisma.clinicMembership.findFirst({
    where: { clinicId, userId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, initials: true, title: true } } },
  });
  if (!membership) {
    throw new HttpError(400, "INVALID_STAFF", "Staff member is not an active member of this clinic.");
  }
  return membership.user;
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

export async function listInboxConversations(
  tenant: TenantContext,
  opts: { filter?: InboxFilter; q?: string; take?: number } = {},
) {
  const take = Math.min(opts.take ?? 80, 150);
  const where: Prisma.ConversationWhereInput = {
    clinicId: tenant.clinicId,
    channel: "WHATSAPP",
  };

  const filter = opts.filter ?? "all";
  if (filter === "unassigned") where.assignedStaffId = null;
  if (filter === "assigned_to_me") where.assignedStaffId = tenant.userId;
  if (filter === "waiting_patient") where.status = "WAITING_PATIENT";
  if (filter === "waiting_staff") where.status = "WAITING_STAFF";
  if (filter === "human_handoff") where.status = "HUMAN_HANDOFF";
  if (filter === "escalated") where.status = "ESCALATED";
  if (filter === "closed") where.status = "CLOSED";
  if (filter === "automation_active") {
    where.automationPausedAt = null;
    where.status = { notIn: ["CLOSED", "HUMAN_HANDOFF", "RESOLVED"] };
  }

  if (opts.q?.trim()) {
    const q = opts.q.trim();
    where.OR = [
      { contactPhone: { contains: q } },
      { patient: { firstName: { contains: q, mode: "insensitive" } } },
      { patient: { lastName: { contains: q, mode: "insensitive" } } },
      { patient: { phone: { contains: q } } },
      { patient: { whatsappNumber: { contains: q } } },
    ];
  }

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true, status: true } },
      assignedStaff: { select: { id: true, name: true, initials: true, title: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          direction: true,
          status: true,
          createdAt: true,
          messageType: true,
          content: true,
          senderType: true,
        },
      },
    },
  });

  const patientIds = rows.map((r) => r.patientId).filter(Boolean) as string[];
  const activeExecs =
    patientIds.length === 0
      ? []
      : await prisma.whatsAppFlowExecution.findMany({
          where: {
            clinicId: tenant.clinicId,
            patientId: { in: patientIds },
            status: { in: ["WAITING", "RUNNING", "PENDING", "ESCALATED"] },
          },
          select: {
            id: true,
            patientId: true,
            status: true,
            resumeAt: true,
            flowId: true,
            flow: { select: { name: true } },
          },
          take: 200,
        });
  const execByPatient = new Map<string, (typeof activeExecs)[number]>();
  for (const ex of activeExecs) {
    if (ex.patientId && !execByPatient.has(ex.patientId)) execByPatient.set(ex.patientId, ex);
  }

  const result = [];
  for (const row of rows) {
    const last = row.messages[0];
    let unreadCount = 0;
    if (last?.direction === "INBOUND") {
      if (!row.lastStaffReadAt || last.createdAt > row.lastStaffReadAt) unreadCount = 1;
    }
    if (filter === "unread" && unreadCount === 0) continue;

    const automation = row.patientId ? execByPatient.get(row.patientId) : undefined;
    result.push({
      id: row.id,
      status: row.status,
      priority: row.priority,
      unmatched: row.unmatched,
      contactPhone: maskPhone(row.contactPhone),
      contactState: row.unmatched ? "UNMATCHED_CONTACT" : "MATCHED_PATIENT",
      patient: row.patient
        ? {
            id: row.patient.id,
            firstName: row.patient.firstName,
            lastName: row.patient.lastName,
            status: row.patient.status,
            initials: initials(row.patient.firstName, row.patient.lastName),
          }
        : null,
      assignedStaff: row.assignedStaff
        ? {
            id: row.assignedStaff.id,
            name: row.assignedStaff.name,
            initials: row.assignedStaff.initials,
            title: row.assignedStaff.title,
          }
        : null,
      unreadCount,
      automationPaused: Boolean(row.automationPausedAt),
      handoffAt: row.handoffAt?.toISOString() ?? null,
      handoffReason: row.handoffReason,
      automation: automation
        ? {
            executionId: automation.id,
            flowId: automation.flowId,
            flowName: automation.flow.name,
            status: automation.status,
            resumeAt: automation.resumeAt?.toISOString() ?? null,
          }
        : null,
      lastMessage: last
        ? {
            id: last.id,
            direction: last.direction,
            status: last.status,
            senderType: last.senderType,
            createdAt: last.createdAt.toISOString(),
            messageType: last.messageType,
            preview: last.content.slice(0, 100),
          }
        : null,
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  return result;
}

export async function getInboxConversationDetail(tenant: TenantContext, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          whatsappNumber: true,
          status: true,
          preferredLanguage: true,
        },
      },
      assignedStaff: { select: { id: true, name: true, initials: true, title: true } },
      couple: {
        select: {
          id: true,
          slug: true,
          status: true,
          assignedDoctorId: true,
          assignedCoordinatorId: true,
          assignedDoctor: { select: { id: true, name: true } },
          assignedCoordinator: { select: { id: true, name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true,
          direction: true,
          senderType: true,
          content: true,
          messageType: true,
          status: true,
          createdAt: true,
          whatsappMedia: {
            select: {
              id: true,
              type: true,
              mimeType: true,
              filename: true,
              caption: true,
              sizeBytes: true,
              durationSeconds: true,
              isVoice: true,
              status: true,
              error: true,
            },
          },
        },
      },
    },
  });
  if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastStaffReadAt: new Date() },
  });

  let activeAutomation = null;
  if (conversation.patientId) {
    const ex = await prisma.whatsAppFlowExecution.findFirst({
      where: {
        clinicId: tenant.clinicId,
        patientId: conversation.patientId,
        status: { in: ["WAITING", "RUNNING", "PENDING", "ESCALATED"] },
      },
      include: { flow: { select: { id: true, name: true } } },
      orderBy: { startedAt: "desc" },
    });
    if (ex) {
      activeAutomation = {
        executionId: ex.id,
        flowId: ex.flowId,
        flowName: ex.flow.name,
        status: ex.status,
        resumeAt: ex.resumeAt?.toISOString() ?? null,
        currentNodeId: ex.currentNodeId,
      };
    }
  }

  return {
    id: conversation.id,
    status: conversation.status,
    priority: conversation.priority,
    unmatched: conversation.unmatched,
    contactPhone: maskPhone(conversation.contactPhone),
    handoffAt: conversation.handoffAt?.toISOString() ?? null,
    handoffReason: conversation.handoffReason,
    automationPausedAt: conversation.automationPausedAt?.toISOString() ?? null,
    aiPausedAt: conversation.aiPausedAt?.toISOString() ?? null,
    assignedStaff: conversation.assignedStaff,
    patient: conversation.patient,
    couple: conversation.couple,
    clinicName: tenant.clinicName,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      senderType: m.senderType,
      content: m.content,
      messageType: m.messageType,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      label:
        m.senderType === "SYSTEM"
          ? "AUTOMATION"
          : m.senderType === "AI"
            ? "✦ Smrko AI"
            : m.senderType === "STAFF"
              ? "STAFF"
              : "PATIENT",
      media: m.whatsappMedia
        ? {
            id: m.whatsappMedia.id,
            type: m.whatsappMedia.type,
            mimeType: m.whatsappMedia.mimeType,
            filename: m.whatsappMedia.filename,
            caption: m.whatsappMedia.caption,
            sizeBytes: m.whatsappMedia.sizeBytes,
            durationSeconds: m.whatsappMedia.durationSeconds,
            isVoice: m.whatsappMedia.isVoice,
            status: m.whatsappMedia.status,
            error: m.whatsappMedia.error,
            url: `/api/v1/whatsapp-automation/inbox/media/${m.whatsappMedia.id}`,
          }
        : null,
    })),
    automation: activeAutomation,
  };
}

export async function getPatientInboxContext(tenant: TenantContext, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: tenant.clinicId },
  });
  if (!patient) throw new HttpError(404, "NOT_FOUND", "Patient not found");

  const couple = await prisma.couple.findFirst({
    where: {
      clinicId: tenant.clinicId,
      OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
    },
    include: {
      assignedDoctor: { select: { id: true, name: true } },
      assignedCoordinator: { select: { id: true, name: true } },
    },
  });

  const now = new Date();
  const apptWhere: Prisma.AppointmentWhereInput = {
    clinicId: tenant.clinicId,
    startsAt: { gte: now },
    status: { in: ["CONFIRMED", "WAITING"] },
  };
  if (couple?.id) apptWhere.coupleId = couple.id;

  const [upcomingAppt, overdueTasks, recentTasks, consents, prefs, invoices, rx, executions] =
    await Promise.all([
      couple
        ? prisma.appointment.findFirst({
            where: apptWhere,
            orderBy: { startsAt: "asc" },
          })
        : Promise.resolve(null),
      couple
        ? prisma.careTask.count({
            where: {
              clinicId: tenant.clinicId,
              coupleId: couple.id,
              status: { not: "COMPLETED" },
              dueDate: { lt: now },
            },
          })
        : Promise.resolve(0),
      couple
        ? prisma.careTask.findMany({
            where: { clinicId: tenant.clinicId, coupleId: couple.id },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, title: true, status: true, dueDate: true },
          })
        : Promise.resolve([]),
      prisma.consent.findMany({
        where: { clinicId: tenant.clinicId, patientId },
        select: { consentType: true, channel: true, status: true, consentedAt: true, updatedAt: true },
      }),
      prisma.communicationPreference.findUnique({ where: { patientId } }),
      prisma.billingInvoice.findMany({
        where: {
          clinicId: tenant.clinicId,
          patientId,
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        take: 3,
        orderBy: { dueDate: "asc" },
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, paidAmount: true, dueDate: true },
      }),
      prisma.pharmacyPrescription.findFirst({
        where: { clinicId: tenant.clinicId, patientId },
        orderBy: { createdAt: "desc" },
        include: { items: { take: 5, select: { medicineName: true, dosage: true, timeOfDay: true } } },
      }),
      prisma.whatsAppFlowExecution.findMany({
        where: {
          clinicId: tenant.clinicId,
          patientId,
          status: { in: ["WAITING", "RUNNING", "PENDING", "ESCALATED", "COMPLETED"] },
        },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { flow: { select: { name: true } } },
      }),
    ]);

  return {
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      whatsappNumber: patient.whatsappNumber,
      status: patient.status,
      preferredLanguage: patient.preferredLanguage,
    },
    couple: couple
      ? {
          id: couple.id,
          slug: couple.slug,
          status: couple.status,
          doctor: couple.assignedDoctor,
          coordinator: couple.assignedCoordinator,
        }
      : null,
    upcomingAppointment: upcomingAppt
      ? {
          id: upcomingAppt.id,
          type: upcomingAppt.type,
          startsAt: upcomingAppt.startsAt.toISOString(),
          doctorName: upcomingAppt.doctorName,
          status: upcomingAppt.status,
        }
      : null,
    overdueTaskCount: overdueTasks,
    recentTasks: recentTasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
    })),
    consents,
    preferences: prefs,
    payments: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      balance: Number(inv.totalAmount) - Number(inv.paidAmount),
      dueDate: inv.dueDate?.toISOString() ?? null,
    })),
    pharmacy: rx
      ? {
          id: rx.id,
          createdAt: rx.createdAt.toISOString(),
          items: rx.items,
        }
      : null,
    automations: executions.map((e) => ({
      id: e.id,
      flowName: e.flow.name,
      status: e.status,
      resumeAt: e.resumeAt?.toISOString() ?? null,
      startedAt: e.startedAt.toISOString(),
    })),
  };
}

export async function buildCommunicationTimeline(tenant: TenantContext, patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, clinicId: tenant.clinicId },
    select: { id: true },
  });
  if (!patient) throw new HttpError(404, "NOT_FOUND", "Patient not found");

  const conversations = await prisma.conversation.findMany({
    where: { clinicId: tenant.clinicId, patientId, channel: "WHATSAPP" },
    select: { id: true },
  });
  const convIds = conversations.map((c) => c.id);

  const [messages, executions, consents, tasks] = await Promise.all([
    convIds.length
      ? prisma.message.findMany({
          where: { conversationId: { in: convIds } },
          orderBy: { createdAt: "desc" },
          take: 80,
        })
      : Promise.resolve([]),
    prisma.whatsAppFlowExecution.findMany({
      where: { clinicId: tenant.clinicId, patientId },
      orderBy: { startedAt: "desc" },
      take: 40,
      include: { flow: { select: { name: true } } },
    }),
    prisma.consent.findMany({
      where: { clinicId: tenant.clinicId, patientId },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ category: { contains: "WHATSAPP" } }, { title: { contains: "WhatsApp", mode: "insensitive" } }],
        couple: {
          OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, status: true, category: true, createdAt: true, completedAt: true },
    }),
  ]);

  type Event = { at: string; kind: string; title: string; detail?: string; meta?: Record<string, unknown> };
  const events: Event[] = [];

  for (const m of messages) {
    events.push({
      at: m.createdAt.toISOString(),
      kind:
        m.direction === "INBOUND"
          ? "patient_reply"
          : m.senderType === "SYSTEM"
            ? "automation_message"
            : m.senderType === "AI"
              ? "ai_message"
              : "staff_message",
      title:
        m.direction === "INBOUND"
          ? "Patient replied"
          : m.senderType === "SYSTEM"
            ? "Automation message"
            : m.senderType === "AI"
              ? "✦ Smrko AI"
              : "Staff message",
      detail: m.content.slice(0, 200),
      meta: { messageId: m.id, senderType: m.senderType, status: m.status },
    });
  }
  for (const e of executions) {
    events.push({
      at: e.startedAt.toISOString(),
      kind: "automation_execution",
      title: `Automation: ${e.flow.name}`,
      detail: e.status + (e.error ? ` — ${e.error}` : ""),
      meta: { executionId: e.id, status: e.status },
    });
  }
  for (const c of consents) {
    events.push({
      at: (c.consentedAt ?? c.updatedAt).toISOString(),
      kind: "consent",
      title: `Consent ${c.status}`,
      detail: `${c.consentType} · ${c.channel}`,
      meta: { status: c.status },
    });
  }
  for (const t of tasks) {
    events.push({
      at: t.createdAt.toISOString(),
      kind: "care_task",
      title: t.title,
      detail: t.status,
      meta: { careTaskId: t.id, category: t.category },
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { patientId, events: events.slice(0, 100) };
}
