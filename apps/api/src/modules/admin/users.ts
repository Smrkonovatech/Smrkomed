import { Hono } from "hono";
import { ROLE_PERMISSIONS, prisma, writeAuditLog, type StaffRole } from "@smrkomed/database";
import { z } from "zod";

import { tenantOf } from "../../lib/authz";
import { forbidden, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { pageMeta, skipTake } from "./pagination";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  q: z.string().trim().max(200).optional(),
  role: z.string().optional(),
  organizationId: z.string().optional(),
  clinicId: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  sort: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const idParam = z.object({ id: z.string().min(1) });

const assignableRoles = [
  "CLINIC_ADMIN",
  "ORGANIZATION_ADMIN",
  "DOCTOR",
  "CARE_COORDINATOR",
  "NURSE",
  "RECEPTIONIST",
  "COUNSELOR",
  "MARKETING",
  "READ_ONLY",
] as const;

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(assignableRoles).optional(),
    membershipId: z.string().optional(),
  })
  .strict();

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  title: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const adminUserRoutes = new Hono<AppEnv>()
  .get("/users", validate("query", listSchema), async (c) => {
    const query = c.req.valid("query");
    const where = {
      ...(query.status === "active" ? { isActive: true } : {}),
      ...(query.status === "disabled" ? { isActive: false } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { email: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.clinicId || query.organizationId || query.role
        ? {
            memberships: {
              some: {
                ...(query.clinicId ? { clinicId: query.clinicId } : {}),
                ...(query.organizationId ? { clinic: { organizationId: query.organizationId } } : {}),
                ...(query.role ? { role: { key: query.role as StaffRole } } : {}),
              },
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        ...skipTake(query.page, query.pageSize),
        select: {
          ...userSelect,
          memberships: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              status: true,
              role: { select: { key: true, name: true } },
              clinic: {
                select: { id: true, name: true, organization: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
    ]);
    const items = rows.map((user) => {
      const membership = user.memberships[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: null,
        role: membership?.role.key ?? null,
        clinic: membership?.clinic ?? null,
        organization: membership?.clinic.organization ?? null,
      };
    });
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  })
  .get("/users/:id", validate("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        memberships: {
          select: {
            id: true,
            status: true,
            role: { select: { key: true, name: true } },
            clinic: {
              select: { id: true, name: true, organization: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!user) throw notFound("User not found.");
    const primary = user.memberships[0];
    const permissions = primary ? ROLE_PERMISSIONS[primary.role.key] : [];
    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        organizationId: true,
        clinicId: true,
      },
    });
    return ok(c, { user, permissions, lastLogin: null, auditLogs });
  })
  .patch("/users/:id", validate("param", idParam), validate("json", patchSchema), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { memberships: { include: { role: true } } },
    });
    if (!existing) throw notFound("User not found.");
    if (existing.memberships.some((row) => row.role.key === "PLATFORM_ADMIN") && id !== tenant.userId) {
      throw forbidden("Platform administrator accounts cannot be modified here.");
    }
    if (body.isActive !== undefined) {
      await prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
      await writeAuditLog({
        actorId: tenant.userId,
        action: body.isActive ? "admin.user.enable" : "admin.user.disable",
        entityType: "User",
        entityId: id,
      });
    }
    if (body.role) {
      const membership =
        existing.memberships.find((row) => row.id === body.membershipId) ?? existing.memberships[0];
      if (!membership) throw notFound("Membership not found.");
      const role = await prisma.role.findUnique({ where: { key: body.role } });
      if (!role) throw notFound("Role not found.");
      await prisma.clinicMembership.update({ where: { id: membership.id }, data: { roleId: role.id } });
      await writeAuditLog({
        actorId: tenant.userId,
        clinicId: membership.clinicId,
        action: "admin.user.role",
        entityType: "User",
        entityId: id,
        metadata: { role: body.role },
      });
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        memberships: {
          select: {
            id: true,
            status: true,
            role: { select: { key: true, name: true } },
            clinic: { select: { id: true, name: true } },
          },
        },
      },
    });
    return ok(c, user);
  });
