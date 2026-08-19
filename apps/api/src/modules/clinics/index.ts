import { Hono } from "hono";
import { prisma } from "@smrkomed/database";

import { requireClinicAccess, tenantOf } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

const clinicSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  timezone: true,
  organizationId: true,
} as const;

export const clinicRoutes = new Hono<AppEnv>()
  .get("/current", async (c) => {
    const tenant = tenantOf(c);
    await requireClinicAccess(c, tenant.clinicId);
    const clinic = await prisma.clinic.findFirst({
      where: { id: tenant.clinicId, organizationId: tenant.organizationId },
      select: clinicSelect,
    });
    return ok(c, clinic);
  })
  .get("/", async (c) => {
    const tenant = tenantOf(c);
    if (tenant.role === "ORGANIZATION_ADMIN" || tenant.role === "PLATFORM_ADMIN") {
      const clinics = await prisma.clinic.findMany({
        where: { organizationId: tenant.organizationId },
        select: clinicSelect,
        orderBy: { name: "asc" },
      });
      return ok(c, clinics);
    }
    await requireClinicAccess(c, tenant.clinicId);
    const clinic = await prisma.clinic.findFirst({
      where: { id: tenant.clinicId, organizationId: tenant.organizationId },
      select: clinicSelect,
    });
    return ok(c, clinic ? [clinic] : []);
  });
