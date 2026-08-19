import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const idParam = z.object({ id: z.string().min(1) });

export const coupleRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const couples = await prisma.couple.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      orderBy: { createdAt: "desc" },
    });
    return ok(c, couples);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const couple = await prisma.couple.findUnique({ where: { id } });
    return ok(c, await requireClinicOwned(tenant, couple));
  });
