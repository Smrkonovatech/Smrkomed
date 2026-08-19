import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { LEAD_STAGES, normalizeLeadSource } from "../crm/constants";
import { paginationMeta, serializeCampaign, serializeLead } from "../crm/serializer";
import { campaignCreateSchema, campaignListQuery, campaignUpdateSchema, idParam } from "../leads/schemas";
import { leadInclude } from "../crm/query";

export const campaignRoutes = new Hono<AppEnv>()
  .get("/", validate("query", campaignListQuery), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CAMPAIGNS_READ);
    const query = c.req.valid("query");
    const where = {
      organizationId: tenant.organizationId,
      ...(tenant.role === "ORGANIZATION_ADMIN" ? {} : { clinicId: tenant.clinicId }),
      ...(query.source ? { source: normalizeLeadSource(query.source) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        include: { _count: { select: { leads: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, { items: rows.map(serializeCampaign), ...paginationMeta(query.page, query.pageSize, total) });
  })
  .post("/", validate("json", campaignCreateSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CAMPAIGNS_MANAGE);
    const body = c.req.valid("json");
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: tenant.organizationId,
        clinicId: tenant.clinicId,
        name: body.name,
        source: normalizeLeadSource(body.source),
        medium: body.medium ?? null,
        treatmentFocus: body.treatmentFocus ?? null,
        status: body.status ?? "DRAFT",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        campaignExternalId: body.campaignExternalId ?? null,
      },
    });
    await audit(tenant, "campaign.create", "Campaign", campaign.id);
    return ok(c, serializeCampaign(campaign), 201);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CAMPAIGNS_READ);
    const campaign = await prisma.campaign.findUnique({
      where: { id: c.req.valid("param").id },
      include: { _count: { select: { leads: true } } },
    });
    if (!campaign || campaign.organizationId !== tenant.organizationId) {
      throw new HttpError(404, "RESOURCE_NOT_FOUND", "Campaign was not found.");
    }
    if (tenant.role !== "ORGANIZATION_ADMIN" && campaign.clinicId && campaign.clinicId !== tenant.clinicId) {
      throw new HttpError(403, "FORBIDDEN", "You cannot access another clinic.");
    }
    const leads = await prisma.lead.findMany({
      where: { campaignId: campaign.id, organizationId: tenant.organizationId },
      include: leadInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const counts = await prisma.lead.groupBy({
      by: ["stage"],
      where: { campaignId: campaign.id, organizationId: tenant.organizationId },
      _count: true,
    });
    const byStage: Record<string, number> = Object.fromEntries(LEAD_STAGES.map((stage) => [stage, 0]));
    for (const row of counts) byStage[row.stage] = row._count;
    return ok(c, {
      campaign: serializeCampaign(campaign),
      funnel: {
        leads: campaign._count.leads,
        qualified: byStage["QUALIFIED"] ?? 0,
        consultationsBooked: byStage["CONSULTATION_BOOKED"] ?? 0,
        consultationsCompleted: byStage["CONSULTATION_COMPLETED"] ?? 0,
        treatmentStarted: byStage["TREATMENT_STARTED"] ?? 0,
        activePatients: byStage["ACTIVE_PATIENT"] ?? 0,
        lost: byStage["LOST"] ?? 0,
      },
      leads: leads.map((row) => serializeLead(row, { maskPhone: true })),
    });
  })
  .patch("/:id", validate("param", idParam), validate("json", campaignUpdateSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CAMPAIGNS_MANAGE);
    const existing = await prisma.campaign.findUnique({ where: { id: c.req.valid("param").id } });
    if (!existing || existing.organizationId !== tenant.organizationId) {
      throw new HttpError(404, "RESOURCE_NOT_FOUND", "Campaign was not found.");
    }
    const body = c.req.valid("json");
    const campaign = await prisma.campaign.update({
      where: { id: existing.id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.source === undefined ? {} : { source: normalizeLeadSource(body.source) }),
        ...(body.medium === undefined ? {} : { medium: body.medium }),
        ...(body.treatmentFocus === undefined ? {} : { treatmentFocus: body.treatmentFocus }),
        ...(body.status === undefined ? {} : { status: body.status }),
        ...(body.startDate === undefined ? {} : { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate === undefined ? {} : { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.campaignExternalId === undefined ? {} : { campaignExternalId: body.campaignExternalId }),
      },
    });
    await audit(tenant, "campaign.update", "Campaign", campaign.id);
    return ok(c, serializeCampaign(campaign));
  });
