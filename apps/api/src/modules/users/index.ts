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
      id: user?.id ?? tenant.userId,
      email: user?.email ?? "",
      name: user?.name ?? user?.email ?? "Clinic staff",
      phone: user?.phone ?? null,
      title: user?.title ?? null,
      isActive: user?.isActive ?? false,
      organizationId: tenant.organizationId,
      organizationName: tenant.organizationName,
      clinicId: tenant.clinicId,
      clinicName: tenant.clinicName,
      role: tenant.role,
    });
  })
  .get("/staff", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    try {
      const memberships = await prisma.clinicMembership.findMany({
        where: {
          clinicId: tenant.clinicId,
          clinic: { organizationId: tenant.organizationId },
          status: "ACTIVE",
          user: { isActive: true },
        },
        select: {
          role: { select: { key: true, name: true } },
          user: { select: { id: true, name: true, title: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      const staff = memberships
        .filter((row) => row.role?.key && row.user?.id)
        .map((row) => ({
          id: row.user.id,
          name: row.user.name || row.user.email,
          title: row.user.title,
          email: row.user.email,
          role: row.role.key,
          roleName: row.role.name,
        }));
      const roleCounts = staff.reduce<Record<string, number>>((acc, row) => {
        acc[row.role] = (acc[row.role] ?? 0) + 1;
        return acc;
      }, {});
      console.info("STAFF_LIST", {
        clinicId: tenant.clinicId,
        userId: tenant.userId,
        staffCount: staff.length,
        roleCounts,
      });
      return ok(c, staff);
    } catch (error) {
      console.error("STAFF_LIST_FAILED", {
        clinicId: tenant.clinicId,
        userId: tenant.userId,
        message: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
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
