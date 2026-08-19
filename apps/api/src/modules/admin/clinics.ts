import { Hono } from "hono";
import { prisma, writeAuditLog } from "@smrkomed/database";
import { z } from "zod";

import { tenantOf } from "../../lib/authz";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { SAFE_INTEGRATION_SELECT, toConnectionStatus } from "./integrations-shared";
import { pageMeta, skipTake } from "./pagination";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  q: z.string().trim().max(200).optional(),
  organizationId: z.string().optional(),
  sort: z.enum(["name", "createdAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

const idParam = z.object({ id: z.string().min(1) });

export const adminClinicRoutes = new Hono<AppEnv>()
  .get("/clinics", validate("query", listSchema), async (c) => {
    const query = c.req.valid("query");
    const where = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { city: { contains: query.q, mode: "insensitive" as const } },
              { slug: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.clinic.count({ where }),
      prisma.clinic.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        ...skipTake(query.page, query.pageSize),
        include: {
          organization: { select: { id: true, name: true, status: true, subscription: { select: { plan: true, status: true } } } },
          _count: { select: { branches: true, memberships: true, patients: true, leads: true } },
          integrations: { select: { provider: true, status: true } },
        },
      }),
    ]);
    const items = rows.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      organization: clinic.organization,
      branchCount: clinic._count.branches,
      userCount: clinic._count.memberships,
      patientCount: clinic._count.patients,
      leadCount: clinic._count.leads,
      integrations: clinic.integrations.map((row) => ({
        provider: row.provider,
        connectionStatus: toConnectionStatus(row.status),
      })),
      subscription: clinic.organization.subscription,
    }));
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  })
  .get("/clinics/:id", validate("param", idParam), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true, status: true, subscription: true } },
        branches: true,
        memberships: {
          select: {
            status: true,
            role: { select: { key: true, name: true } },
            user: { select: { id: true, name: true, email: true, isActive: true } },
          },
        },
        _count: { select: { patients: true, leads: true, carePlans: true, careTasks: true, appointments: true } },
        integrations: { select: SAFE_INTEGRATION_SELECT },
      },
    });
    if (!clinic) throw notFound("Clinic not found.");
    const auditLogs = await prisma.auditLog.findMany({
      where: { clinicId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actorId: true },
    });
    await writeAuditLog({
      actorId: tenant.userId,
      organizationId: clinic.organizationId,
      clinicId: id,
      action: "admin.clinic.view",
      entityType: "Clinic",
      entityId: id,
    });
    return ok(c, {
      clinic: {
        ...clinic,
        integrations: clinic.integrations.map((row) => ({
          ...row,
          connectionStatus: toConnectionStatus(row.status),
        })),
      },
      summaries: {
        patients: clinic._count.patients,
        leads: clinic._count.leads,
        carePlans: clinic._count.carePlans,
        careTasks: clinic._count.careTasks,
        appointments: clinic._count.appointments,
      },
      auditLogs,
    });
  });
