import { Hono } from "hono";
import { prisma, writeAuditLog } from "@smrkomed/database";
import { z } from "zod";

import { tenantOf } from "../../lib/authz";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { pageMeta, skipTake } from "./pagination";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  sort: z.enum(["name", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const idParam = z.object({ id: z.string().min(1) });

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(80).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .strict();

export const adminOrganizationRoutes = new Hono<AppEnv>()
  .get("/organizations", validate("query", listSchema), async (c) => {
    const query = c.req.valid("query");
    const where = {
      ...(query.q
        ? { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { slug: { contains: query.q, mode: "insensitive" as const } }] }
        : {}),
      ...(query.status === undefined ? {} : { status: query.status }),
    };
    const [total, rows] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        ...skipTake(query.page, query.pageSize),
        include: {
          _count: { select: { clinics: true } },
          subscription: { select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true } },
          clinics: { select: { id: true, memberships: { select: { userId: true } } } },
        },
      }),
    ]);
    const items = rows.map((org) => {
      const userIds = new Set(org.clinics.flatMap((clinic) => clinic.memberships.map((row) => row.userId)));
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        clinicCount: org._count.clinics,
        userCount: userIds.size,
        subscription: org.subscription,
        createdAt: org.createdAt,
        lastActivity: org.updatedAt,
      };
    });
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  })
  .get("/organizations/:id", validate("param", idParam), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        modules: true,
        clinics: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            _count: { select: { patients: true, leads: true, memberships: true } },
          },
        },
      },
    });
    if (!org) throw notFound("Organization not found.");
    const clinicIds = org.clinics.map((row) => row.id);
    const [users, integrations, auditLogs] = await Promise.all([
      prisma.user.findMany({
        where: { memberships: { some: { clinicId: { in: clinicIds } } } },
        select: { id: true, name: true, email: true, isActive: true, createdAt: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.integration.findMany({
        where: { clinicId: { in: clinicIds } },
        select: {
          id: true,
          provider: true,
          status: true,
          displayName: true,
          lastError: true,
          lastSyncAt: true,
          clinicId: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actorId: true },
      }),
    ]);
    await writeAuditLog({
      actorId: tenant.userId,
      organizationId: id,
      action: "admin.organization.view",
      entityType: "Organization",
      entityId: id,
    });
    return ok(c, { organization: org, users, integrations, auditLogs });
  })
  .patch("/organizations/:id", validate("param", idParam), validate("json", patchSchema), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) throw notFound("Organization not found.");
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.slug === undefined ? {} : { slug: body.slug }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
    });
    await writeAuditLog({
      actorId: tenant.userId,
      organizationId: id,
      action: body.status ? "admin.organization.status" : "admin.organization.update",
      entityType: "Organization",
      entityId: id,
      metadata: { status: organization.status },
    });
    return ok(c, organization);
  });
