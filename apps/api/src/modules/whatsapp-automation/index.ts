import { Hono } from "hono";
import { z } from "zod";
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
  inboxSendTemplateSchema,
  inboxSendDocumentSchema,
  messageIdParam,
} from "./schemas";
import { realtimeBus } from "../realtime/bus";
import { getClinicCommSettings } from "./safety";
import { parseDefinition, validateFlowDefinition } from "./validate";
import { validateSendTemplateNodes } from "./template-node-config";
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
import { sendWhatsAppSessionText, sendWhatsAppInteractiveButtons, sendWhatsAppInteractiveCtaUrl } from "../../integrations/providers/whatsapp/messaging";
import { normalizeWhatsAppPhone, maskPhone } from "../../integrations/providers/whatsapp/phone";
import {
  retryWhatsAppSessionMedia,
  sendPatientDocumentOverWhatsApp,
  sendWhatsAppSessionMedia,
} from "../../integrations/providers/whatsapp/outbound-media";
import { testSendWhatsAppTemplate } from "../../integrations/providers/whatsapp/template-ops";
import { mediaStorageProvider, getExtensionForMime, sanitizeFilename } from "../media/storage";
import { validateOutboundMediaFile, type OutboundMediaKind } from "../media/outbound-validation";
import { IntegrationError } from "../../integrations/core/errors";
import { requireAnyPermission } from "../../lib/authz";

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
    steps: (row.steps ?? []).map((s) => {
      const started = s.startedAt?.getTime() ?? null;
      const completed = s.completedAt?.getTime() ?? null;
      return {
        id: s.id,
        nodeId: s.nodeId,
        nodeType: s.nodeType,
        status: s.status,
        input: s.input,
        output: s.output,
        error: s.error,
        startedAt: s.startedAt?.toISOString() ?? null,
        completedAt: s.completedAt?.toISOString() ?? null,
        durationMs:
          started != null && completed != null && completed >= started ? completed - started : null,
      };
    }),
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
      settingsRow,
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
      prisma.whatsAppClinicSettings.findUnique({
        where: { clinicId },
        select: { aiAutoReplyEnabled: true },
      }),
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
      aiAutoReplyEnabled: settingsRow?.aiAutoReplyEnabled ?? true,
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
      const def = parseDefinition(body.definition);
      if (body.status === "ACTIVE") {
        const issues = [
          ...validateFlowDefinition(def),
          ...(await validateSendTemplateNodes(tenant.clinicId, def)),
        ];
        if (issues.length) {
          throw new HttpError(422, "INVALID_FLOW", issues.map((i) => i.message).join("; "));
        }
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
    const templateIssues = await validateSendTemplateNodes(
      tenant.clinicId,
      parseDefinition(existing.definition),
    );
    const allIssues = [...issues, ...templateIssues];
    if (allIssues.length) {
      throw new HttpError(422, "INVALID_FLOW", allIssues.map((i) => i.message).join(" "));
    }
    const account = await prisma.whatsAppAccount.findFirst({
      where: { clinicId: tenant.clinicId, isActive: true },
    });
    const def = parseDefinition(existing.definition);
    const needsWa = def.nodes.some(
      (n) => n.type === "SEND_TEMPLATE" || n.type === "SEND_TEXT" || n.type === "SEND_MEDIA",
    );
    if (needsWa && !account) {
      throw new HttpError(
        409,
        "WHATSAPP_NOT_CONNECTED",
        "Connect WhatsApp to activate live messaging flows.",
      );
    }
    // Template APPROVED + variable mapping already enforced by validateSendTemplateNodes
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

  .delete("/flows/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({
      where: { id, clinicId: tenant.clinicId },
      include: { _count: { select: { executions: true } } },
    });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    if (existing.isLibrary) {
      throw new HttpError(422, "SYSTEM_TEMPLATE", "System templates cannot be deleted.");
    }
    if (existing.status === "ACTIVE") {
      throw new HttpError(422, "ACTIVE_FLOW", "An active flow cannot be permanently deleted. Pause or archive it first.");
    }
    if (existing._count.executions > 0) {
      const row = await prisma.whatsAppFlow.update({
        where: { id },
        data: { status: "ARCHIVED" },
        include: { createdBy: { select: { id: true, name: true } }, _count: { select: { executions: true } } },
      });
      await audit(tenant, "whatsapp.flow.archive", "WhatsAppFlow", row.id, {
        reason: "Archived during delete because flow has execution history",
      });
      return ok(c, {
        deleted: false,
        archived: true,
        message: "Flow has execution history and was archived instead of permanently deleted.",
        flow: serializeFlow(row),
      });
    }
    await prisma.whatsAppFlow.delete({ where: { id } });
    await audit(tenant, "whatsapp.flow.delete", "WhatsAppFlow", id);
    return ok(c, { deleted: true, id, message: "Flow deleted successfully." });
  })

  .post("/flows/:id/validate", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");
    const def = parseDefinition(existing.definition);
    const issues = [
      ...validateFlowDefinition(def),
      ...(await validateSendTemplateNodes(tenant.clinicId, def)),
    ];
    return ok(c, { issues });
  })

  .post("/flows/:id/test", validate("param", idParam), validate("json", testFlowSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_FLOWS);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.whatsAppFlow.findFirst({ where: { id, clinicId: tenant.clinicId } });
    if (!existing) throw new HttpError(404, "NOT_FOUND", "Flow not found");

    const mode = body.mode ?? "SIMULATION";

    // Resolve event cleanly
    const rawEvent = (body.event || body.simulateEvent || "none").toLowerCase().trim();
    let normalizedEvent: "none" | "incoming_whatsapp" | "appointment" | "care_loop" = "none";

    if (["none", ""].includes(rawEvent)) {
      normalizedEvent = "none";
    } else if (["incoming_whatsapp", "incoming", "whatsapp", "inbound"].includes(rawEvent)) {
      normalizedEvent = "incoming_whatsapp";
    } else if (
      ["appointment", "appointment_request", "appointment_booking", "booking"].includes(rawEvent)
    ) {
      normalizedEvent = "appointment";
    } else if (["care_loop", "care_task", "care"].includes(rawEvent)) {
      normalizedEvent = "care_loop";
    } else {
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        `Invalid test request: event "${body.event || body.simulateEvent}" is invalid. Expected APPOINTMENT_REQUEST, INCOMING_WHATSAPP, CARE_LOOP, or NONE.`,
      );
    }

    if (mode === "LIVE_WHATSAPP") {
      if (!body.confirmed) {
        throw new HttpError(
          422,
          "CONFIRMATION_REQUIRED",
          "Live test requires explicit safety confirmation (confirmed: true) before sending a real WhatsApp message.",
        );
      }

      const activeAccount = await prisma.whatsAppAccount.findFirst({
        where: { clinicId: tenant.clinicId, isActive: true },
      });
      const direct = Boolean(process.env["WHATSAPP_PHONE_NUMBER_ID"] && process.env["WHATSAPP_ACCESS_TOKEN"]);
      if (!activeAccount && !direct) {
        throw new HttpError(
          422,
          "WHATSAPP_NOT_CONFIGURED",
          "No active WhatsApp Business Account is connected for this clinic. Please configure Meta WhatsApp settings before running Live WhatsApp tests.",
        );
      }

      let rawPhone = (body.recipientPhone || body.phoneNumber)?.trim();
      let resolvedPatientId = body.patientId;

      if (resolvedPatientId) {
        const p = await prisma.patient.findFirst({
          where: { id: resolvedPatientId, clinicId: tenant.clinicId },
          select: { phone: true, id: true, firstName: true, lastName: true },
        });
        if (!p) {
          throw new HttpError(404, "PATIENT_NOT_FOUND", "Selected test patient was not found for this clinic.");
        }
        if (!rawPhone && p.phone) {
          rawPhone = p.phone;
        } else if (!rawPhone && !p.phone) {
          throw new HttpError(422, "PATIENT_PHONE_MISSING", "This patient does not have a WhatsApp number configured.");
        }
      }

      if (!rawPhone) {
        throw new HttpError(
          422,
          "PATIENT_PHONE_MISSING",
          "A valid WhatsApp number or test patient with a phone number is required for Live WhatsApp testing.",
        );
      }

      const normalizedPhone = normalizeWhatsAppPhone(rawPhone);
      if (!normalizedPhone || normalizedPhone.length < 10) {
        throw new HttpError(422, "INVALID_PHONE", "Enter a valid WhatsApp number (e.g. +91 86607 17328).");
      }

      let conversation = body.conversationId
        ? await prisma.conversation.findFirst({
            where: { id: body.conversationId, clinicId: tenant.clinicId },
          })
        : null;

      if (!conversation && resolvedPatientId) {
        conversation = await prisma.conversation.findFirst({
          where: {
            clinicId: tenant.clinicId,
            patientId: resolvedPatientId,
            channel: "WHATSAPP",
          },
          orderBy: { updatedAt: "desc" },
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.findFirst({
          where: {
            clinicId: tenant.clinicId,
            channel: "WHATSAPP",
            OR: [
              { contactPhone: normalizedPhone },
              { contactPhone: `+${normalizedPhone}` },
            ],
          },
          orderBy: { updatedAt: "desc" },
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            clinicId: tenant.clinicId,
            ...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
            contactPhone: normalizedPhone,
            unmatched: !resolvedPatientId,
            channel: "WHATSAPP",
            status: "OPEN",
          },
        });
      } else if (resolvedPatientId && !conversation.patientId) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { patientId: resolvedPatientId, unmatched: false },
        });
      }

      const { execution } = await startFlowExecution({
        tenant,
        flowId: id,
        triggerEventId: `live_test_${Date.now()}`,
        ...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
        ...(body.coupleId ? { coupleId: body.coupleId } : {}),
        conversationId: conversation.id,
        vars: {
          recipient_phone: normalizedPhone,
          patient_phone: normalizedPhone,
          is_live_test: "true",
          clinic_id: tenant.clinicId,
          clinic_name: tenant.clinicName,
          ...(body.vars ?? {}),
        },
        simulation: false,
      });

      const withSteps = await prisma.whatsAppFlowExecution.findFirst({
        where: { id: execution.id, clinicId: tenant.clinicId },
        include: { flow: { select: { name: true } }, steps: { orderBy: { createdAt: "asc" } } },
      });

      const maskedPhone = maskPhone(normalizedPhone) ?? normalizedPhone.replace(/(\d{2,3})\d+(\d{4})/, "$1••••••$2");
      await audit(tenant, "whatsapp.flow.live_test", "WhatsAppFlow", id, {
        executionId: execution.id,
        recipientPhone: maskedPhone,
      });

      return ok(c, {
        mode: "LIVE_WHATSAPP",
        label: "LIVE WHATSAPP TEST — REAL MESSAGE SENT",
        recipientPhone: maskedPhone,
        conversationId: conversation.id,
        note: `Live WhatsApp message dispatched to ${maskedPhone}.`,
        execution: serializeExecution(withSteps!),
      });
    }

    const simEvent = normalizedEvent;
    const eventVars: Record<string, string> =
      simEvent === "incoming_whatsapp"
        ? {
            message_text: "TEST inbound reply",
            message_content: "TEST inbound reply",
            message_type: "text",
            patient_replied: "true",
            inbound_at: new Date().toISOString(),
            clinic_id: tenant.clinicId,
            clinic_name: tenant.clinicName,
          }
        : simEvent === "appointment"
          ? {
              appointment_id: "test_appt",
              appointment_date: new Date().toISOString().slice(0, 10),
              appointment_time: "10:30",
              appointment_status: "CONFIRMED",
              doctor_name: "Test Doctor",
              clinic_name: tenant.clinicName,
            }
          : simEvent === "care_loop"
            ? {
                care_task_id: "test_task",
                care_task_title: "TEST Care Task",
                care_task_status: "WAITING",
                journey_stage: "Stimulation",
                care_plan_id: "test_plan",
                couple_id: body.coupleId ?? "",
              }
            : {};

    const { execution } = await startFlowExecution({
      tenant,
      flowId: id,
      triggerEventId: `test_${simEvent}_${Date.now()}`,
      ...(body.patientId ? { patientId: body.patientId } : {}),
      ...(body.coupleId ? { coupleId: body.coupleId } : {}),
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      vars: { ...eventVars, ...(body.vars ?? {}) },
      simulation: true,
    });

    const withSteps = await prisma.whatsAppFlowExecution.findFirst({
      where: { id: execution.id, clinicId: tenant.clinicId },
      include: { flow: { select: { name: true } }, steps: { orderBy: { createdAt: "asc" } } },
    });
    await audit(tenant, "whatsapp.flow.test", "WhatsAppFlow", id, {
      executionId: execution.id,
      simulateEvent: simEvent,
    });
    return ok(c, {
      mode: "SIMULATION",
      label: "TEST MODE — NO MESSAGE WILL BE SENT",
      simulateEvent: simEvent,
      note: `TEST simulation (${simEvent}). No WhatsApp messages were sent. WAIT / WAIT_FOR_REPLY skipped instantly.`,
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

  /** Toggle AI auto-reply — available to anyone who can send WhatsApp (not SETTINGS-only). */
  .patch("/settings/ai-auto-reply", validate("json", z.object({ enabled: z.boolean() })), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const body = c.req.valid("json");
    if (process.env["WHATSAPP_AI_AUTO_REPLY"] === "0" && body.enabled) {
      throw new HttpError(403, "AI_DISABLED_BY_ENV", "AI auto-reply is disabled on this server.");
    }
    const row = await prisma.whatsAppClinicSettings.upsert({
      where: { clinicId: tenant.clinicId },
      create: { clinicId: tenant.clinicId, aiAutoReplyEnabled: body.enabled },
      update: { aiAutoReplyEnabled: body.enabled },
    });
    await audit(tenant, "whatsapp.settings.ai_auto_reply", "WhatsAppClinicSettings", row.id, {
      enabled: body.enabled,
    });
    return ok(c, { aiAutoReplyEnabled: row.aiAutoReplyEnabled });
  })

  .patch("/settings/communication", validate("json", updateCommSettingsSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const body = c.req.valid("json");
    const row = await prisma.whatsAppClinicSettings.upsert({
      where: { clinicId: tenant.clinicId },
      create: {
        clinicId: tenant.clinicId,
        aiAutoReplyEnabled: body.aiAutoReplyEnabled ?? true,
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
        ...(body.aiAutoReplyEnabled === undefined ? {} : { aiAutoReplyEnabled: body.aiAutoReplyEnabled }),
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

  .get("/inbox/media/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);
    const mediaId = c.req.valid("param").id;
    let media = await prisma.whatsAppMedia.findUnique({
      where: { id: mediaId },
    });
    if (!media) {
      throw new HttpError(404, "NOT_FOUND", "Media record not found");
    }
    if (media.clinicId !== tenant.clinicId) {
      throw new HttpError(403, "FORBIDDEN", "Access to media for foreign clinic denied");
    }
    let isReady = Boolean(media.storageKey) && (await mediaStorageProvider.exists(media.storageKey!));
    if (!isReady && media.providerMediaId) {
      try {
        const { downloadAndStoreWhatsAppMedia } = await import("../media/service");
        await downloadAndStoreWhatsAppMedia(tenant.clinicId, media.id);
        const refreshed = await prisma.whatsAppMedia.findUnique({ where: { id: mediaId } });
        if (refreshed?.storageKey && (await mediaStorageProvider.exists(refreshed.storageKey))) {
          media = refreshed;
          isReady = true;
        }
      } catch {
        // Fall through to 404 below
      }
    }
    if (!isReady || !media.storageKey) {
      throw new HttpError(404, "NOT_FOUND", "Media content is not ready or failed to download");
    }
    const buffer = await mediaStorageProvider.getBuffer(media.storageKey);
    const filename = media.filename || `media_${media.id}${getExtensionForMime(media.mimeType || "")}`;
    const disposition = media.type === "DOCUMENT"
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

    const rangeHeader = c.req.header("range");
    const totalSize = buffer.length;

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] ?? "0", 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        return new Response("Requested Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const chunk = buffer.subarray(start, end + 1);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Type": media.mimeType || "application/octet-stream",
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunk.length.toString(),
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "application/octet-stream",
        "Content-Length": totalSize.toString(),
        "Accept-Ranges": "bytes",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
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

    // If the message couldn't be dispatched directly to Meta (no local token),
    // trigger the Railway production worker to sweep and send it immediately.
    if (typeof result.providerMessageId === "string" && result.providerMessageId.startsWith("pending_meta_")) {
      const { triggerRemoteOutboundDispatch } = await import("./outbound-bridge");
      void triggerRemoteOutboundDispatch().catch(() => undefined);
    }

    return ok(c, result, 201);
  })

  .post(
    "/couples/:coupleId/reply",
    validate("param", z.object({ coupleId: z.string().min(1) })),
    validate("json", sessionTextSchema),
    async (c) => {
      const tenant = requireAnyPermission(c, [PERMISSIONS.WHATSAPP_SEND, PERMISSIONS.PATIENTS_READ]);
      const { coupleId } = c.req.valid("param");
      const { body } = c.req.valid("json");

      const couple = await prisma.couple.findFirst({
        where: { id: coupleId, clinicId: tenant.clinicId },
        include: {
          primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          partnerPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
      if (!couple) throw new HttpError(404, "NOT_FOUND", "Couple not found");

      const targets: Array<{ patientId: string; name: string; phone: string }> = [];
      if (couple.primaryPatient && couple.primaryPatient.phone) {
        targets.push({
          patientId: couple.primaryPatient.id,
          name: `${couple.primaryPatient.firstName || ""} ${couple.primaryPatient.lastName || ""}`.trim() || "Primary Patient",
          phone: couple.primaryPatient.phone,
        });
      }
      if (couple.partnerPatient && couple.partnerPatient.phone) {
        targets.push({
          patientId: couple.partnerPatient.id,
          name: `${couple.partnerPatient.firstName || ""} ${couple.partnerPatient.lastName || ""}`.trim() || "Partner",
          phone: couple.partnerPatient.phone,
        });
      }

      if (targets.length === 0) {
        throw new HttpError(422, "NO_PHONE_NUMBERS", "Neither primary nor partner patient has a valid phone number.");
      }

      const results: Array<{
        patientId: string;
        name: string;
        phone: string;
        conversationId: string;
        messageId?: string;
        status?: string;
      }> = [];

      for (const target of targets) {
        const normPhone = normalizeWhatsAppPhone(target.phone);
        let conv = await prisma.conversation.findFirst({
          where: {
            clinicId: tenant.clinicId,
            channel: "WHATSAPP",
            OR: [
              { patientId: target.patientId },
              ...(normPhone ? [{ contactPhone: normPhone }, { contactPhone: `+${normPhone}` }] : []),
            ],
          },
          orderBy: { updatedAt: "desc" },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              clinicId: tenant.clinicId,
              patientId: target.patientId,
              coupleId: couple.id,
              contactPhone: normPhone || target.phone,
              unmatched: false,
              channel: "WHATSAPP",
              status: "OPEN",
            },
          });
        } else if (!conv.coupleId || !conv.patientId) {
          conv = await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              coupleId: couple.id,
              patientId: conv.patientId || target.patientId,
              unmatched: false,
            },
          });
        }

        try {
          const sendRes = await sendWhatsAppSessionText(tenant, {
            conversationId: conv.id,
            body,
          });
          results.push({
            patientId: target.patientId,
            name: target.name,
            phone: target.phone,
            conversationId: conv.id,
            messageId: sendRes.id,
            status: sendRes.status,
          });
        } catch (sendErr) {
          console.error(`[Couple Reply] Failed to send to ${target.name} (${target.phone}):`, sendErr);
          results.push({
            patientId: target.patientId,
            name: target.name,
            phone: target.phone,
            conversationId: conv.id,
            status: "FAILED",
          });
        }
      }

      const { triggerRemoteOutboundDispatch } = await import("./outbound-bridge");
      void triggerRemoteOutboundDispatch().catch(() => undefined);

      return ok(
        c,
        {
          ok: true,
          coupleId: couple.id,
          sentCount: results.filter((r) => r.status !== "FAILED").length,
          totalTargets: targets.length,
          results,
        },
        201,
      );
    },
  )

  .post(
    "/couples/:coupleId/media",
    validate("param", z.object({ coupleId: z.string().min(1) })),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
      const { coupleId } = c.req.valid("param");

      const couple = await prisma.couple.findFirst({
        where: { id: coupleId, clinicId: tenant.clinicId },
        include: {
          primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          partnerPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
      if (!couple) throw new HttpError(404, "NOT_FOUND", "Couple not found");

      const body = await c.req.parseBody({ all: true });
      const file = body["file"];
      if (!(file instanceof File)) {
        throw new HttpError(422, "INVALID_FILE", "A file upload is required.");
      }

      const captionRaw = body["caption"];
      const caption = typeof captionRaw === "string" ? captionRaw : undefined;
      const kindRaw = body["kind"];
      const kindHint =
        typeof kindRaw === "string" && ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"].includes(kindRaw)
          ? (kindRaw as OutboundMediaKind)
          : undefined;

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "application/octet-stream";
      const filename = sanitizeFilename(file.name) || `upload${getExtensionForMime(mimeType)}`;

      const validated = validateOutboundMediaFile({
        mimeType,
        sizeBytes: buffer.length,
        filename,
        ...(kindHint ? { kind: kindHint } : {}),
      });
      if (!validated.ok) {
        throw new HttpError(422, "INVALID_FILE", validated.reason);
      }

      const targets: Array<{ patientId: string; name: string; phone: string }> = [];
      if (couple.primaryPatient?.phone) {
        targets.push({
          patientId: couple.primaryPatientId,
          name: `${couple.primaryPatient.firstName || ""} ${couple.primaryPatient.lastName || ""}`.trim() || "Primary",
          phone: couple.primaryPatient.phone,
        });
      }
      if (couple.partnerPatient?.phone && couple.partnerPatientId) {
        targets.push({
          patientId: couple.partnerPatientId,
          name: `${couple.partnerPatient.firstName || ""} ${couple.partnerPatient.lastName || ""}`.trim() || "Partner",
          phone: couple.partnerPatient.phone,
        });
      }

      if (targets.length === 0) {
        throw new HttpError(422, "NO_VALID_PHONE", "Neither partner has a registered phone number.");
      }

      const results: any[] = [];
      for (const target of targets) {
        const normPhone = normalizeWhatsAppPhone(target.phone);
        let conv = await prisma.conversation.findFirst({
          where: {
            clinicId: tenant.clinicId,
            channel: "WHATSAPP",
            OR: [
              { patientId: target.patientId },
              ...(normPhone ? [{ contactPhone: normPhone }, { contactPhone: `+${normPhone}` }] : []),
            ],
          },
          orderBy: { updatedAt: "desc" },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              clinicId: tenant.clinicId,
              patientId: target.patientId,
              coupleId: couple.id,
              contactPhone: normPhone || target.phone,
              unmatched: false,
              channel: "WHATSAPP",
              status: "OPEN",
            },
          });
        }

        try {
          const res = await sendWhatsAppSessionMedia(tenant, {
            conversationId: conv.id,
            buffer,
            mimeType: validated.mimeType,
            filename,
            ...(caption !== undefined ? { caption } : {}),
            kind: validated.kind,
          });
          results.push({
            patientId: target.patientId,
            name: target.name,
            conversationId: conv.id,
            mediaId: res.media?.id,
            status: "SENT",
          });
        } catch (sendErr) {
          console.error(`[Couple Media] Failed to send media to ${target.name}:`, sendErr);
          results.push({
            patientId: target.patientId,
            name: target.name,
            conversationId: conv.id,
            status: "FAILED",
          });
        }
      }

      return ok(
        c,
        {
          ok: true,
          coupleId: couple.id,
          sentCount: results.filter((r) => r.status !== "FAILED").length,
          results,
        },
        201,
      );
    },
  )

  .get(
    "/couples/:coupleId/messages",
    validate("param", z.object({ coupleId: z.string().min(1) })),
    async (c) => {
      const tenant = requireAnyPermission(c, [PERMISSIONS.WHATSAPP_VIEW, PERMISSIONS.PATIENTS_READ]);
      const { coupleId } = c.req.valid("param");

      const couple = await prisma.couple.findFirst({
        where: { id: coupleId, clinicId: tenant.clinicId },
        include: {
          primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          partnerPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
      if (!couple) throw new HttpError(404, "NOT_FOUND", "Couple not found");

      const patientIds = [couple.primaryPatientId, couple.partnerPatientId].filter(Boolean) as string[];

      const convs = await prisma.conversation.findMany({
        where: {
          clinicId: tenant.clinicId,
          channel: "WHATSAPP",
          OR: [{ coupleId: couple.id }, { patientId: { in: patientIds } }],
        },
        select: {
          id: true,
          patientId: true,
          contactPhone: true,
        },
      });

      if (convs.length === 0) {
        return ok(c, { coupleId: couple.id, messages: [] });
      }

      const convMap = new Map<string, (typeof convs)[number]>();
      convs.forEach((cv) => convMap.set(cv.id, cv));

      const rawMessages = await prisma.message.findMany({
        where: {
          conversationId: { in: convs.map((cv) => cv.id) },
        },
        orderBy: { createdAt: "desc" },
        include: {
          whatsappMedia: true,
        },
        take: 300,
      });
      rawMessages.reverse();

      const primaryName = couple.primaryPatient
        ? `${couple.primaryPatient.firstName || ""} ${couple.primaryPatient.lastName || ""}`.trim() || "Primary Patient"
        : "Primary Patient";
      const partnerName = couple.partnerPatient
        ? `${couple.partnerPatient.firstName || ""} ${couple.partnerPatient.lastName || ""}`.trim() || "Partner"
        : "Partner";

      const messages = rawMessages.map((m) => {
        const conv = convMap.get(m.conversationId);
        const isPrimary = conv?.patientId === couple.primaryPatientId;
        const isPartner = conv?.patientId === couple.partnerPatientId;

        let senderName = "Staff";
        let partnerRole: "PRIMARY" | "PARTNER" | "STAFF" = "STAFF";

        if (m.direction === "INBOUND") {
          if (isPrimary) {
            senderName = primaryName;
            partnerRole = "PRIMARY";
          } else if (isPartner) {
            senderName = partnerName;
            partnerRole = "PARTNER";
          } else {
            senderName = conv?.contactPhone || "Patient";
            partnerRole = "PRIMARY";
          }
        } else {
          senderName =
            m.senderType === "AI" ? "✦ Smrko AI" : tenant.clinicName ? `${tenant.clinicName} Staff` : "Staff";
          partnerRole = "STAFF";
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          direction: m.direction,
          sender: m.direction === "INBOUND" ? "patient" : "staff",
          senderType: m.senderType,
          senderName,
          partnerRole,
          isAi: m.senderType === "AI",
          content: m.content,
          text: m.content,
          messageType: m.messageType,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
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
                url: `/api/v1/whatsapp-automation/inbox/media/${m.whatsappMedia.id}`,
              }
            : null,
        };
      });

      return ok(c, {
        coupleId: couple.id,
        primaryName,
        partnerName,
        messages,
      });
    },
  )

  .post(
    "/send-to-recipient",
    validate(
      "json",
      z.object({
        patientId: z.string().optional(),
        coupleId: z.string().optional(),
        phone: z.string().optional(),
        body: z.string().min(1).max(4096),
        buttons: z
          .array(
            z.object({
              id: z.string().min(1).max(256),
              title: z.string().min(1).max(20),
            }),
          )
          .max(3)
          .optional(),
        ctaUrl: z
          .object({
            displayText: z.string().min(1).max(20),
            url: z.string().url(),
          })
          .optional(),
        header: z.string().max(60).optional(),
        footer: z.string().max(60).optional(),
      }),
    ),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
      const reqBody = c.req.valid("json");

      let resolvedPatientId = reqBody.patientId;
      let rawPhone = reqBody.phone;

      if (resolvedPatientId && !rawPhone) {
        const pt = await prisma.patient.findFirst({
          where: { id: resolvedPatientId, clinicId: tenant.clinicId },
          select: { phone: true, whatsappNumber: true },
        });
        rawPhone = pt?.phone || pt?.whatsappNumber || undefined;
      }

      if (!resolvedPatientId && !rawPhone) {
        throw new HttpError(422, "MISSING_RECIPIENT", "Either patientId or phone is required.");
      }

      const normPhone = rawPhone ? normalizeWhatsAppPhone(rawPhone) : "";

      let conv = await prisma.conversation.findFirst({
        where: {
          clinicId: tenant.clinicId,
          channel: "WHATSAPP",
          OR: [
            ...(resolvedPatientId ? [{ patientId: resolvedPatientId }] : []),
            ...(normPhone ? [{ contactPhone: normPhone }, { contactPhone: `+${normPhone}` }] : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            clinicId: tenant.clinicId,
            patientId: resolvedPatientId ?? null,
            coupleId: reqBody.coupleId ?? null,
            contactPhone: normPhone || rawPhone || "",
            unmatched: !resolvedPatientId,
            channel: "WHATSAPP",
            status: "OPEN",
          },
        });
      } else if ((resolvedPatientId && !conv.patientId) || (reqBody.coupleId && !conv.coupleId)) {
        conv = await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            ...(resolvedPatientId ? { patientId: resolvedPatientId, unmatched: false } : {}),
            ...(reqBody.coupleId ? { coupleId: reqBody.coupleId } : {}),
          },
        });
      }

      let result;
      // 1. Try sending interactive CTA URL if available and https
      if (reqBody.ctaUrl && reqBody.ctaUrl.url.startsWith("https://")) {
        try {
          result = await sendWhatsAppInteractiveCtaUrl(tenant, {
            conversationId: conv.id,
            body: reqBody.body,
            displayText: reqBody.ctaUrl.displayText,
            url: reqBody.ctaUrl.url,
            ...(reqBody.header ? { header: { type: "text" as const, text: reqBody.header } } : {}),
            ...(reqBody.footer ? { footer: reqBody.footer } : {}),
            senderType: "STAFF",
          });
        } catch (ctaErr) {
          console.warn("[send-to-recipient] interactive CTA URL failed, falling back to buttons/text:", ctaErr);
        }
      }

      // 2. Try sending interactive Quick Reply buttons
      if (!result && reqBody.buttons && reqBody.buttons.length > 0) {
        try {
          result = await sendWhatsAppInteractiveButtons(tenant, {
            conversationId: conv.id,
            body: reqBody.body,
            buttons: reqBody.buttons,
            ...(reqBody.header ? { header: { type: "text" as const, text: reqBody.header } } : {}),
            ...(reqBody.footer ? { footer: reqBody.footer } : {}),
            senderType: "STAFF",
          });
        } catch (interactiveErr) {
          console.warn("[send-to-recipient] interactive buttons failed, falling back to text:", interactiveErr);
          result = await sendWhatsAppSessionText(tenant, {
            conversationId: conv.id,
            body: reqBody.body,
          });
        }
      } else if (!result) {
        result = await sendWhatsAppSessionText(tenant, {
          conversationId: conv.id,
          body: reqBody.body,
        });
      }

      if (typeof result.providerMessageId === "string" && result.providerMessageId.startsWith("pending_meta_")) {
        const { triggerRemoteOutboundDispatch } = await import("./outbound-bridge");
        void triggerRemoteOutboundDispatch().catch(() => undefined);
      }

      return ok(
        c,
        {
          ...result,
          conversationId: conv.id,
        },
        201,
      );
    },
  )

  .get("/inbox/:id/patient-documents", validate("param", idParam), async (c) => {
    const tenant = requireAnyPermission(c, [PERMISSIONS.WHATSAPP_SEND, PERMISSIONS.PATIENTS_READ]);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");

    const where: Prisma.DocumentWhereInput = { clinicId: tenant.clinicId };
    if (conversation.patientId || conversation.coupleId) {
      where.OR = [
        ...(conversation.patientId ? [{ patientId: conversation.patientId }] : []),
        ...(conversation.coupleId ? [{ coupleId: conversation.coupleId }] : []),
      ];
    } else {
      return ok(c, { items: [], note: "No linked patient — upload a file instead." });
    }

    const docs = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { category: { select: { name: true } } },
    });

    const items = await Promise.all(
      docs.map(async (d) => {
        let sendable = false;
        if (d.storageKey) {
          try {
            sendable = await mediaStorageProvider.exists(d.storageKey);
          } catch {
            sendable = false;
          }
        }
        return {
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
          status: d.status,
          category: d.category?.name ?? null,
          sendable,
          note: sendable
            ? null
            : "Metadata only — file not stored. Use Upload Document to send a file.",
          updatedAt: d.updatedAt.toISOString(),
        };
      }),
    );

    return ok(c, { items });
  })

  .post("/inbox/:id/media", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
      select: { id: true },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");

    const body = await c.req.parseBody({ all: true });
    const file = body["file"];
    if (!(file instanceof File)) {
      throw new HttpError(422, "INVALID_FILE", "A file upload is required.");
    }

    const captionRaw = body["caption"];
    const caption = typeof captionRaw === "string" ? captionRaw : undefined;
    const kindRaw = body["kind"];
    const kindHint =
      typeof kindRaw === "string" && ["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"].includes(kindRaw)
        ? (kindRaw as OutboundMediaKind)
        : undefined;
    const isVoice = body["isVoice"] === "true" || body["isVoice"] === "1";
    const durationRaw = body["durationSeconds"];
    const durationSeconds =
      typeof durationRaw === "string" && durationRaw !== "" ? Number(durationRaw) : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const filename = sanitizeFilename(file.name) || `upload${getExtensionForMime(mimeType)}`;

    const validated = validateOutboundMediaFile({
      mimeType,
      sizeBytes: buffer.length,
      filename,
      ...(kindHint ? { kind: kindHint } : {}),
      ...(isVoice ? { isVoice: true } : {}),
    });
    if (!validated.ok) {
      throw new HttpError(422, "INVALID_FILE", validated.reason);
    }

    try {
      const result = await sendWhatsAppSessionMedia(tenant, {
        conversationId: id,
        buffer,
        mimeType: validated.mimeType,
        filename,
        ...(caption !== undefined ? { caption } : {}),
        kind: validated.kind,
        ...(isVoice ? { isVoice: true } : {}),
        ...(durationSeconds !== undefined && Number.isFinite(durationSeconds)
          ? { durationSeconds }
          : {}),
      });

      if (typeof result.providerMessageId === "string" && result.providerMessageId.startsWith("pending_meta_")) {
        const { triggerRemoteOutboundDispatch } = await import("./outbound-bridge");
        void triggerRemoteOutboundDispatch().catch(() => undefined);
      }

      return ok(c, result, 201);
    } catch (err) {
      if (err instanceof IntegrationError) {
        throw new HttpError(err.httpStatus, err.code, err.message);
      }
      throw err;
    }
  })

  .post(
    "/inbox/:id/send-document",
    validate("param", idParam),
    validate("json", inboxSendDocumentSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      try {
        const result = await sendPatientDocumentOverWhatsApp(tenant, {
          conversationId: id,
          documentId: body.documentId,
          ...(body.caption !== undefined ? { caption: body.caption } : {}),
        });
        return ok(c, result, 201);
      } catch (err) {
        if (err instanceof IntegrationError) {
          throw new HttpError(err.httpStatus, err.code, err.message);
        }
        throw err;
      }
    },
  )

  .post(
    "/inbox/:id/send-template",
    validate("param", idParam),
    validate("json", inboxSendTemplateSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const conversation = await prisma.conversation.findFirst({
        where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
      });
      if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
      try {
        const result = await testSendWhatsAppTemplate(tenant, {
          templateId: body.templateId,
          conversationId: id,
          ...(conversation.patientId ? { patientId: conversation.patientId } : {}),
          ...(body.overrides ? { overrides: body.overrides } : {}),
          ...(body.parameters ? { parameters: body.parameters } : {}),
        });
        return ok(c, result, 201);
      } catch (err) {
        if (err instanceof IntegrationError) {
          throw new HttpError(err.httpStatus, err.code, err.message);
        }
        throw err;
      }
    },
  )

  .post(
    "/inbox/:id/messages/:messageId/retry",
    validate("param", messageIdParam),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
      const { id, messageId } = c.req.valid("param");
      try {
        const result = await retryWhatsAppSessionMedia(tenant, {
          conversationId: id,
          messageId,
        });
        return ok(c, result, 201);
      } catch (err) {
        if (err instanceof IntegrationError) {
          throw new HttpError(err.httpStatus, err.code, err.message);
        }
        throw err;
      }
    },
  )

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

  .post("/inbox/:id/ai/reply", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const body = (await c.req.json().catch(() => ({}))) as {
      message?: string;
      mode?: "draft" | "send";
      promptHint?: string;
      prompt?: string;
      includeContext?: boolean;
    };

    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
      include: {
        patient: {
          include: {
            primaryCouples: {
              include: {
                carePlans: {
                  where: { status: "ACTIVE" },
                  take: 1,
                  orderBy: { createdAt: "desc" },
                },
                appointments: {
                  where: { startsAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
                  take: 2,
                  orderBy: { startsAt: "asc" },
                },
              },
            },
            partnerCouples: {
              include: {
                carePlans: {
                  where: { status: "ACTIVE" },
                  take: 1,
                  orderBy: { createdAt: "desc" },
                },
                appointments: {
                  where: { startsAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
                  take: 2,
                  orderBy: { startsAt: "asc" },
                },
              },
            },
          },
        },
        couple: {
          include: {
            carePlans: {
              where: { status: "ACTIVE" },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
            appointments: {
              where: { startsAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
              take: 2,
              orderBy: { startsAt: "asc" },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 40,
        },
      },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");

    const promptText = (body.prompt || body.promptHint || body.message || "").trim();
    const isSummarize = /\b(summariz|summary|recap|overview|catch\s*me\s*up)\b/i.test(promptText);

    // Patient & Clinical context
    const patientName = conversation.patient
      ? `${conversation.patient.firstName} ${conversation.patient.lastName || ""}`.trim()
      : conversation.contactPhone || "Patient";
    const patientFirstName = conversation.patient?.firstName || "there";
    const couple =
      conversation.couple ||
      conversation.patient?.primaryCouples?.[0] ||
      conversation.patient?.partnerCouples?.[0];
    const activeStage = couple?.carePlans?.[0]?.currentStageName || "Consultation & Evaluation";
    const upcomingAppt = couple?.appointments?.[0];
    const apptTimeStr = upcomingAppt
      ? new Date(upcomingAppt.startsAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : null;
    const doctorName = upcomingAppt?.doctorName || "Dr. Jismon J";
    const clinicName = tenant.clinicName || "Hospex Fertility Clinic";

    const allMsgs = conversation.messages || [];
    const inboundMsgs = allMsgs.filter((m: { direction: string }) => m.direction === "INBOUND");
    const outboundMsgs = allMsgs.filter((m: { direction: string }) => m.direction === "OUTBOUND");
    const lastInbound = inboundMsgs[inboundMsgs.length - 1];
    const lastInboundText = lastInbound?.content?.trim() || "";

    let finalOutput = "";

    // If staff explicitly asks to summarize conversation
    if (isSummarize) {
      let sentiment = "NEUTRAL";
      let intent = "GENERAL_INQUIRY";
      const lowerRecent = inboundMsgs.slice(-3).map((m: { content: string }) => m.content.toLowerCase()).join(" ");

      if (lowerRecent.includes("pain") || lowerRecent.includes("bleeding") || lowerRecent.includes("cramp") || lowerRecent.includes("emergency")) {
        sentiment = "DISTRESSED";
        intent = "CLINICAL_SYMPTOMS";
      } else if (lowerRecent.includes("thank") || lowerRecent.includes("done") || lowerRecent.includes("taken") || lowerRecent.includes("confirmed")) {
        sentiment = "POSITIVE";
        intent = "TREATMENT_COMPLIANCE";
      } else if (lowerRecent.includes("reschedule") || lowerRecent.includes("time") || lowerRecent.includes("change")) {
        sentiment = "NEUTRAL";
        intent = "RESCHEDULE_REQUEST";
      } else if (lowerRecent.includes("cost") || lowerRecent.includes("price") || lowerRecent.includes("fee") || lowerRecent.includes("package")) {
        sentiment = "NEUTRAL";
        intent = "FINANCIAL_PACKAGE_QUERY";
      } else if (lowerRecent.includes("appointment") || lowerRecent.includes("book") || lowerRecent.includes("slot")) {
        sentiment = "NEUTRAL";
        intent = "APPOINTMENT_BOOKING";
      }

      const mainQuery = lastInboundText
        ? `"${lastInboundText}"`
        : "Patient connected on WhatsApp; awaiting specific question.";

      const recommendedAction =
        sentiment === "DISTRESSED"
          ? "Immediate nurse/doctor clinical triage and callback"
          : intent === "APPOINTMENT_BOOKING" || intent === "RESCHEDULE_REQUEST"
          ? "Send open consultation slots and confirm appointment"
          : "Send warm acknowledgement and follow-up guidance";

      const suggestedReply =
        sentiment === "DISTRESSED"
          ? `Hello ${patientFirstName}, we understand you are experiencing discomfort. Our clinical care team has been immediately alerted and a nurse will call you right away.`
          : apptTimeStr
          ? `Hello ${patientFirstName}, thank you for contacting ${clinicName}. We look forward to your upcoming appointment with ${doctorName} on ${apptTimeStr}. Please let us know if you have any questions before your visit!`
          : `Hello ${patientFirstName}, thank you for reaching out to ${clinicName}. We are reviewing your record and our care team is available to assist you with your consultation and treatment questions.`;

      // Try OpenAI for enhanced summary if key is available
      const openaiKey = process.env["OPENAI_API_KEY"]?.trim();
      if (openaiKey && allMsgs.length > 0) {
        try {
          const formattedHistory = allMsgs.slice(-15).map((m: { direction: string; content: string }) => `${m.direction === "INBOUND" ? "Patient" : "Staff"}: ${m.content}`).join("\n");
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini",
              messages: [
                {
                  role: "system",
                  content: "You are Smrko AI, clinical care assistant at Hospex Fertility Clinic. Provide a concise, structured WhatsApp conversation summary for clinic staff. Always include a recommended action and a suggested patient reply in quotes at the end so staff can click 'Use in reply'.",
                },
                {
                  role: "user",
                  content: `Summarize this conversation concisely:
Patient: ${patientName} (${conversation.contactPhone || ""})
Stage: ${activeStage}
Next Appointment: ${apptTimeStr || "None"}
Message History:
${formattedHistory}

Output format:
📋 **Patient Context**: [1 line summary]
💬 **Chat History**: [1-2 sentences on recent messages]
❓ **Main Query**: [Core patient need]
⚡ **Recommended Action**: [Next operational step]
💡 **Suggested Reply**:
"[Draft reply message here]"`,
                },
              ],
              max_tokens: 350,
            }),
          });
          clearTimeout(timer);
          if (aiRes.ok) {
            const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const aiText = aiJson.choices?.[0]?.message?.content?.trim();
            if (aiText) finalOutput = aiText;
          }
        } catch {
          // Fallback to deterministic summary below
        }
      }

      if (!finalOutput) {
        finalOutput =
          `📋 **Patient Context**: ${patientName} (${conversation.contactPhone || ""}) · Stage: ${activeStage}${apptTimeStr ? ` · Next Appointment: ${apptTimeStr}` : ""}\n\n` +
          `💬 **Chat History**: ${allMsgs.length} messages (${inboundMsgs.length} from patient, ${outboundMsgs.length} from clinic). Intent: ${intent} (${sentiment}).\n\n` +
          `❓ **Main Query**: ${mainQuery}\n\n` +
          `⚡ **Recommended Action**: ${recommendedAction}.\n\n` +
          `💡 **Suggested Reply**:\n"${suggestedReply}"`;
      }
    } else {
      // Draft reply generation (e.g. Appointment Reminder, Pre-visit Instructions, or custom staff prompt)
      const pLower = promptText.toLowerCase();

      // Check if OpenAI key available
      const openaiKey = process.env["OPENAI_API_KEY"]?.trim();
      if (openaiKey) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);
          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: process.env["OPENAI_MODEL"]?.trim() || "gpt-4.1-mini",
              messages: [
                {
                  role: "system",
                  content: "You are Smrko AI, clinical assistant at Hospex Fertility Clinic. Draft a professional, empathetic WhatsApp message to the patient per staff instruction. Wrap the exact reply text inside quotation marks so staff can easily insert it with 'Use in reply'.",
                },
                {
                  role: "user",
                  content: `Staff instruction: ${promptText || "Draft a warm follow-up response"}
Patient: ${patientName}
Stage: ${activeStage}
Appointment: ${apptTimeStr ? `${apptTimeStr} with ${doctorName}` : "None scheduled"}
Last patient message: "${lastInboundText || "Hello"}"

Draft the reply:`,
                },
              ],
              max_tokens: 300,
            }),
          });
          clearTimeout(timer);
          if (aiRes.ok) {
            const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const aiText = aiJson.choices?.[0]?.message?.content?.trim();
            if (aiText) finalOutput = aiText;
          }
        } catch {
          // Fall through to deterministic draft
        }
      }

      if (!finalOutput) {
        if (pLower.includes("reminder") || pLower.includes("appointment")) {
          const apptNotice = apptTimeStr ? `on ${apptTimeStr} with ${doctorName}` : "as scheduled";
          finalOutput =
            `Suggested WhatsApp Appointment Reminder for ${patientName}:\n\n` +
            `"Hello ${patientFirstName}, this is a gentle reminder from ${clinicName} regarding your upcoming consultation ${apptNotice}. Please arrive 10 minutes prior with your prior records. Reply to this message if you have any questions or need directions!"`;
        } else if (pLower.includes("instruction") || pLower.includes("pre-visit") || pLower.includes("fasting")) {
          finalOutput =
            `Suggested Pre-visit Instructions for ${patientName}:\n\n` +
            `"Hello ${patientFirstName}, ahead of your visit to ${clinicName}, please remember to carry your ID, relevant medical reports, and previous scan records. If morning blood tests (like AMH or hormone profile) were requested, please fast for 8 hours prior. Contact our care team if you need any assistance!"`;
        } else {
          finalOutput =
            `Suggested draft for ${patientName}:\n\n` +
            `"Hello ${patientFirstName}, thank you for contacting ${clinicName}. We have received your query regarding ${lastInboundText ? `"${lastInboundText}"` : "your care"} and our clinical team will assist you shortly. Please let us know if you need anything in the meantime!"`;
        }
      }
    }

    // If staff specified mode === "send", send message to patient via Meta/session
    let sentMessageId: string | undefined;
    if (body.mode === "send") {
      try {
        const { sendWhatsAppAiSessionText } = await import("../../integrations/providers/whatsapp/messaging");
        const match = finalOutput.match(/"([^"]+)"/);
        const textToSend = match ? match[1]! : finalOutput;
        const sent = await sendWhatsAppAiSessionText(tenant, {
          conversationId: id,
          body: textToSend,
        });
        sentMessageId = sent.id;
      } catch {
        // Best-effort send
      }
    }

    await audit(tenant, "whatsapp.ai.staff_reply", "Conversation", id, {
      mode: body.mode ?? "draft",
      isSummarize,
    });

    return ok(c, {
      reply: finalOutput,
      text: finalOutput,
      summary: finalOutput,
      draft: true,
      conversationId: id,
      ...(sentMessageId ? { messageId: sentMessageId } : {}),
    });
  })

  .post("/inbox/:id/ai/resume", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    const { resumeWhatsAppAi } = await import("../whatsapp-ai/handoff");
    await resumeWhatsAppAi(tenant, id);
    await audit(tenant, "whatsapp.ai.resume", "Conversation", id, {});
    return ok(c, { id, aiPausedAt: null, note: "AI resumed by staff — explicit action required" });
  })

  .post("/inbox/:id/ai/pause", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SEND);
    const { id } = c.req.valid("param");
    const conversation = await prisma.conversation.findFirst({
      where: { id, clinicId: tenant.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found");
    const { pauseWhatsAppAi } = await import("../whatsapp-ai/handoff");
    await pauseWhatsAppAi(tenant, id, "STAFF_PAUSED_AI");
    await audit(tenant, "whatsapp.ai.pause", "Conversation", id, {});
    return ok(c, { id, aiPaused: true });
  })

  .post("/knowledge/seed-demo", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_SETTINGS);
    const { seedDemoKnowledgePacks } = await import("../whatsapp-ai/seed-kb");
    const result = await seedDemoKnowledgePacks(tenant.clinicId, tenant.userId);
    await audit(tenant, "whatsapp.knowledge.seed_demo", "WhatsAppKnowledgeArticle", tenant.clinicId, result);
    return ok(c, result, 201);
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
          aiPausedAt: new Date(),
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
