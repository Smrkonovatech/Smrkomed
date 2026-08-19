import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

export const analyticsRoutes = new Hono<AppEnv>().get("/summary", async (c) => {
  const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
  const clinicWhere = { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } };
  const [patients, appointments, carePlans, careTasks, leads] = await Promise.all([
    prisma.patient.count({ where: clinicWhere }),
    prisma.appointment.count({ where: clinicWhere }),
    prisma.carePlan.count({ where: clinicWhere }),
    prisma.careTask.count({ where: clinicWhere }),
    prisma.lead.count({ where: { organizationId: tenant.organizationId } }),
  ]);
  return ok(c, { patients, appointments, carePlans, careTasks, leads });
});
