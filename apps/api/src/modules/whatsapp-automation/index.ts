import { Hono } from "hono";
import type { Prisma } from "@smrkomed/database";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { resumeDueExecutions, retryFailedExecution, startFlowExecution } from "./engine";
import { emptyDefinition } from "./types";
import { ensureClinicFlowLibrary } from "./seed";
import { processAutomationTick } from "./worker";
import { env } from "../../config/env";
import { parseExecutionContext } from "./context";
import {
  assignConversationSchema,
  broadcastPreviewSchema,
  conversationStatusSchema,
  createCampaignSchema,
  createFlowSchema,
  createKbSchema,
  followUpFromInboxSchema,
  idParam,
  inboxListQuery,
  listExecutionsQuery,
  listFlowsQuery,
  listKbQuery,
  manualTriggerSchema,
  segmentPreviewSchema,
  sessionTextSchema,
  takeoverSchema,
  testFlowSchema,
  typingSchema,
  updateCommSettingsSchema,
  updateConsentSchema,
  updateFlowSchema,
  updateKbSchema,
  updatePreferencesSchema,
} from "./schemas";
import { realtimeBus } from "../realtime/bus";
import { getClinicCommSettings } from "./safety";
import { parseDefinition, validateFlowDefinition } from "./validate";
import {
  assertClinicStaff,
  buildCommunicationTimeline,
  getInboxConversationDetail,
  getPatientInboxContext,
  listInboxConversations,
} from "./inbox";
import { previewSegment } from "./segments";
import {
  confirmAndStartCampaign,
  createCampaign,
  materializeCampaignRecipients,
  processCampaignBatch,
} from "./campaigns";
import { sendWhatsAppSessionText } from "../../integrations/providers/whatsapp/messaging";

function serializeKb(row: {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string | null;
  specialty: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: { id: string; name: string | null } | null;
}) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    keywords: row.keywords,
    specialty: row.specialty,
    status: row.status,
    updatedByName: row.updatedBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFlow(row: {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  definition: unknown;
  isLibrary: boolean;
  libraryKey: string | null;
  createdById: string | null;
  lastRunAt: Date | null;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string | null } | null;
  _count?: { executions: number };
}) {
  const total = row.successCount + row.failureCount;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    triggerType: row.triggerType,
    definition: parseDefinition(row.definition),
    isLibrary: row.isLibrary,
    isSystem: row.isLibrary,
    libraryKey: row.libraryKey,
    createdById: row.createdById,
    createdByName: row.createdBy?.name ?? null,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    successCount: row.successCount,
    failureCount: row.failureCount,
    successRate: total === 0 ? null : Math.round((row.successCount / total) * 1000) / 10,
    patientsReached: row._count?.executions ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeExecution(row: {
  id: string;
  flowId: string;
  status: string;
  triggerType: string;
  triggerEventId: string | null;
  patientId: string | null;
  coupleId: string | null;
  conversationId: string | null;
  currentNodeId: string | null;
  error: string | null;
  resumeAt: Date | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  context?: unknown;
  flow?: { name: string } | null;
  steps?: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    input: unknown;
    output: unknown;
    error: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }>;
}) {
  const ctx = parseExecutionContext(row.context);
  return {
    id: row.id,
    flowId: row.flowId,
    flowName: row.flow?.name ?? null,
    status: row.status,
    triggerType: row.triggerType,
    triggerEventId: row.triggerEventId,
    patientId: row.patientId,
    coupleId: row.coupleId,
    conversationId: row.conversationId,
    currentNodeId: row.currentNodeId,
    error: row.error,
    resumeAt: row.resumeAt?.toISOString() ?? null,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    retryCount: ctx.retryCount ?? 0,
    maxRetries: ctx.maxRetries ?? null,
    lastAttemptAt: ctx.lastAttemptAt ?? null,
    nextRetryAt: ctx.nextRetryAt ?? null,
    lastError: ctx.lastError ?? row.error,
    tags: ctx.tags ?? [],
    steps: (row.steps ?? []).map((s) => ({
      id: s.id,
      nodeId: s.nodeId,
      nodeType: s.nodeType,
      status: s.status,
      input: s.input,
      output: s.output,
      error: s.error,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
  };
}

export const whatsappAutomationRoutes = new Hono<AppEnv>()
  .get("/overview", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const clinicId = tenant.clinicId;
    const [
      sentToday,
      receivedToday,
      deliveredToday,
      failedToday,
      readToday,
      activeConversations,
      activeFlows,
      completedFlowsToday,
      failedFlowsToday,
      waitingExecutions,
      escalatedOpen,
      templates,
      account,
      consentGranted,
      consentRevoked,
      skippedStepsToday,
      kbPublished,
    ] = await Promise.all([
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          createdAt: { gte: start },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "INBOUND",
          createdAt: { gte: start },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "DELIVERED",
          createdAt: { gte: start },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "FAILED",
          createdAt: { gte: start },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "READ",
          createdAt: { gte: start },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.conversation.count({
        where: { clinicId, channel: "WHATSAPP", status: { not: "CLOSED" } },
      }),
      prisma.whatsAppFlow.count({ where: { clinicId, status: "ACTIVE", isLibrary: false } }),
      prisma.whatsAppFlowExecution.count({
        where: { clinicId, status: "COMPLETED", completedAt: { gte: start } },
      }),
      prisma.whatsAppFlowExecution.count({
        where: { clinicId, status: "FAILED", completedAt: { gte: start } },
      }),
      prisma.whatsAppFlowExecution.count({ where: { clinicId, status: "WAITING" } }),
      prisma.whatsAppFlowExecution.count({
        where: { clinicId, status: "ESCALATED", completedAt: { gte: start } },
      }),
      prisma.whatsAppTemplate.groupBy({
        by: ["status"],
        where: { clinicId },
        _count: true,
      }),
      prisma.whatsAppAccount.findFirst({
        where: { clinicId, isActive: true },
        select: { displayName: true, displayPhoneNumber: true },
      }),
      prisma.consent.count({
        where: {
          clinicId,
          consentType: "WHATSAPP_COMMUNICATION",
          channel: "WHATSAPP",
          status: "GRANTED",
        },
      }),
      prisma.consent.count({
        where: {
          clinicId,
          consentType: "WHATSAPP_COMMUNICATION",
          channel: "WHATSAPP",
          status: "REVOKED",
        },
      }),
      prisma.whatsAppFlowExecutionStep.count({
        where: {
          createdAt: { gte: start },
          status: "SKIPPED",
          execution: { clinicId },
        },
      }),
      prisma.whatsAppKnowledgeArticle.count({ where: { clinicId, status: "PUBLISHED" } }),
    ]);

    const templateStatus = Object.fromEntries(templates.map((t) => [t.status, t._count]));
    const completedOrFailed = completedFlowsToday + failedFlowsToday;
    const successRate =
      completedOrFailed === 0
        ? null
        : Math.round((completedFlowsToday / completedOrFailed) * 1000) / 10;

    return ok(c, {
      connection: {
        connected: Boolean(account),
        displayName: account?.displayName ?? null,
        phone: account?.displayPhoneNumber ?? null,
      },
      today: {
        messagesSent: sentToday,
        messagesDelivered: deliveredToday,
        messagesFailed: failedToday,
        messagesRead: readToday,
        messagesReceived: receivedToday,
        patientReplies: receivedToday,
        activeFlows,
        completedFlows: completedFlowsToday,
        failedFlows: failedFlowsToday,
        waitingExecutions,
        pendingReplies: waitingExecutions,
        escalated: escalatedOpen,
        successRate,
        skippedAutomation: skippedStepsToday,
      },
      consent: {
        granted: consentGranted,
        revoked: consentRevoked,
        eligible: consentGranted,
        blocked: consentRevoked,
      },
      knowledgeBase: { published: kbPublished },
      activeConversations,
      templates: {
        approved: templateStatus["APPROVED"] ?? 0,
        pending: templateStatus["PENDING"] ?? templateStatus["PENDING_REVIEW"] ?? 0,
        rejected: templateStatus["REJECTED"] ?? 0,
        total: Object.values(templateStatus).reduce((a, b) => a + b, 0),
      },
      hasData:
        sentToday + receivedToday + completedOrFailed + activeConversations + consentGranted > 0,
      workerNote:
        "WAIT/schedules: set WHATSAPP_AUTOMATION_WORKER=1 on Railway API (or cron POST /whatsapp-automation/internal/tick with WHATSAPP_WORKER_SECRET). Not browser timers.",
    });
  })

  .get("/flows", validate("query", listFlowsQuery), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    await ensureClinicFlowLibrary(tenant.clinicId, tenant.userId);
    const q = c.req.valid("query");
    const where: Prisma.WhatsAppFlowWhereInput = { clinicId: tenant.clinicId };
    if (q.status === "LIBRARY") {
      where.isLibrary = true;
    } else if (q.status) {
      where.status = q.status;
      where.isLibrary = false;
    }
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ];
    }
    const rows = await prisma.whatsAppFlow.findMany({
      where,
      orderBy: [{ isLibrary: "desc" }, { updatedAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { executions: true } },
      },
      take: 200,
    });
    return ok(c, rows.map(serializeFlow));
  })

  .post("/flows", validate("json", createFlowSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const body = c.req.valid("json");
    const definition =
      body.definition ??
      emptyDefinition(body.triggerType, body.triggerType.replaceAll("_", " "));
    const row = await prisma.whatsAppFlow.create({
      data: {
        clinicId: tenant.clinicId,
        name: body.name,
        description: body.description ?? null,
        status: "DRAFT",
        triggerType: body.triggerType,
        definition: definition as unknown as Prisma.InputJsonValue,
        isLibrary: false,
        createdById: tenant.userId,
      },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.create", "WhatsAppFlow", row.id, { name: row.name });
    return ok(c, serializeFlow(row), 201);
  })

  .get("/flows/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const { id } = c.req.valid("param");
    const row = await prisma.whatsAppFlow.findFirst({
      where: { id, clinicId: tenant.clinicId },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    if (!row) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    return ok(c, serializeFlow(row));
  })

  .patch("/flows/:id", validate("param", idParam), validate("json", updateFlowSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    if (existing.isLibrary) {
      throw new HttpError(
        422,
        "SYSTEM_TEMPLATE",
        "System workflows cannot be modified. Duplicate this flow to create an editable CUSTOM flow.",
      );
    }
    if (body.definition) {
      const issues = validateFlowDefinition(parseDefinition(body.definition));
      if (issues.length && body.status === "ACTIVE") {
        throw new HttpError(422, "INVALID_FLOW", issues.map((i) => i.message).join(" "));
      }
    }
    const row = await prisma.whatsAppFlow.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.description === undefined ? {} : { description: body.description }),
        ...(body.triggerType === undefined ? {} : { triggerType: body.triggerType }),
        ...(body.definition === undefined
          ? {}
          : { definition: body.definition as unknown as Prisma.InputJsonValue }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.update", "WhatsAppFlow", row.id, {
      status: row.status,
    });
    return ok(c, serializeFlow(row));
  })

  .post("/flows/:id/duplicate", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    const row = await prisma.whatsAppFlow.create({
      data: {
        clinicId: tenant.clinicId,
        name: `${existing.name} (copy)`,
        description: existing.description,
        status: "DRAFT",
        triggerType: existing.triggerType,
        definition: existing.definition as Prisma.InputJsonValue,
        isLibrary: false,
        libraryKey: null,
        createdById: tenant.userId,
      },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.duplicate", "WhatsAppFlow", row.id, { from: existing.id });
    return ok(c, serializeFlow(row), 201);
  })

  .post("/flows/:id/activate", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    if (existing.isLibrary) {
      throw new HttpError(422, "LIBRARY_FLOW", "Duplicate the library flow before activating.");
    }
    const issues = validateFlowDefinition(parseDefinition(existing.definition));
    if (issues.length) {
      throw new HttpError(422, "INVALID_FLOW", issues.map((i) => i.message).join(" "));
    }
    const account = await prisma.whatsAppAccount.findFirst({
      where: { clinicId: tenant.clinicId, isActive: true },
    });
    const def = parseDefinition(existing.definition);
    const needsWa = def.nodes.some((n) => n.type === "SEND_TEMPLATE" || n.type === "SEND_TEXT");
    if (needsWa && !account) {
      throw new HttpError(
        409,
        "WHATSAPP_NOT_CONNECTED",
        "Connect WhatsApp to activate live messaging flows.",
      );
    }
    for (const node of def.nodes.filter((n) => n.type === "SEND_TEMPLATE")) {
      const name = String(node.config["templateName"] ?? "");
      if (!name) continue;
      const tpl = await prisma.whatsAppTemplate.findFirst({
        where: { clinicId: tenant.clinicId, name, status: "APPROVED" },
      });
      if (!tpl) {
        throw new HttpError(
          422,
          "TEMPLATE_NOT_APPROVED",
          `Cannot activate: template "${name}" is not configured or not approved by Meta.`,
        );
      }
    }
    const row = await prisma.whatsAppFlow.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.activate", "WhatsAppFlow", row.id);
    return ok(c, serializeFlow(row));
  })

  .post("/flows/:id/pause", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    const row = await prisma.whatsAppFlow.update({
      where: { id },
      data: { status: "PAUSED" },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.pause", "WhatsAppFlow", row.id);
    return ok(c, serializeFlow(row));
  })

  .post("/flows/:id/archive", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    if (existing.isLibrary) {
      throw new HttpError(422, "SYSTEM_TEMPLATE", "System workflows cannot be archived. Duplicate first.");
    }
    const row = await prisma.whatsAppFlow.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
    });
    await audit(tenant, "whatsapp.flow.archive", "WhatsAppFlow", row.id);
    return ok(c, serializeFlow(row));
  })

  .post("/flows/:id/validate", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    return ok(c, { issues: validateFlowDefinition(parseDefinition(existing.definition)) });
  })

  .post("/flows/:id/test", validate("param", idParam), validate("json", testFlowSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");

    // Patch condition simulateBranch into definition context via vars only — engine reads config.
    // Temporarily mutate a copy in DB is dangerous; instead inject via execution context.
    const { execution } = await startFlowExecution({
      tenant,
      flowId: id,
      triggerEventId: `test_${Date.now()}`,
      ...(body.patientId ? { patientId: body.patientId } : {}),
      ...(body.coupleId ? { coupleId: body.coupleId } : {}),
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(body.vars ? { vars: body.vars } : {}),
      simulation: true,
    });

    // If simulateBranch requested, re-run steps already used config — document limitation.
    const withSteps = await prisma.whatsAppFlowExecution.findFirst({
      where: { id: execution.id, clinicId: tenant.clinicId },
      include: { flow: { select: { name: true } }, steps: { orderBy: { createdAt: "asc" } } },
    });
    await audit(tenant, "whatsapp.flow.test", "WhatsAppFlow", id, { executionId: execution.id });
    return ok(c, {
      mode: "SIMULATION",
      label: "TEST MODE — NO MESSAGE WILL BE SENT",
      note: "No WhatsApp messages were sent. WAIT nodes were skipped instantly in simulation.",
      execution: serializeExecution(withSteps!),
    });
  })

  .post("/flows/:id/trigger", validate("param", idParam), validate("json", manualTriggerSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { execution, duplicate } = await startFlowExecution({
      tenant,
      flowId: id,
      triggerEventId: body.triggerEventId ?? `manual_${Date.now()}`,
      ...(body.patientId ? { patientId: body.patientId } : {}),
      ...(body.coupleId ? { coupleId: body.coupleId } : {}),
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(body.vars ? { vars: body.vars } : {}),
      simulation: false,
    });
    const withSteps = await prisma.whatsAppFlowExecution.findFirst({
      where: { id: execution.id, clinicId: tenant.clinicId },
      include: { flow: { select: { name: true } }, steps: { orderBy: { createdAt: "asc" } } },
    });
    return ok(c, { duplicate, mode: "LIVE", execution: serializeExecution(withSteps!) });
  })

  .get("/executions", validate("query", listExecutionsQuery), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_LOGS);
    const q = c.req.valid("query");
    const where: Prisma.WhatsAppFlowExecutionWhereInput = { clinicId: tenant.clinicId };
    if (q.flowId) where.flowId = q.flowId;
    if (q.status) {
      where.status = q.status as
        | "PENDING"
        | "RUNNING"
        | "WAITING"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
        | "ESCALATED";
    }
    if (q.patientId) where.patientId = q.patientId;
    const skip = (q.page - 1) * q.pageSize;
    const [total, rows] = await Promise.all([
      prisma.whatsAppFlowExecution.count({ where }),
      prisma.whatsAppFlowExecution.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip,
        take: q.pageSize,
        include: { flow: { select: { name: true } } },
      }),
    ]);
    return ok(c, {
      items: rows.map(serializeExecution),
      page: q.page,
      pageSize: q.pageSize,
      total,
    });
  })

  .get("/executions/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_LOGS);
    const { id } = c.req.valid("param");
    const row = await prisma.whatsAppFlowExecution.findFirst({
      where: { id, clinicId: tenant.clinicId },
      include: {
        flow: { select: { name: true } },
        steps: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) throw new HttpError(404, "NOT_FOUND", "Execution not found");
    return ok(c, serializeExecution(row));
  })

  .post("/executions/:id/cancel", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const row = await prisma.whatsAppFlowExecution.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!row) throw new HttpError(404, "NOT_FOUND", "Execution not found");
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(row.status)) {
      throw new HttpError(422, "NOT_CANCELLABLE", "Execution is already finished.");
    }
    const updated = await prisma.whatsAppFlowExecution.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date() },
      include: { flow: { select: { name: true } }, steps: true },
    });
    await audit(tenant, "whatsapp.execution.cancel", "WhatsAppFlowExecution", id);
    return ok(c, serializeExecution(updated));
  })

  .post("/executions/:id/retry", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const ran = await retryFailedExecution(tenant, id);
    const withSteps = await prisma.whatsAppFlowExecution.findFirst({
      where: { id: ran.id, clinicId: tenant.clinicId },
      include: { flow: { select: { name: true } }, steps: { orderBy: { createdAt: "asc" } } },
    });
    await audit(tenant, "whatsapp.execution.retry", "WhatsAppFlowExecution", id);
    return ok(c, serializeExecution(withSteps!));
  })

  .get("/knowledge", validate("query", listKbQuery), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const q = c.req.valid("query");
    const where: Prisma.WhatsAppKnowledgeArticleWhereInput = { clinicId: tenant.clinicId };
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;
    if (q.specialty) where.specialty = q.specialty;
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { content: { contains: q.q, mode: "insensitive" } },
        { keywords: { contains: q.q, mode: "insensitive" } },
      ];
    }
    const rows = await prisma.whatsAppKnowledgeArticle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { updatedBy: { select: { id: true, name: true } } },
      take: 200,
    });
    return ok(
      c,
      rows.map((r) => serializeKb(r)),
    );
  })

  .post("/knowledge", validate("json", createKbSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_KB);
    const body = c.req.valid("json");
    const row = await prisma.whatsAppKnowledgeArticle.create({
      data: {
        clinicId: tenant.clinicId,
        title: body.title,
        category: body.category,
        content: body.content,
        keywords: body.keywords ?? null,
        specialty: body.specialty ?? null,
        status: body.status,
        updatedById: tenant.userId,
      },
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    await audit(tenant, "whatsapp.kb.create", "WhatsAppKnowledgeArticle", row.id, {
      status: row.status,
    });
    return ok(c, serializeKb(row), 201);
  })

  .patch("/knowledge/:id", validate("param", idParam), validate("json", updateKbSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_KB);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.whatsAppKnowledgeArticle.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Article not found");
    const row = await prisma.whatsAppKnowledgeArticle.update({
      where: { id },
      data: {
        ...(body.title === undefined ? {} : { title: body.title }),
        ...(body.category === undefined ? {} : { category: body.category }),
        ...(body.content === undefined ? {} : { content: body.content }),
        ...(body.keywords === undefined ? {} : { keywords: body.keywords }),
        ...(body.specialty === undefined ? {} : { specialty: body.specialty }),
        ...(body.status === undefined ? {} : { status: body.status }),
        updatedById: tenant.userId,
      },
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    await audit(tenant, "whatsapp.kb.update", "WhatsAppKnowledgeArticle", row.id, {
      status: row.status,
    });
    return ok(c, serializeKb(row));
  })

  .delete("/knowledge/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_KB);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppKnowledgeArticle.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Article not found");
    await prisma.whatsAppKnowledgeArticle.delete({ where: { id } });
    await audit(tenant, "whatsapp.kb.delete", "WhatsAppKnowledgeArticle", id);
    return ok(c, { deleted: true });
  })

  .get("/variables", async (c) => {
    requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    return ok(c, {
      groups: [
        {
          label: "Patient",
          items: [
            { key: "patient_name", path: "{{patient.fullName}}" },
            { key: "patient_first_name", path: "{{patient.firstName}}" },
            { key: "patient_phone", path: "{{patient.phone}}" },
          ],
        },
        {
          label: "Clinic",
          items: [
            { key: "clinic_name", path: "{{clinic.name}}" },
            { key: "clinic_phone", path: "{{clinic.phone}}" },
          ],
        },
        {
          label: "Appointment",
          items: [
            { key: "appointment_date", path: "{{appointment.date}}" },
            { key: "appointment_time", path: "{{appointment.time}}" },
            { key: "appointment_type", path: "{{appointment.type}}" },
            { key: "doctor_name", path: "{{doctor.name}}" },
          ],
        },
        {
          label: "Care",
          items: [
            { key: "care_task_title", path: "{{careTask.title}}" },
            { key: "care_plan_name", path: "{{carePlan.name}}" },
          ],
        },
        {
          label: "Pharmacy",
          items: [
            { key: "medicine_name", path: "{{medicine.name}}" },
            { key: "medicine_dosage", path: "{{medicine.dosage}}" },
            { key: "medicine_time", path: "{{medicine.time}}" },
          ],
        },
        {
          label: "Payment",
          items: [
            { key: "payment_amount", path: "{{payment.amount}}" },
            { key: "payment_due_date", path: "{{payment.dueDate}}" },
          ],
        },
      ],
      note: "Keys map to template parameters. Values come from SmrkoMed records at send time — never invented.",
    });
  })

  .get("/settings/communication", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const settings = await getClinicCommSettings(tenant.clinicId);
    return ok(c, settings);
  })

  .patch("/settings/communication", validate("json", updateCommSettingsSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const body = c.req.valid("json");
    const row = await prisma.whatsAppClinicSettings.upsert({
      where: { clinicId: tenant.clinicId },
      create: {
        clinicId: tenant.clinicId,
        ...(body.workingHours === undefined
          ? {}
          : { workingHours: body.workingHours as Prisma.InputJsonValue }),
        ...(body.timezone === undefined ? {} : { timezone: body.timezone }),
        ...(body.maxMessagesPerDay === undefined ? {} : { maxMessagesPerDay: body.maxMessagesPerDay }),
        ...(body.minDelayMinutes === undefined ? {} : { minDelayMinutes: body.minDelayMinutes }),
        ...(body.requireConsentGranted === undefined
          ? {}
          : { requireConsentGranted: body.requireConsentGranted }),
        ...(body.urgentBypassHours === undefined ? {} : { urgentBypassHours: body.urgentBypassHours }),
      },
      update: {
        ...(body.workingHours === undefined
          ? {}
          : { workingHours: body.workingHours as Prisma.InputJsonValue }),
        ...(body.timezone === undefined ? {} : { timezone: body.timezone }),
        ...(body.maxMessagesPerDay === undefined ? {} : { maxMessagesPerDay: body.maxMessagesPerDay }),
        ...(body.minDelayMinutes === undefined ? {} : { minDelayMinutes: body.minDelayMinutes }),
        ...(body.requireConsentGranted === undefined
          ? {}
          : { requireConsentGranted: body.requireConsentGranted }),
        ...(body.urgentBypassHours === undefined ? {} : { urgentBypassHours: body.urgentBypassHours }),
      },
    });
    await audit(tenant, "whatsapp.settings.communication", "WhatsAppClinicSettings", row.id);
    return ok(c, await getClinicCommSettings(tenant.clinicId));
  })

  .get("/template-usage", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const flows = await prisma.whatsAppFlow.findMany({
      where: { clinicId: tenant.clinicId, isLibrary: false },
      select: { id: true, name: true, status: true, definition: true },
    });
    const usage: Record<
      string,
      { templateName: string; flows: Array<{ id: string; name: string; status: string; active: boolean }> }
    > = {};
    for (const flow of flows) {
      const def = parseDefinition(flow.definition);
      for (const node of def.nodes) {
        if (node.type !== "SEND_TEMPLATE") continue;
        const name = String(node.config["templateName"] ?? "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!usage[key]) usage[key] = { templateName: name, flows: [] };
        if (!usage[key].flows.some((f) => f.id === flow.id)) {
          usage[key].flows.push({
            id: flow.id,
            name: flow.name,
            status: flow.status,
            active: flow.status === "ACTIVE",
          });
        }
      }
    }
    return ok(c, { items: Object.values(usage) });
  })

  .post("/broadcast/preview", validate("json", broadcastPreviewSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const body = c.req.valid("json");
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        clinicId: tenant.clinicId,
        name: body.templateName,
        language: body.language,
        status: "APPROVED",
      },
    });
    if (!template) {
      throw new HttpError(
        422,
        "TEMPLATE_NOT_APPROVED",
        "Broadcast requires a Meta-approved template for this clinic and language.",
      );
    }
    const preview = await previewSegment(tenant, {
      ...(body.filters.status ? { status: body.filters.status } : {}),
      ...(body.filters.inactiveDays != null ? { inactiveDays: body.filters.inactiveDays } : {}),
      whatsappConsent: "GRANTED",
    });
    return ok(c, {
      template: { id: template.id, name: template.name, language: template.language, status: template.status },
      audienceCount: preview.audienceCount,
      consentEligibleCount: preview.consentEligibleCount,
      skippedCount: preview.skippedCount,
      exclusionCounts: preview.exclusionCounts,
      estimatedMessages: preview.consentEligibleCount,
      sendEnabled: false,
      note: "Use Campaigns to confirm and send. Preview never sends.",
    });
  })

  .get("/inbox", validate("query", inboxListQuery), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const q = c.req.valid("query");
    return ok(
      c,
      await listInboxConversations(tenant, {
        filter: q.filter,
        ...(q.q ? { q: q.q } : {}),
      }),
    );
  })

  .get("/inbox/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    return ok(c, await getInboxConversationDetail(tenant, c.req.valid("param").id));
  })

  .get("/inbox/:id/context", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const detail = await getInboxConversationDetail(tenant, c.req.valid("param").id);
    if (!detail.patient?.id) {
      return ok(c, { patient: null, note: "Unmatched contact — no patient context." });
    }
    return ok(c, await getPatientInboxContext(tenant, detail.patient.id));
  })

  .post("/inbox/:id/assign", validate("param", idParam), validate("json", assignConversationSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    if (body.assignedStaffId) {
      await assertClinicStaff(tenant.clinicId, body.assignedStaffId);
    }
    const updated = await prisma.conversation.update({
      where: { id },
      data: { assignedStaffId: body.assignedStaffId },
      include: { assignedStaff: { select: { id: true, name: true, initials: true, title: true } } },
    });
    await audit(tenant, "whatsapp.conversation.assign", "Conversation", id, {
      assignedStaffId: body.assignedStaffId,
    });
    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId: tenant.clinicId,
      conversationId: updated.id,
      patch: {
        assignedStaffId: updated.assignedStaffId,
        assignedStaff: updated.assignedStaff,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
    if (body.assignedStaffId) {
      await prisma.notification.create({
        data: {
          clinicId: tenant.clinicId,
          userId: body.assignedStaffId,
          title: "WhatsApp conversation assigned",
          body: "A conversation was assigned to you.",
          href: "/whatsapp/inbox",
        },
      });
    }
    return ok(c, { id: updated.id, assignedStaff: updated.assignedStaff });
  })

  .patch("/inbox/:id/status", validate("param", idParam), validate("json", conversationStatusSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.priority ? { priority: body.priority } : {}),
      },
    });
    await audit(tenant, "whatsapp.conversation.status", "Conversation", id, {
      status: body.status,
      ...(body.priority ? { priority: body.priority } : {}),
    });
    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId: tenant.clinicId,
      conversationId: updated.id,
      patch: {
        status: updated.status,
        priority: updated.priority,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
    return ok(c, { id: updated.id, status: updated.status, priority: updated.priority });
  })

  .post("/inbox/:id/typing", validate("param", idParam), validate("json", typingSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const { id } = c.req.valid("param");
    const { typing } = c.req.valid("json");
    realtimeBus.publish({
      type: typing ? "TYPING_STARTED" : "TYPING_STOPPED",
      clinicId: tenant.clinicId,
      conversationId: id,
      userId: tenant.userId,
      userName: tenant.clinicName ? `${tenant.clinicName} Staff` : "Staff",
    });
    return ok(c, { received: true });
  })

  .post("/inbox/:id/reply", validate("param", idParam), validate("json", sessionTextSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await sendWhatsAppSessionText(tenant, { conversationId: id, body: body.body });
    return ok(c, result, 201);
  })

  .post("/inbox/:id/follow-up", validate("param", idParam), validate("json", followUpFromInboxSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    if (body.assigneeId) await assertClinicStaff(tenant.clinicId, body.assigneeId);
    const task = await prisma.careTask.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: conversation.coupleId,
        title: body.title,
        description: body.notes ?? `Follow-up from WhatsApp conversation ${id}`,
        category: "WHATSAPP_FOLLOWUP",
        status: "WAITING",
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        createdById: tenant.userId,
        ...(body.assigneeId ? { assignments: { create: { userId: body.assigneeId } } } : {}),
      },
    });
    await audit(tenant, "whatsapp.inbox.followup", "CareTask", task.id, { conversationId: id });
    return ok(c, { careTaskId: task.id }, 201);
  })

  .post("/inbox/:id/resume-automation", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        automationPausedAt: null,
        handoffAt: null,
        handoffReason: null,
        status: conversation.status === "HUMAN_HANDOFF" ? "OPEN" : conversation.status,
      },
    });
    await audit(tenant, "whatsapp.automation.resume", "Conversation", id, {});
    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId: tenant.clinicId,
      conversationId: updated.id,
      patch: {
        automationPaused: false,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
    return ok(c, {
      id: updated.id,
      automationPausedAt: null,
      status: updated.status,
      note: "Automation pause cleared. New triggers may run; cancelled executions are not restarted.",
    });
  })

  .post("/inbox/:id/pause-automation", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    let paused = 0;
    if (conversation.patientId) {
      const result = await prisma.whatsAppFlowExecution.updateMany({
        where: {
          clinicId: tenant.clinicId,
          patientId: conversation.patientId,
          status: { in: ["WAITING", "RUNNING", "PENDING"] },
        },
        data: { status: "CANCELLED", error: "Paused by staff", completedAt: new Date() },
      });
      paused = result.count;
    }
    const updated = await prisma.conversation.update({
      where: { id },
      data: { automationPausedAt: new Date() },
    });
    await audit(tenant, "whatsapp.automation.pause", "Conversation", id, { paused });
    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId: tenant.clinicId,
      conversationId: updated.id,
      patch: {
        automationPaused: true,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
    return ok(c, { pausedExecutions: paused });
  })

  .get("/patients/:id/timeline", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    return ok(c, await buildCommunicationTimeline(tenant, c.req.valid("param").id));
  })

  .get("/consent", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const rows = await prisma.consent.findMany({
      where: { clinicId: tenant.clinicId, channel: "WHATSAPP", consentType: "WHATSAPP_COMMUNICATION" },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    return ok(
      c,
      rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
        phone: r.patient.phone,
        status: r.status,
        source: r.source,
        consentedAt: r.consentedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  })

  .post("/consent", validate("json", updateConsentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const body = c.req.valid("json");
    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: tenant.clinicId },
    });
    if (!patient) throw new HttpError(404, "NOT_FOUND", "Patient not found");
    const row = await prisma.consent.upsert({
      where: {
        patientId_consentType_channel: {
          patientId: body.patientId,
          consentType: "WHATSAPP_COMMUNICATION",
          channel: "WHATSAPP",
        },
      },
      create: {
        clinicId: tenant.clinicId,
        patientId: body.patientId,
        consentType: "WHATSAPP_COMMUNICATION",
        channel: "WHATSAPP",
        status: body.status,
        source: body.source ?? "staff_record",
        consentedAt: body.status === "GRANTED" ? new Date() : null,
      },
      update: {
        status: body.status,
        source: body.source ?? "staff_record",
        ...(body.status === "GRANTED" ? { consentedAt: new Date() } : {}),
      },
    });
    await audit(tenant, "whatsapp.consent.update", "Consent", row.id, { status: body.status });
    return ok(c, { id: row.id, status: row.status });
  })

  .get("/patients/:id/preferences", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const patientId = c.req.valid("param").id;
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: tenant.clinicId } });
    if (!patient) throw new HttpError(404, "NOT_FOUND", "Patient not found");
    const prefs = await prisma.communicationPreference.findUnique({ where: { patientId } });
    return ok(
      c,
      prefs ?? {
        patientId,
        whatsappEnabled: true,
        smsEnabled: false,
        emailEnabled: false,
        phoneEnabled: true,
        marketingOptIn: false,
        appointmentReminders: true,
        careReminders: true,
        paymentReminders: true,
        pharmacyReminders: true,
      },
    );
  })

  .patch("/patients/:id/preferences", validate("param", idParam), validate("json", updatePreferencesSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const patientId = c.req.valid("param").id;
    const body = c.req.valid("json");
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId: tenant.clinicId } });
    if (!patient) throw new HttpError(404, "NOT_FOUND", "Patient not found");
    const row = await prisma.communicationPreference.upsert({
      where: { patientId },
      create: {
        clinicId: tenant.clinicId,
        patientId,
        ...(body.whatsappEnabled !== undefined ? { whatsappEnabled: body.whatsappEnabled } : {}),
        ...(body.smsEnabled !== undefined ? { smsEnabled: body.smsEnabled } : {}),
        ...(body.emailEnabled !== undefined ? { emailEnabled: body.emailEnabled } : {}),
        ...(body.phoneEnabled !== undefined ? { phoneEnabled: body.phoneEnabled } : {}),
        ...(body.marketingOptIn !== undefined ? { marketingOptIn: body.marketingOptIn } : {}),
        ...(body.appointmentReminders !== undefined
          ? { appointmentReminders: body.appointmentReminders }
          : {}),
        ...(body.careReminders !== undefined ? { careReminders: body.careReminders } : {}),
        ...(body.paymentReminders !== undefined ? { paymentReminders: body.paymentReminders } : {}),
        ...(body.pharmacyReminders !== undefined ? { pharmacyReminders: body.pharmacyReminders } : {}),
      },
      update: {
        ...(body.whatsappEnabled !== undefined ? { whatsappEnabled: body.whatsappEnabled } : {}),
        ...(body.smsEnabled !== undefined ? { smsEnabled: body.smsEnabled } : {}),
        ...(body.emailEnabled !== undefined ? { emailEnabled: body.emailEnabled } : {}),
        ...(body.phoneEnabled !== undefined ? { phoneEnabled: body.phoneEnabled } : {}),
        ...(body.marketingOptIn !== undefined ? { marketingOptIn: body.marketingOptIn } : {}),
        ...(body.appointmentReminders !== undefined
          ? { appointmentReminders: body.appointmentReminders }
          : {}),
        ...(body.careReminders !== undefined ? { careReminders: body.careReminders } : {}),
        ...(body.paymentReminders !== undefined ? { paymentReminders: body.paymentReminders } : {}),
        ...(body.pharmacyReminders !== undefined ? { pharmacyReminders: body.pharmacyReminders } : {}),
      },
    });
    await audit(tenant, "whatsapp.preferences.update", "CommunicationPreference", row.id, {});
    return ok(c, row);
  })

  .post("/segments/preview", validate("json", segmentPreviewSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const filters = c.req.valid("json").filters;
    return ok(c, await previewSegment(tenant, filters ?? {}));
  })

  .get("/campaigns", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const rows = await prisma.whatsAppCampaign.findMany({
      where: { clinicId: tenant.clinicId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return ok(
      c,
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        templateName: r.templateName,
        templateLanguage: r.templateLanguage,
        scheduledAt: r.scheduledAt?.toISOString() ?? null,
        audienceCount: r.audienceCount,
        eligibleCount: r.eligibleCount,
        excludedCount: r.excludedCount,
        sentCount: r.sentCount,
        failedCount: r.failedCount,
        skippedCount: r.skippedCount,
        createdByName: r.createdBy?.name ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  })

  .post("/campaigns", validate("json", createCampaignSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const body = c.req.valid("json");
    const campaign = await createCampaign(tenant, {
      name: body.name,
      templateName: body.templateName,
      templateLanguage: body.templateLanguage,
      ...(body.filters ? { filters: body.filters } : {}),
      scheduledAt: body.scheduledAt ?? null,
    });
    await materializeCampaignRecipients(tenant, campaign.id);
    await audit(tenant, "whatsapp.campaign.create", "WhatsAppCampaign", campaign.id, {
      templateName: body.templateName,
    });
    const fresh = await prisma.whatsAppCampaign.findFirstOrThrow({ where: { id: campaign.id } });
    return ok(c, fresh, 201);
  })

  .post("/campaigns/:id/confirm", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const result = await confirmAndStartCampaign(tenant, id);
    await audit(tenant, "whatsapp.campaign.confirm", "WhatsAppCampaign", id, { status: result.status });
    return ok(c, result);
  })

  .post("/campaigns/:id/cancel", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppCampaign.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Campaign not found");
    const updated = await prisma.whatsAppCampaign.update({
      where: { id },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    await audit(tenant, "whatsapp.campaign.cancel", "WhatsAppCampaign", id, {});
    return ok(c, updated);
  })

  .post("/campaigns/:id/process", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    return ok(c, await processCampaignBatch(tenant, c.req.valid("param").id, 40));
  })

  .get("/analytics/detailed", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const clinicId = tenant.clinicId;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [
      sent,
      delivered,
      read,
      failed,
      inbound,
      openConv,
      resolved,
      handoff,
      escalated,
      consentGranted,
      consentTotal,
      staffAssigned,
    ] = await Promise.all([
      prisma.message.count({
        where: { direction: "OUTBOUND", createdAt: { gte: since }, conversation: { clinicId, channel: "WHATSAPP" } },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "DELIVERED",
          createdAt: { gte: since },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "READ",
          createdAt: { gte: since },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: {
          direction: "OUTBOUND",
          status: "FAILED",
          createdAt: { gte: since },
          conversation: { clinicId, channel: "WHATSAPP" },
        },
      }),
      prisma.message.count({
        where: { direction: "INBOUND", createdAt: { gte: since }, conversation: { clinicId, channel: "WHATSAPP" } },
      }),
      prisma.conversation.count({
        where: { clinicId, channel: "WHATSAPP", status: { notIn: ["CLOSED", "RESOLVED"] } },
      }),
      prisma.conversation.count({
        where: { clinicId, channel: "WHATSAPP", status: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: since } },
      }),
      prisma.conversation.count({ where: { clinicId, channel: "WHATSAPP", status: "HUMAN_HANDOFF" } }),
      prisma.conversation.count({ where: { clinicId, channel: "WHATSAPP", status: "ESCALATED" } }),
      prisma.consent.count({
        where: { clinicId, channel: "WHATSAPP", consentType: "WHATSAPP_COMMUNICATION", status: "GRANTED" },
      }),
      prisma.consent.count({
        where: { clinicId, channel: "WHATSAPP", consentType: "WHATSAPP_COMMUNICATION" },
      }),
      prisma.conversation.groupBy({
        by: ["assignedStaffId"],
        where: { clinicId, channel: "WHATSAPP", assignedStaffId: { not: null } },
        _count: true,
      }),
    ]);

    const staffIds = staffAssigned.map((s) => s.assignedStaffId).filter(Boolean) as string[];
    const users = staffIds.length
      ? await prisma.user.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const flowStats = await prisma.whatsAppFlowExecution.groupBy({
      by: ["status"],
      where: { clinicId, startedAt: { gte: since } },
      _count: true,
    });

    const hasData = sent + inbound + openConv + consentTotal > 0;

    return ok(c, {
      rangeDays: 30,
      hasData,
      emptyMessage: hasData ? null : "Not enough data yet.",
      messages: { sent, delivered, read, failed, replies: inbound },
      conversations: { open: openConv, resolved, humanHandoff: handoff, escalated },
      consentRate: consentTotal === 0 ? null : Math.round((consentGranted / consentTotal) * 1000) / 10,
      automationByStatus: Object.fromEntries(flowStats.map((f) => [f.status, f._count])),
      staffWorkload: staffAssigned.map((s) => ({
        staffId: s.assignedStaffId,
        name: s.assignedStaffId ? nameById[s.assignedStaffId] ?? "Staff" : "Unassigned",
        assignedConversations: s._count,
      })),
    });
  })

  .get("/staff", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const memberships = await prisma.clinicMembership.findMany({
      where: { clinicId: tenant.clinicId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true, initials: true, title: true } }, role: true },
      take: 100,
    });
    return ok(
      c,
      memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        initials: m.user.initials,
        title: m.user.title,
        role: m.role.key,
      })),
    );
  })

  .post(
    "/conversations/:id/takeover",
    validate("param", idParam),
    validate("json", takeoverSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
      const { id: conversationId } = c.req.valid("param");
      const body = c.req.valid("json");
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, clinicId: tenant.clinicId, channel: "WHATSAPP" },
      });
      if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");

      let paused = 0;
      if (body.pauseAutomation && conversation.patientId) {
        const result = await prisma.whatsAppFlowExecution.updateMany({
          where: {
            clinicId: tenant.clinicId,
            patientId: conversation.patientId,
            status: { in: ["WAITING", "RUNNING", "PENDING"] },
          },
          data: {
            status: "CANCELLED",
            error: "Paused — human takeover",
            completedAt: new Date(),
          },
        });
        paused = result.count;
      }

      const assigneeId = body.assignToUserId ?? tenant.userId;
      if (body.assignToUserId) await assertClinicStaff(tenant.clinicId, body.assignToUserId);

      const updated = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: "HUMAN_HANDOFF",
          handoffAt: new Date(),
          handoffReason: body.reason,
          automationPausedAt: body.pauseAutomation ? new Date() : conversation.automationPausedAt,
          assignedStaffId: assigneeId,
        },
      });

      realtimeBus.publish({
        type: "AI_HANDOFF",
        clinicId: tenant.clinicId,
        conversationId,
        reason: body.reason,
      });

      realtimeBus.publish({
        type: "CONVERSATION_UPDATED",
        clinicId: tenant.clinicId,
        conversationId,
        patch: {
          status: "HUMAN_HANDOFF",
          assignedStaffId: assigneeId,
          automationPaused: body.pauseAutomation ? true : Boolean(conversation.automationPausedAt),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });

      const task = await prisma.careTask.create({
        data: {
          clinicId: tenant.clinicId,
          coupleId: conversation.coupleId,
          title: "WhatsApp human handoff",
          description: [
            `Reason: ${body.reason}`,
            body.notes ? `Notes: ${body.notes}` : null,
            `Conversation: ${conversationId}`,
            paused ? `Paused ${paused} automation execution(s).` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          category: "WHATSAPP_HANDOFF",
          status: "WAITING",
          priority:
            body.reason === "CARE_LOOP_PRIORITY" || body.reason === "MEDICAL_QUESTION" || body.reason === "HIGH_PRIORITY"
              ? "HIGH"
              : "NORMAL",
          createdById: tenant.userId,
          assignments: { create: { userId: assigneeId } },
        },
      });

      await prisma.notification.create({
        data: {
          clinicId: tenant.clinicId,
          userId: assigneeId,
          title: "WhatsApp human handoff",
          body: `Reason: ${body.reason}`,
          href: "/whatsapp/inbox",
        },
      });

      await audit(tenant, "whatsapp.handoff.takeover", "Conversation", conversationId, {
        reason: body.reason,
        paused,
        taskId: task.id,
      });

      return ok(c, {
        conversationId,
        mode: "HUMAN",
        status: "HUMAN_HANDOFF",
        pausedExecutions: paused,
        careTaskId: task.id,
        assignedStaffId: assigneeId,
        note: "Patient-facing automation paused for this patient (if requested). Staff owns the thread.",
      });
    },
  )

  /** Production worker endpoint — worker secret = all clinics; session = this clinic only. */
  .post("/internal/resume-due", async (c) => {
    const secret = env.whatsappWorkerSecret;
    const header = c.req.header("x-whatsapp-worker-secret") ?? c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (secret && header === secret) {
      const results = await resumeDueExecutions(25);
      return ok(c, { resumed: results.length, results, auth: "worker_secret", clinicScoped: false });
    }
    if (!secret && env.nodeEnv === "production") {
      throw new HttpError(
        503,
        "WORKER_SECRET_REQUIRED",
        "Set WHATSAPP_WORKER_SECRET for production worker ticks, or use a session to resume this clinic only.",
      );
    }
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const results = await resumeDueExecutions(25, tenant.clinicId);
    return ok(c, {
      resumed: results.length,
      results,
      auth: "session",
      clinicScoped: true,
      note: "Session ticks are clinic-scoped. Prefer WHATSAPP_WORKER_SECRET for platform-wide cron.",
    });
  })

  .post("/internal/tick", async (c) => {
    const secret = env.whatsappWorkerSecret;
    const header = c.req.header("x-whatsapp-worker-secret") ?? c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (secret && header === secret) {
      return ok(c, await processAutomationTick());
    }
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    return ok(c, await processAutomationTick({ clinicId: tenant.clinicId }));
  });
