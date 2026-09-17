import { Hono } from "hono";
import { PERMISSIONS, buildPatient360, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { CreateCoupleFailedError, newCreateCoupleRequestId, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { serializeCouple, serializeAppointment, serializeTask } from "../clinic-dto";
import { createCoupleSchema, idParam, updateCoupleSchema } from "./schemas";
import { createCoupleRecord, deleteCoupleRecord, listCouples, loadCouple } from "./service";
import { serializeTreatment, updateTreatmentSchema } from "../treatments";

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
  .get("/:id/care-calendar", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    
    // Ensure couple belongs to clinic (support either CUID id or slug)
    const couple = await prisma.couple.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        clinicId: tenant.clinicId,
      },
    });
    if (!couple) throw notFound();

    const [appointments, tasks] = await Promise.all([
      prisma.appointment.findMany({
        where: { coupleId: couple.id, clinicId: tenant.clinicId },
      }),
      prisma.careTask.findMany({
        where: { coupleId: couple.id, clinicId: tenant.clinicId },
        include: {
          assignments: { include: { user: { select: { name: true } } }, take: 1 },
          couple: {
            include: {
              assignedCoordinator: { select: { name: true } },
              assignedDoctor: { select: { name: true } },
              primaryPatient: true,
            },
          },
          carePlanStep: true,
        },
      }),
    ]);

    return ok(c, {
      appointments: appointments.map(serializeAppointment),
      tasks: tasks.map((task) => serializeTask(task as any, task.couple as any)),
    });
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
  .get("/:id/treatment", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");

    let couple = await prisma.couple.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        clinicId: tenant.clinicId,
      },
      select: { id: true },
    });
    if (!couple) throw notFound();

    const treatment = await prisma.treatment.findFirst({
      where: { coupleId: couple.id, clinicId: tenant.clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        ivfCycle: true,
        iuiCycle: true,
        carePlan: true,
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
            assignedDoctor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!treatment) {
      return ok(c, { treatment: null });
    }
    return ok(c, serializeTreatment(treatment));
  })
  .patch("/:id/treatment", validate("param", idParam), validate("json", updateTreatmentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    let couple = await prisma.couple.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        clinicId: tenant.clinicId,
      },
      include: {
        primaryPatient: true,
        partnerPatient: true,
        assignedDoctor: { select: { id: true, name: true } },
      },
    });
    if (!couple) throw notFound();

    let treatment = await prisma.treatment.findFirst({
      where: { coupleId: couple.id, clinicId: tenant.clinicId },
      orderBy: { createdAt: "desc" },
      include: {
        ivfCycle: true,
        iuiCycle: true,
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      if (!treatment) {
        // Create initial treatment for couple
        treatment = await tx.treatment.create({
          data: {
            clinicId: tenant.clinicId,
            coupleId: couple.id,
            kind: body.kind ?? "IVF",
            label: body.label ?? (body.kind === "EVALUATION" ? "Fertility Evaluation" : `${body.kind ?? "IVF"} Cycle 1`),
            status: body.status ?? "ACTIVE",
            stageIndex: body.stageIndex ?? 0,
            stageName: body.stageName ?? "Consultation",
            startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
          },
          include: {
            ivfCycle: true,
            iuiCycle: true,
          },
        });
      } else {
        await tx.treatment.update({
          where: { id: treatment.id },
          data: {
            ...(body.kind ? { kind: body.kind } : {}),
            ...(body.label ? { label: body.label } : {}),
            ...(body.status ? { status: body.status } : {}),
            ...(body.stageIndex !== undefined ? { stageIndex: body.stageIndex } : {}),
            ...(body.stageName !== undefined ? { stageName: body.stageName } : {}),
            ...(body.startedAt !== undefined
              ? { startedAt: body.startedAt ? new Date(body.startedAt) : null }
              : {}),
          },
        });
      }

      const effectiveKind = body.kind ?? treatment.kind;

      if (body.cycleNumber !== undefined || body.notes !== undefined) {
        if (effectiveKind === "IVF") {
          await tx.iVFCycle.upsert({
            where: { treatmentId: treatment.id },
            create: {
              treatmentId: treatment.id,
              cycleNumber: body.cycleNumber ?? 1,
              notes: body.notes ?? null,
            },
            update: {
              ...(body.cycleNumber !== undefined ? { cycleNumber: body.cycleNumber } : {}),
              ...(body.notes !== undefined ? { notes: body.notes } : {}),
            },
          });
        } else if (effectiveKind === "IUI") {
          await tx.iUICycle.upsert({
            where: { treatmentId: treatment.id },
            create: {
              treatmentId: treatment.id,
              cycleNumber: body.cycleNumber ?? 1,
              notes: body.notes ?? null,
            },
            update: {
              ...(body.cycleNumber !== undefined ? { cycleNumber: body.cycleNumber } : {}),
              ...(body.notes !== undefined ? { notes: body.notes } : {}),
            },
          });
        }
      }

      if (treatment.carePlanId && body.status) {
        const planStatus =
          body.status === "COMPLETED"
            ? "COMPLETED"
            : body.status === "CANCELLED"
              ? "CANCELLED"
              : "ACTIVE";
        await tx.carePlan.update({
          where: { id: treatment.carePlanId },
          data: {
            status: planStatus,
          },
        }).catch(() => undefined);
      }

      return tx.treatment.findUnique({
        where: { id: treatment.id },
        include: {
          ivfCycle: true,
          iuiCycle: true,
          couple: {
            include: {
              primaryPatient: true,
              partnerPatient: true,
              assignedDoctor: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    if (!updated) throw notFound();

    try {
      await audit(tenant, "treatment.update", "Treatment", updated.id, {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        kind: updated.kind,
        status: updated.status,
        label: updated.label,
        stageName: updated.stageName,
      });
    } catch {
      // Non-fatal
    }

    return ok(c, serializeTreatment(updated));
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
    let existing = await prisma.couple.findUnique({ where: { id } });
    if (!existing) {
      existing = await prisma.couple.findFirst({
        where: { slug: id, clinicId: tenant.clinicId },
      });
    }
    await requireClinicOwned(tenant, existing);
    const targetId = existing!.id;
    await prisma.couple.update({
      where: { id: targetId },
      data: {
        ...(body.assignedDoctorId === undefined ? {} : { assignedDoctorId: body.assignedDoctorId }),
        ...(body.assignedCoordinatorId === undefined
          ? {}
          : { assignedCoordinatorId: body.assignedCoordinatorId }),
        ...(body.careLoopActive === undefined ? {} : { careLoopActive: body.careLoopActive }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
    });
    const couple = await loadCouple(tenant, targetId);
    if (!couple) throw notFound();
    await audit(tenant, "couple.update", "Couple", couple.id, {
      patient: `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim(),
    });
    return ok(c, serializeCouple(couple));
  })
  .delete("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const permanent = c.req.query("permanent") === "1" || c.req.query("permanent") === "true";

    let targetId = id;
    const existing = await prisma.couple.findUnique({ where: { id } });
    if (!existing) {
      const bySlug = await prisma.couple.findFirst({
        where: {
          slug: id,
          clinicId: tenant.clinicId,
          clinic: { organizationId: tenant.organizationId },
        },
        select: { id: true },
      });
      if (!bySlug) throw notFound();
      targetId = bySlug.id;
    } else {
      await requireClinicOwned(tenant, existing);
    }

    const result = await deleteCoupleRecord(tenant, targetId, { permanent });
    try {
      await audit(
        tenant,
        result.mode === "permanent" ? "couple.delete" : "couple.archive",
        "Couple",
        targetId,
        {
          clinicId: tenant.clinicId,
          patient: result.patientName,
          mode: result.mode,
        },
      );
    } catch {
      // audit failure should not break request
    }
    return ok(c, result);
  });

