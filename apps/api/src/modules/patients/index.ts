import { Hono } from "hono";
import { PERMISSIONS, buildPatient360ByPatientId, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { createPatientSchema, idParam, updatePatientSchema } from "./schemas";

export const patientRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const q = c.req.query("q")?.trim().toLowerCase();
    const includeArchived = c.req.query("includeArchived") === "1";
    const patients = await prisma.patient.findMany({
      where: {
        clinicId: tenant.clinicId,
        clinic: { organizationId: tenant.organizationId },
        ...(includeArchived ? {} : { status: { not: "ARCHIVED" } }),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        primaryCouples: { select: { id: true, slug: true }, take: 1 },
        partnerCouples: { select: { id: true, slug: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(c, patients);
  })
  .get("/:id/360", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const payload = await buildPatient360ByPatientId(tenant, id);
    if (!payload) throw notFound();
    return ok(c, payload);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const patient = await prisma.patient.findUnique({ where: { id } });
    return ok(c, await requireClinicOwned(tenant, patient));
  })
  .post("/", validate("json", createPatientSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const body = c.req.valid("json");
    const patient = await prisma.patient.create({
      data: {
        clinicId: tenant.clinicId,
        firstName: body.firstName,
        lastName: body.lastName,
        ...(body.dateOfBirth === undefined ? {} : { dateOfBirth: new Date(body.dateOfBirth.includes("T") ? body.dateOfBirth : `${body.dateOfBirth}T00:00:00`) }),
        ...(body.gender === undefined ? {} : { gender: body.gender }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.whatsappNumber === undefined ? {} : { whatsappNumber: body.whatsappNumber }),
        ...(body.email === undefined ? {} : { email: body.email }),
        ...(body.preferredLanguage === undefined ? {} : { preferredLanguage: body.preferredLanguage }),
      },
    });
    await audit(tenant, "patient.create", "Patient", patient.id, { clinicId: tenant.clinicId });
    void import("../whatsapp-automation/triggers")
      .then(({ dispatchWhatsAppTrigger }) =>
        dispatchWhatsAppTrigger({
          tenant,
          triggerType: "PATIENT_CREATED",
          triggerEventId: patient.id,
          patientId: patient.id,
          vars: {
            patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
            patient_first_name: patient.firstName,
            clinic_name: tenant.clinicName,
          },
        }),
      )
      .catch(() => undefined);
    return ok(c, patient, 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updatePatientSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.patient.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(body.firstName === undefined ? {} : { firstName: body.firstName }),
        ...(body.lastName === undefined ? {} : { lastName: body.lastName }),
        ...(body.dateOfBirth === undefined ? {} : { dateOfBirth: new Date(body.dateOfBirth.includes("T") ? body.dateOfBirth : `${body.dateOfBirth}T00:00:00`) }),
        ...(body.gender === undefined ? {} : { gender: body.gender }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.whatsappNumber === undefined ? {} : { whatsappNumber: body.whatsappNumber }),
        ...(body.email === undefined ? {} : { email: body.email }),
        ...(body.preferredLanguage === undefined ? {} : { preferredLanguage: body.preferredLanguage }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
    });
    await audit(tenant, "patient.update", "Patient", patient.id, { clinicId: tenant.clinicId });
    return ok(c, patient);
  })
  .delete("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const { id } = c.req.valid("param");
    const permanent = c.req.query("permanent") === "1" || c.req.query("permanent") === "true";
    const patientRecord = await prisma.patient.findUnique({
      where: { id },
      include: {
        primaryCouples: { select: { id: true } },
        partnerCouples: { select: { id: true } },
      },
    });
    const existing = await requireClinicOwned(tenant, patientRecord);

    const isPermanent = permanent;
    if (isPermanent) {
      await prisma.$transaction(async (tx) => {
        // Find all couples where this patient is primary
        for (const couple of existing.primaryCouples) {
          const convs = await tx.conversation.findMany({
            where: { coupleId: couple.id },
            select: { id: true },
          });
          if (convs.length > 0) {
            const cIds = convs.map((x) => x.id);
            await tx.aIInteraction.deleteMany({ where: { conversationId: { in: cIds } } });
            await tx.whatsAppMedia.deleteMany({ where: { conversationId: { in: cIds } } });
            await tx.message.deleteMany({ where: { conversationId: { in: cIds } } });
            await tx.conversation.deleteMany({ where: { id: { in: cIds } } });
          }
          await tx.document.deleteMany({ where: { coupleId: couple.id } });
          await tx.escalation.deleteMany({ where: { coupleId: couple.id } });
          await tx.lead.updateMany({ where: { coupleId: couple.id }, data: { coupleId: null } });
          await tx.billingPayment.deleteMany({ where: { coupleId: couple.id } });
          await tx.billingInvoice.deleteMany({ where: { coupleId: couple.id } });
          await tx.pharmacyPrescription.deleteMany({ where: { coupleId: couple.id } });
          await tx.pharmacySale.deleteMany({ where: { coupleId: couple.id } });
          await tx.insuranceClaim.deleteMany({ where: { coupleId: couple.id } });
          await tx.insurancePolicy.deleteMany({ where: { coupleId: couple.id } });
          await tx.appointment.deleteMany({ where: { coupleId: couple.id } });
          await tx.careTask.deleteMany({ where: { coupleId: couple.id } });
          await tx.carePlan.deleteMany({ where: { coupleId: couple.id } });
          await tx.treatment.deleteMany({ where: { coupleId: couple.id } });
          await tx.consultationNote.deleteMany({ where: { coupleId: couple.id } });
          await tx.couple.delete({ where: { id: couple.id } });
        }

        // Unlink as partner in any partnerCouples
        await tx.couple.updateMany({
          where: { partnerPatientId: existing.id },
          data: { partnerPatientId: null },
        });

        // Clean up direct patient records
        const patientConvs = await tx.conversation.findMany({
          where: { patientId: existing.id },
          select: { id: true },
        });
        if (patientConvs.length > 0) {
          const pIds = patientConvs.map((x) => x.id);
          await tx.aIInteraction.deleteMany({ where: { conversationId: { in: pIds } } });
          await tx.whatsAppMedia.deleteMany({ where: { conversationId: { in: pIds } } });
          await tx.message.deleteMany({ where: { conversationId: { in: pIds } } });
          await tx.conversation.deleteMany({ where: { id: { in: pIds } } });
        }
        await tx.aIInteraction.deleteMany({ where: { patientId: existing.id } });
        await tx.consent.deleteMany({ where: { patientId: existing.id } });
        await tx.document.deleteMany({ where: { patientId: existing.id } });
        await tx.lead.updateMany({
          where: { patientId: existing.id },
          data: { patientId: null },
        });
        await tx.billingPayment.deleteMany({ where: { patientId: existing.id } });
        await tx.billingInvoice.deleteMany({ where: { patientId: existing.id } });
        await tx.pharmacyPrescription.deleteMany({ where: { patientId: existing.id } });
        await tx.pharmacySale.deleteMany({ where: { patientId: existing.id } });
        await tx.insuranceClaim.deleteMany({ where: { patientId: existing.id } });
        await tx.insurancePolicy.deleteMany({ where: { patientId: existing.id } });
        await tx.patient.delete({ where: { id: existing.id } });
      }, { timeout: 30000, maxWait: 10000 });
    } else {
      // Archive patient and associated primary couples
      await prisma.$transaction(async (tx) => {
        await tx.patient.update({
          where: { id: existing.id },
          data: { status: "ARCHIVED" },
        });
        const coupleIds = existing.primaryCouples.map((c) => c.id);
        if (coupleIds.length > 0) {
          await tx.couple.updateMany({
            where: { id: { in: coupleIds } },
            data: { status: "ARCHIVED", careLoopActive: false },
          });
        }
      });
    }

    try {
      await audit(
        tenant,
        isPermanent ? "patient.delete" : "patient.archive",
        "Patient",
        existing.id,
        {
          clinicId: tenant.clinicId,
          name: `${existing.firstName} ${existing.lastName}`.trim(),
          mode: isPermanent ? "permanent" : "archived",
        },
      );
    } catch {
      // audit failure should not break request
    }

    return ok(c, {
      deleted: true,
      mode: isPermanent ? "permanent" : "archived",
      id: existing.id,
    });
  });

