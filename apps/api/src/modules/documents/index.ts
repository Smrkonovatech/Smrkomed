import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const idParam = z.object({ id: z.string().min(1) });

const documentSelect = {
  id: true,
  clinicId: true,
  patientId: true,
  coupleId: true,
  careTaskId: true,
  categoryId: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const documentRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const documents = await prisma.document.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      select: documentSelect,
      orderBy: { createdAt: "desc" },
    });
    return ok(c, documents);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const document = await prisma.document.findUnique({ where: { id }, select: documentSelect });
    return ok(c, await requireClinicOwned(tenant, document));
  });
