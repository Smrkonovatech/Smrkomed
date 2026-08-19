import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission, tenantOf } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  title: true,
  isActive: true,
} as const;

export const userRoutes = new Hono<AppEnv>()
  .get("/me", async (c) => {
    const tenant = tenantOf(c);
    const user = await prisma.user.findUnique({
      where: { id: tenant.userId },
      select: userSelect,
    });
    return ok(c, {
      ...user,
      organizationId: tenant.organizationId,
      organizationName: tenant.organizationName,
      clinicId: tenant.clinicId,
      clinicName: tenant.clinicName,
      role: tenant.role,
    });
  })
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.USERS_MANAGE);
    const memberships = await prisma.clinicMembership.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      select: {
        status: true,
        role: { select: { key: true, name: true } },
        user: { select: userSelect },
      },
      orderBy: { createdAt: "asc" },
    });
    return ok(c, memberships);
  });
