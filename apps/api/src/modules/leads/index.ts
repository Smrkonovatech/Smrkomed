import { Hono } from "hono";
import {
  PERMISSIONS,
  createLeadForTenant,
  findDuplicateLeads,
  prisma,
  roleHasPermission,
  type TenantContext,
} from "@smrkomed/database";
import type { Lead } from "@prisma/client";

import { audit } from "../../lib/audit";
import { requireAnyPermission, requirePermission } from "../../lib/authz";
import { forbidden, HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireOrgOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import { sendWhatsAppTemplate } from "../../integrations/providers/whatsapp/messaging";
import type { AppEnv } from "../../types";
import { recordLeadActivity } from "../crm/activity";
import { normalizeLeadSource, isLifecycleStatus, resolveLegacyStatusAsStage } from "../crm/constants";
import { convertLead } from "../crm/conversion";
import { assignLead, changeLeadStage, roundRobinAssignee } from "../crm/pipeline";
import { listLeads, leadInclude, type LeadListQuery } from "../crm/query";
import { recomputeLeadScore } from "../crm/scoring";
import { paginationMeta, serializeLead, serializeLeadActivity } from "../crm/serializer";
import {
  activityCreateSchema,
  assignLeadSchema,
  convertLeadSchema,
  createLeadSchema,
  idParam,
  importPreviewSchema,
  listLeadQuery,
  lostLeadSchema,
  stageLeadSchema,
  taskCreateSchema,
  updateLeadSchema,
  whatsappSendSchema,
} from "./schemas";

function requireLeadRead(c: Parameters<typeof requireAnyPermission>[0]) {
  return requireAnyPermission(c, [PERMISSIONS.LEADS_READ, PERMISSIONS.PATIENTS_READ]);
}

function requireLeadWrite(c: Parameters<typeof requireAnyPermission>[0]) {
  return requireAnyPermission(c, [PERMISSIONS.LEADS_UPDATE, PERMISSIONS.PATIENTS_WRITE]);
}

function assertCanMutateLead(tenant: TenantContext, lead: Lead) {
  if (tenant.role === "CLINIC_ADMIN" || tenant.role === "ORGANIZATION_ADMIN") return;
  if (roleHasPermission(tenant.role, PERMISSIONS.LEADS_ASSIGN)) return;
  if (lead.assignedToId !== tenant.userId) {
    throw forbidden("You can only manage leads assigned to you.");
  }
}

async function loadLead(tenant: TenantContext, id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, include: leadInclude });
  requireOrgOwned(tenant, lead);
  if (tenant.role !== "ORGANIZATION_ADMIN" && lead!.clinicId && lead!.clinicId !== tenant.clinicId) {
    throw forbidden("You cannot access another clinic.");
  }
  return lead!;
}

async function ensureCampaign(tenant: TenantContext, campaignId: string | null | undefined) {
  if (!campaignId) return null;
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: tenant.organizationId },
  });
  if (!campaign) throw new HttpError(422, "INVALID_CAMPAIGN", "Campaign was not found in this organization.");
  if (tenant.role !== "ORGANIZATION_ADMIN" && campaign.clinicId && campaign.clinicId !== tenant.clinicId) {
    throw new HttpError(422, "INVALID_CAMPAIGN", "Campaign belongs to another clinic.");
  }
  return campaign;
}

export const leadRoutes = new Hono<AppEnv>()
  .get("/", validate("query", listLeadQuery), async (c) => {
    const tenant = requireLeadRead(c);
    const query = c.req.valid("query");
    const parsed: LeadListQuery = {
      page: query.page,
      pageSize: query.pageSize,
      ...(query.sort ? { sort: query.sort } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: normalizeLeadSource(query.source) } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.assignedUser ? { assignedUserId: query.assignedUser } : {}),
      ...(query.treatmentInterest ? { treatmentInterest: query.treatmentInterest } : {}),
      ...(query.createdFrom ? { createdFrom: new Date(query.createdFrom) } : {}),
      ...(query.createdTo ? { createdTo: new Date(query.createdTo) } : {}),
    };
    const { total, items } = await listLeads(tenant, parsed);
    return ok(c, {
      items: items.map((row) => serializeLead(row, { maskPhone: true })),
      ...paginationMeta(query.page, query.pageSize, total),
    });
  })
  .post("/import/preview", validate("json", importPreviewSchema), async (c) => {
    const tenant = requireAnyPermission(c, [PERMISSIONS.LEADS_CREATE, PERMISSIONS.PATIENTS_WRITE]);
    const body = c.req.valid("json");
    const valid = [];
    const duplicates = [];
    const invalid = [];
    for (const [index, row] of body.rows.entries()) {
      if (!row.phone && !row.email) {
        invalid.push({ index, reason: "Phone or email is required.", row });
        continue;
      }
      const matches = await findDuplicateLeads({
        organizationId: tenant.organizationId,
        clinicId: tenant.clinicId,
        ...(row.phone ? { phone: row.phone } : {}),
        ...(row.email ? { email: row.email } : {}),
      });
      if (matches[0]) {
        duplicates.push({ index, existingLeadId: matches[0].id, row });
      } else {
        valid.push({ index, row });
      }
    }
    if (!body.confirm) {
      return ok(c, { valid, duplicates, invalid, inserted: 0 });
    }
    const created = [];
    for (const item of valid) {
      const lead = await createLeadForTenant(tenant, {
        name: item.row.name,
        source: normalizeLeadSource(item.row.source),
        ...(item.row.phone ? { phone: item.row.phone } : {}),
        ...(item.row.email ? { email: item.row.email } : {}),
        ...(item.row.campaign ? { campaign: item.row.campaign } : {}),
        ...(item.row.treatmentInterest ? { treatmentInterest: item.row.treatmentInterest } : {}),
      });
      await recordLeadActivity({
        leadId: lead.id,
        organizationId: lead.organizationId,
        clinicId: lead.clinicId,
        userId: tenant.userId,
        type: "LEAD_CREATED",
        description: "Lead imported from CSV.",
      });
      created.push(lead.id);
    }
    await audit(tenant, "lead.import", "Lead", tenant.clinicId, { count: created.length });
    return ok(c, { valid, duplicates, invalid, inserted: created.length, ids: created });
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requireLeadRead(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    const score = await recomputeLeadScore(lead);
    return ok(c, { ...serializeLead(lead), scoreExplain: score });
  })
  .post("/", validate("json", createLeadSchema), async (c) => {
    const tenant = requireAnyPermission(c, [PERMISSIONS.LEADS_CREATE, PERMISSIONS.PATIENTS_WRITE]);
    const body = c.req.valid("json");
    if (!body.createAnyway) {
      const duplicates = await findDuplicateLeads({
        organizationId: tenant.organizationId,
        clinicId: tenant.clinicId,
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.email ? { email: body.email } : {}),
      });
      if (duplicates[0]) {
        throw new HttpError(409, "DUPLICATE_LEAD", "Possible existing lead found.", {
          existingLeadId: duplicates[0].id,
          name: duplicates[0].name,
        });
      }
    }
    await ensureCampaign(tenant, body.campaignId);
    const lead = await createLeadForTenant(tenant, {
      name: body.name,
      source: normalizeLeadSource(body.source),
      ...(body.phone === undefined ? {} : { phone: body.phone }),
      ...(body.email === undefined ? {} : { email: body.email }),
      ...(body.sourceDetail === undefined ? {} : { sourceDetail: body.sourceDetail }),
      ...(body.campaignId === undefined ? {} : { campaignId: body.campaignId }),
      ...(body.campaign === undefined ? {} : { campaign: body.campaign }),
      ...(body.medium === undefined ? {} : { medium: body.medium }),
      ...(body.location === undefined ? {} : { location: body.location }),
      ...(body.treatmentInterest === undefined ? {} : { treatmentInterest: body.treatmentInterest }),
      ...(body.preferredLanguage === undefined ? {} : { preferredLanguage: body.preferredLanguage }),
      ...(body.utmSource === undefined ? {} : { utmSource: body.utmSource }),
      ...(body.utmMedium === undefined ? {} : { utmMedium: body.utmMedium }),
      ...(body.utmCampaign === undefined ? {} : { utmCampaign: body.utmCampaign }),
      ...(body.utmTerm === undefined ? {} : { utmTerm: body.utmTerm }),
      ...(body.utmContent === undefined ? {} : { utmContent: body.utmContent }),
    });
    if (body.assignedToId) {
      await assignLead(tenant, lead, body.assignedToId);
    }
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: tenant.userId,
      type: "LEAD_CREATED",
      description: "Lead created.",
      metadata: { source: lead.source },
    });
    await audit(tenant, "lead.create", "Lead", lead.id, { source: lead.source });
    const created = await loadLead(tenant, lead.id);
    return ok(c, serializeLead(created), 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateLeadSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    await ensureCampaign(tenant, body.campaignId);
    let nextStage = body.stage;
    if (!nextStage && body.status && !isLifecycleStatus(body.status)) {
      nextStage = resolveLegacyStatusAsStage(body.status) ?? undefined;
    }
    if (nextStage) {
      await changeLeadStage(tenant, lead, nextStage);
    }
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.email === undefined ? {} : { email: body.email }),
        ...(body.location === undefined ? {} : { location: body.location }),
        ...(body.treatmentInterest === undefined ? {} : { treatmentInterest: body.treatmentInterest }),
        ...(body.preferredLanguage === undefined ? {} : { preferredLanguage: body.preferredLanguage }),
        ...(body.sourceDetail === undefined ? {} : { sourceDetail: body.sourceDetail }),
        ...(body.campaignId === undefined ? {} : { campaignId: body.campaignId }),
        ...(body.medium === undefined ? {} : { medium: body.medium }),
        ...(body.nextFollowUpAt === undefined
          ? {}
          : { nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null }),
        ...(body.status && isLifecycleStatus(body.status) ? { status: body.status } : {}),
      },
      include: leadInclude,
    });
    await audit(tenant, "lead.update", "Lead", lead.id);
    return ok(c, serializeLead(updated));
  })
  .post("/:id/assign", validate("param", idParam), validate("json", assignLeadSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.LEADS_ASSIGN);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    const body = c.req.valid("json");
    const targetId = body.roundRobin
      ? await roundRobinAssignee(tenant.organizationId, lead.clinicId)
      : body.assignedToId;
    const updated = await assignLead(tenant, lead, targetId);
    await audit(tenant, targetId && lead.assignedToId && targetId !== lead.assignedToId ? "lead.reassign" : "lead.assign", "Lead", lead.id);
    return ok(c, serializeLead(await loadLead(tenant, updated.id)));
  })
  .post("/:id/stage", validate("param", idParam), validate("json", stageLeadSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    await changeLeadStage(tenant, lead, body.stage, body.reason ? { reason: body.reason } : {});
    await audit(tenant, "lead.stage", "Lead", lead.id, { stage: body.stage });
    return ok(c, serializeLead(await loadLead(tenant, lead.id)));
  })
  .post("/:id/convert", validate("param", idParam), validate("json", convertLeadSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    const converted = await convertLead(tenant, lead, {
      ...(body.createCouple === undefined ? {} : { createCouple: body.createCouple }),
      ...(body.partnerName === undefined ? {} : { partnerName: body.partnerName }),
      ...(body.existingPatientId === undefined ? {} : { existingPatientId: body.existingPatientId }),
      ...(body.bookConsultationAt === undefined ? {} : { bookConsultationAt: body.bookConsultationAt }),
    });
    await audit(tenant, "lead.convert", "Lead", lead.id, { patientId: converted.patientId ?? "" });
    return ok(c, serializeLead(converted));
  })
  .post("/:id/lost", validate("param", idParam), validate("json", lostLeadSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "LOST", stage: "LOST", lostReason: body.detail ? `${body.reason}: ${body.detail}` : body.reason },
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: tenant.userId,
      type: "LEAD_LOST",
      description: `Lead marked lost (${body.reason}).`,
    });
    await audit(tenant, "lead.lost", "Lead", lead.id, { reason: body.reason });
    return ok(c, serializeLead(await loadLead(tenant, lead.id)));
  })
  .post("/:id/reopen", validate("param", idParam), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "OPEN", stage: lead.stage === "LOST" ? "CONTACTED" : lead.stage, lostReason: null },
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: tenant.userId,
      type: "LEAD_REOPENED",
      description: "Lead reopened.",
    });
    await audit(tenant, "lead.reopen", "Lead", lead.id);
    return ok(c, serializeLead(await loadLead(tenant, lead.id)));
  })
  .get("/:id/activities", validate("param", idParam), validate("query", listLeadQuery.pick({ page: true, pageSize: true })), async (c) => {
    const tenant = requireLeadRead(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    const query = c.req.valid("query");
    const where = { leadId: lead.id, organizationId: tenant.organizationId };
    const [total, rows] = await Promise.all([
      prisma.leadActivity.count({ where }),
      prisma.leadActivity.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, { items: rows.map(serializeLeadActivity), ...paginationMeta(query.page, query.pageSize, total) });
  })
  .post("/:id/activities", validate("param", idParam), validate("json", activityCreateSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    const activity = await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: tenant.userId,
      type: body.type,
      description: body.description,
    });
    if (body.type === "CALL_CONNECTED" || body.type === "WHATSAPP_RECEIVED") {
      await recomputeLeadScore(lead);
    }
    return ok(c, serializeLeadActivity(activity), 201);
  })
  .get("/:id/tasks", validate("param", idParam), async (c) => {
    const tenant = requireLeadRead(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    const tasks = await prisma.careTask.findMany({
      where: { leadId: lead.id, clinicId: lead.clinicId ?? tenant.clinicId },
      include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { dueDate: "asc" },
    });
    return ok(
      c,
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status === "WAITING" ? "PENDING" : task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() ?? null,
        owner: task.assignments[0]?.user ?? null,
      })),
    );
  })
  .post("/:id/tasks", validate("param", idParam), validate("json", taskCreateSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    const clinicId = lead.clinicId ?? tenant.clinicId;
    const task = await prisma.careTask.create({
      data: {
        clinicId,
        leadId: lead.id,
        title: body.title,
        description: body.description ?? null,
        status: "WAITING",
        priority: body.priority ?? "NORMAL",
        dueDate: new Date(body.dueDate),
        createdById: tenant.userId,
        category: "CRM_FOLLOW_UP",
      },
    });
    const ownerId = body.ownerId ?? lead.assignedToId ?? tenant.userId;
    await prisma.taskAssignment.create({ data: { careTaskId: task.id, userId: ownerId } });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: new Date(body.dueDate) },
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId,
      userId: tenant.userId,
      type: "FOLLOW_UP_SCHEDULED",
      description: `Follow-up scheduled: ${body.title}`,
    });
    await prisma.notification.create({
      data: {
        clinicId,
        userId: ownerId,
        title: "Follow-up scheduled",
        body: `${body.title} for ${lead.name}`,
        href: `/crm/leads/${lead.id}`,
      },
    }).catch(() => undefined);
    return ok(c, { id: task.id, status: "PENDING" }, 201);
  })
  .post("/:id/whatsapp", validate("param", idParam), validate("json", whatsappSendSchema), async (c) => {
    const tenant = requireLeadWrite(c);
    const lead = await loadLead(tenant, c.req.valid("param").id);
    assertCanMutateLead(tenant, lead);
    const body = c.req.valid("json");
    const templates = await prisma.whatsAppTemplate.findMany({
      where: { clinicId: tenant.clinicId, status: "APPROVED" },
      take: 1,
    });
    if (templates.length === 0 && !(await prisma.whatsAppTemplate.findFirst({ where: { id: body.templateId, clinicId: tenant.clinicId } }))) {
      throw new HttpError(422, "NO_APPROVED_TEMPLATE", "No approved WhatsApp template is available.");
    }
    const conversation =
      (lead.conversationId
        ? await prisma.conversation.findFirst({ where: { id: lead.conversationId, clinicId: tenant.clinicId } })
        : await prisma.conversation.findFirst({ where: { leadId: lead.id, clinicId: tenant.clinicId, channel: "WHATSAPP" } })) ??
      (await prisma.conversation.create({
        data: {
          clinicId: tenant.clinicId,
          leadId: lead.id,
          contactPhone: lead.phone,
          unmatched: !lead.patientId,
          channel: "WHATSAPP",
          status: "OPEN",
        },
      }));
    const result = await sendWhatsAppTemplate(tenant, {
      conversationId: conversation.id,
      templateId: body.templateId,
      parameters: body.parameters,
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: tenant.userId,
      type: "WHATSAPP_SENT",
      description: "WhatsApp template sent.",
    });
    return ok(c, result);
  });
