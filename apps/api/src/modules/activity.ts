import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission } from "../lib/authz";
import { ok } from "../lib/http";
import type { AppEnv } from "../types";
import { serializeActivity } from "./clinic-dto";

export const activityRoutes = new Hono<AppEnv>().get("/", async (c) => {
  const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
  const logs = await prisma.auditLog.findMany({
    where: { clinicId: tenant.clinicId, organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return ok(c, logs.map(serializeActivity));
});
