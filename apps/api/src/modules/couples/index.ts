import { Hono } from "hono";
import { PERMISSIONS, buildPatient360, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { CreateCoupleFailedError, newCreateCoupleRequestId, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { serializeCouple } from "../clinic-dto";
import { createCoupleSchema, idParam, updateCoupleSchema } from "./schemas";
import { createCoupleRecord, listCouples, loadCouple } from "./service";

export const coupleRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const couples = await listCouples(tenant);
    return ok(c, couples.map(serializeCouple));
  })
  .get("/:id/360", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const payload = await buildPatient360(tenant, id);
    if (!payload) throw notFound();
    return ok(c, payload);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const couple = await loadCouple(tenant, id);
    if (!couple) {
      const bySlug = await prisma.couple.findFirst({
        where: {
          slug: id,
          clinicId: tenant.clinicId,
          clinic: { organizationId: tenant.organizationId },
        },
      });
      if (!bySlug) throw notFound();
      const loaded = await loadCouple(tenant, bySlug.id);
      if (!loaded) throw notFound();
      return ok(c, serializeCouple(loaded));
    }
    return ok(c, serializeCouple(couple));
  })
  .post("/", validate("json", createCoupleSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const body = c.req.valid("json");
    const couple = await createCoupleRecord(tenant, body);
    let payload;
    try {
      payload = serializeCouple(couple);
    } catch (error) {
      throw new CreateCoupleFailedError({
        requestId: newCreateCoupleRequestId(),
        step: "SERIALIZE",
        clinicId: tenant.clinicId,
        userId: tenant.userId,
        cause: error,
      });
    }
    try {
      await audit(tenant, "couple.create", "Couple", couple.id, {
        clinicId: tenant.clinicId,
        patient: `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim(),
      });
    } catch {
      // Persistence succeeded; do not fail the request if audit cannot write.
    }
    return ok(c, payload, 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateCoupleSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.couple.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    await prisma.couple.update({
      where: { id },
      data: {
        ...(body.assignedDoctorId === undefined ? {} : { assignedDoctorId: body.assignedDoctorId }),
        ...(body.assignedCoordinatorId === undefined
          ? {}
          : { assignedCoordinatorId: body.assignedCoordinatorId }),
        ...(body.careLoopActive === undefined ? {} : { careLoopActive: body.careLoopActive }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
    });
    const couple = await loadCouple(tenant, id);
    if (!couple) throw notFound();
    await audit(tenant, "couple.update", "Couple", couple.id, {
      patient: `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim(),
    });
    return ok(c, serializeCouple(couple));
  });
