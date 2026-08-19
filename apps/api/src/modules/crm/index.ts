import { Hono } from "hono";
import { PERMISSIONS, organizationScope, prisma } from "@smrkomed/database";
import type { CareTaskStatus, LeadSource, LeadStage } from "@prisma/client";

import { requireAnyPermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { CONVERSION_FORMULAS, LEAD_SOURCE_LABELS, LEAD_STAGES, TREATMENT_INTERESTS } from "./constants";
import { listLeadQuery } from "../leads/schemas";
import { leadInclude, listLeads } from "./query";
import { paginationMeta, serializeLead } from "./serializer";

function requireCrmRead(c: Parameters<typeof requireAnyPermission>[0]) {
  return requireAnyPermission(c, [PERMISSIONS.LEADS_READ, PERMISSIONS.PATIENTS_READ]);
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export const crmRoutes = new Hono<AppEnv>()
  .get("/summary", async (c) => {
    const tenant = requireCrmRead(c);
    const where = organizationScope(tenant);
    const clinicWhere = tenant.role === "ORGANIZATION_ADMIN" ? where : { ...where, clinicId: tenant.clinicId };
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [
      total,
      newLeads,
      qualified,
      booked,
      completed,
      treatmentStarted,
      active,
      lost,
      uncontacted,
      followUpsDue,
      overdue,
      byInterest,
      bySource,
      campaigns,
    ] = await Promise.all([
      prisma.lead.count({ where: clinicWhere }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "NEW_LEAD" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "QUALIFIED" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "CONSULTATION_BOOKED" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "CONSULTATION_COMPLETED" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "TREATMENT_STARTED" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "ACTIVE_PATIENT" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "LOST" } }),
      prisma.lead.count({ where: { ...clinicWhere, stage: "NEW_LEAD", status: { in: ["NEW", "OPEN"] } } }),
      prisma.careTask.count({
        where: {
          clinicId: tenant.clinicId,
          category: "CRM_FOLLOW_UP",
          status: { in: ["WAITING", "IN_PROGRESS"] },
          dueDate: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86_400_000) },
        },
      }),
      prisma.careTask.count({
        where: {
          clinicId: tenant.clinicId,
          category: "CRM_FOLLOW_UP",
          status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE"] },
          dueDate: { lt: startOfDay },
        },
      }),
      prisma.lead.groupBy({ by: ["treatmentInterest"], where: clinicWhere, _count: true }),
      prisma.lead.groupBy({ by: ["source"], where: clinicWhere, _count: true }),
      prisma.campaign.findMany({
        where: { organizationId: tenant.organizationId, ...(tenant.role === "ORGANIZATION_ADMIN" ? {} : { clinicId: tenant.clinicId }) },
        include: { _count: { select: { leads: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const interest = TREATMENT_INTERESTS.map((label) => {
      const match = byInterest.find((row) => (row.treatmentInterest ?? "").toLowerCase() === label.toLowerCase());
      return { interest: label, leads: match?._count ?? 0 };
    });

    return ok(c, {
      totals: {
        totalLeads: total,
        newLeads,
        uncontactedLeads: uncontacted,
        qualifiedLeads: qualified,
        consultationsBooked: booked,
        consultationsCompleted: completed,
        treatmentStarted,
        activePatients: active,
        lostLeads: lost,
        followUpsDueToday: followUpsDue,
        overdueFollowUps: overdue,
        conversionRate: pct(treatmentStarted + active, total),
      },
      rates: {
        leadToQualified: pct(qualified, total),
        qualifiedToConsultation: pct(booked, qualified),
        consultationToTreatment: pct(treatmentStarted, completed),
        leadToTreatment: pct(treatmentStarted, total),
        formulas: CONVERSION_FORMULAS,
      },
      treatmentInterest: interest,
      sources: bySource.map((row) => ({
        source: row.source,
        label: LEAD_SOURCE_LABELS[row.source as LeadSource],
        leads: row._count,
      })),
      campaigns: campaigns.map((row) => ({
        id: row.id,
        name: row.name,
        source: row.source,
        status: row.status,
        leads: row._count.leads,
      })),
    });
  })
  .get("/pipeline", validate("query", listLeadQuery), async (c) => {
    const tenant = requireCrmRead(c);
    const query = c.req.valid("query");
    const columns = [];
    for (const stage of LEAD_STAGES) {
      const { total, items } = await listLeads(tenant, {
        page: query.page,
        pageSize: Math.min(query.pageSize, 20),
        stage: stage as LeadStage,
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.search ? { search: query.search } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.assignedUser ? { assignedUserId: query.assignedUser } : {}),
      });
      columns.push({
        stage,
        total,
        items: items.map((row) => serializeLead(row, { maskPhone: true })),
      });
    }
    return ok(c, { columns, page: query.page, pageSize: Math.min(query.pageSize, 20) });
  })
  .get("/sources", async (c) => {
    const tenant = requireCrmRead(c);
    const where = tenant.role === "ORGANIZATION_ADMIN" ? organizationScope(tenant) : { ...organizationScope(tenant), clinicId: tenant.clinicId };
    const [bySource, qualified, booked, started] = await Promise.all([
      prisma.lead.groupBy({ by: ["source"], where, _count: true }),
      prisma.lead.groupBy({ by: ["source"], where: { ...where, stage: "QUALIFIED" }, _count: true }),
      prisma.lead.groupBy({ by: ["source"], where: { ...where, stage: "CONSULTATION_BOOKED" }, _count: true }),
      prisma.lead.groupBy({ by: ["source"], where: { ...where, stage: "TREATMENT_STARTED" }, _count: true }),
    ]);
    const mapCount = (rows: Array<{ source: LeadSource; _count: number }>) =>
      Object.fromEntries(rows.map((row) => [row.source, row._count]));
    const q = mapCount(qualified);
    const b = mapCount(booked);
    const s = mapCount(started);
    return ok(
      c,
      bySource.map((row) => ({
        source: row.source,
        label: LEAD_SOURCE_LABELS[row.source],
        leads: row._count,
        qualified: q[row.source] ?? 0,
        consultations: b[row.source] ?? 0,
        treatmentStarted: s[row.source] ?? 0,
      })),
    );
  })
  .get("/follow-ups", validate("query", listLeadQuery.pick({ page: true, pageSize: true })), async (c) => {
    const tenant = requireCrmRead(c);
    const query = c.req.valid("query");
    const now = new Date();
    const followUpStatuses: CareTaskStatus[] = ["WAITING", "IN_PROGRESS", "OVERDUE"];
    const where = {
      clinicId: tenant.clinicId,
      category: "CRM_FOLLOW_UP",
      status: { in: followUpStatuses },
    };
    const [total, tasks] = await Promise.all([
      prisma.careTask.count({ where }),
      prisma.careTask.findMany({
        where,
        include: {
          lead: { include: leadInclude },
          assignments: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { dueDate: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, {
      overdue: tasks.filter((task) => task.dueDate && task.dueDate < now).length,
      items: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate?.toISOString() ?? null,
        overdue: Boolean(task.dueDate && task.dueDate < now),
        status: task.status === "WAITING" ? "PENDING" : task.status,
        owner: task.assignments[0]?.user ?? null,
        lead: task.lead ? serializeLead(task.lead, { maskPhone: true }) : null,
      })),
      ...paginationMeta(query.page, query.pageSize, total),
    });
  });
