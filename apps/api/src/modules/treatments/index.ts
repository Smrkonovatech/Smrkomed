import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const idParam = z.object({ id: z.string().min(1) });

export const updateTreatmentSchema = z.object({
  kind: z.enum(["IVF", "IUI", "EVALUATION", "FET"]).optional(),
  label: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["ACTIVE", "NEEDS_ATTENTION", "COMPLETED", "CANCELLED"]).optional(),
  stageIndex: z.number().int().min(0).max(30).optional(),
  stageName: z.string().trim().max(200).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  cycleNumber: z.number().int().min(1).max(50).optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export const createTreatmentSchema = z.object({
  coupleId: z.string().min(1),
  kind: z.enum(["IVF", "IUI", "EVALUATION", "FET"]).default("IVF"),
  label: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["ACTIVE", "NEEDS_ATTENTION", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
  stageIndex: z.number().int().min(0).max(30).default(0),
  stageName: z.string().trim().max(200).optional().default("Consultation"),
  startedAt: z.string().datetime().optional().nullable(),
  cycleNumber: z.number().int().min(1).max(50).optional().default(1),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export function serializeTreatment(treatment: any) {
  return {
    id: treatment.id,
    clinicId: treatment.clinicId,
    coupleId: treatment.coupleId,
    carePlanId: treatment.carePlanId ?? null,
    kind: treatment.kind,
    label: treatment.label,
    status: treatment.status,
    stageIndex: treatment.stageIndex,
    stageName: treatment.stageName,
    startedAt: treatment.startedAt ? treatment.startedAt.toISOString() : null,
    createdAt: treatment.createdAt ? treatment.createdAt.toISOString() : null,
    updatedAt: treatment.updatedAt ? treatment.updatedAt.toISOString() : null,
    cycleNumber: treatment.ivfCycle?.cycleNumber ?? treatment.iuiCycle?.cycleNumber ?? 1,
    notes: treatment.ivfCycle?.notes ?? treatment.iuiCycle?.notes ?? null,
    ivfCycle: treatment.ivfCycle
      ? {
          id: treatment.ivfCycle.id,
          cycleNumber: treatment.ivfCycle.cycleNumber,
          notes: treatment.ivfCycle.notes,
        }
      : null,
    iuiCycle: treatment.iuiCycle
      ? {
          id: treatment.iuiCycle.id,
          cycleNumber: treatment.iuiCycle.cycleNumber,
          notes: treatment.iuiCycle.notes,
        }
      : null,
    couple: treatment.couple
      ? {
          id: treatment.couple.id,
          slug: treatment.couple.slug,
          primaryPatient: treatment.couple.primaryPatient
            ? {
                id: treatment.couple.primaryPatient.id,
                name: `${treatment.couple.primaryPatient.firstName || ""} ${treatment.couple.primaryPatient.lastName || ""}`.trim(),
              }
            : null,
          partnerPatient: treatment.couple.partnerPatient
            ? {
                id: treatment.couple.partnerPatient.id,
                name: `${treatment.couple.partnerPatient.firstName || ""} ${treatment.couple.partnerPatient.lastName || ""}`.trim(),
              }
            : null,
          doctorName: treatment.couple.assignedDoctor?.name ?? null,
        }
      : null,
  };
}

export const treatmentRoutes = new Hono<AppEnv>()
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");

    const treatment = await prisma.treatment.findFirst({
      where: { id, clinicId: tenant.clinicId },
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

    if (!treatment) throw notFound();
    return ok(c, serializeTreatment(treatment));
  })
  .patch("/:id", validate("param", idParam), validate("json", updateTreatmentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await prisma.treatment.findFirst({
      where: { id, clinicId: tenant.clinicId },
      include: {
        ivfCycle: true,
        iuiCycle: true,
        couple: {
          include: {
            primaryPatient: true,
          },
        },
      },
    });
    if (!existing) throw notFound();
    await requireClinicOwned(tenant, existing);

    const updated = await prisma.$transaction(async (tx) => {
      const treatment = await tx.treatment.update({
        where: { id: existing.id },
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

      const effectiveKind = body.kind ?? existing.kind;

      if (body.cycleNumber !== undefined || body.notes !== undefined) {
        if (effectiveKind === "IVF") {
          await tx.iVFCycle.upsert({
            where: { treatmentId: existing.id },
            create: {
              treatmentId: existing.id,
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
            where: { treatmentId: existing.id },
            create: {
              treatmentId: existing.id,
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

      if (existing.carePlanId && body.status) {
        const planStatus =
          body.status === "COMPLETED"
            ? "COMPLETED"
            : body.status === "CANCELLED"
              ? "CANCELLED"
              : "ACTIVE";
        await tx.carePlan.update({
          where: { id: existing.carePlanId },
          data: {
            status: planStatus,
          },
        }).catch(() => undefined);
      }

      return tx.treatment.findUnique({
        where: { id: existing.id },
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
        coupleId: updated.coupleId,
        kind: updated.kind,
        status: updated.status,
        stageName: updated.stageName,
        label: updated.label,
      });
    } catch {
      // Audit non-fatal
    }

    return ok(c, serializeTreatment(updated));
  })
  .post("/", validate("json", createTreatmentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const body = c.req.valid("json");

    let couple = await prisma.couple.findFirst({
      where: { id: body.coupleId, clinicId: tenant.clinicId },
    });
    if (!couple) {
      couple = await prisma.couple.findFirst({
        where: { slug: body.coupleId, clinicId: tenant.clinicId },
      });
    }
    if (!couple) throw notFound();

    const created = await prisma.$transaction(async (tx) => {
      const defaultLabel =
        body.label ||
        (body.kind === "EVALUATION"
          ? "Fertility Evaluation"
          : `${body.kind} Cycle ${body.cycleNumber ?? 1}`);

      const treatment = await tx.treatment.create({
        data: {
          clinicId: tenant.clinicId,
          coupleId: couple.id,
          kind: body.kind,
          label: defaultLabel,
          status: body.status,
          stageIndex: body.stageIndex,
          stageName: body.stageName || "Consultation",
          startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        },
      });

      if (body.kind === "IVF") {
        await tx.iVFCycle.create({
          data: {
            treatmentId: treatment.id,
            cycleNumber: body.cycleNumber ?? 1,
            notes: body.notes ?? null,
          },
        });
      } else if (body.kind === "IUI") {
        await tx.iUICycle.create({
          data: {
            treatmentId: treatment.id,
            cycleNumber: body.cycleNumber ?? 1,
            notes: body.notes ?? null,
          },
        });
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

    if (!created) throw notFound();

    try {
      await audit(tenant, "treatment.create", "Treatment", created.id, {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        kind: created.kind,
        label: created.label,
      });
    } catch {
      // Audit non-fatal
    }

    return ok(c, serializeTreatment(created), 201);
  });
