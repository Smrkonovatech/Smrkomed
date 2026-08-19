import { Hono } from "hono";
import { PERMISSIONS, getPatientsForClinic, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { createPatientSchema, idParam, updatePatientSchema } from "./schemas";

export const patientRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const patients = await getPatientsForClinic(tenant);
    return ok(c, patients);
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
        ...(body.dateOfBirth === undefined ? {} : { dateOfBirth: new Date(body.dateOfBirth) }),
        ...(body.gender === undefined ? {} : { gender: body.gender }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.whatsappNumber === undefined ? {} : { whatsappNumber: body.whatsappNumber }),
        ...(body.email === undefined ? {} : { email: body.email }),
        ...(body.preferredLanguage === undefined ? {} : { preferredLanguage: body.preferredLanguage }),
      },
    });
    await audit(tenant, "patient.create", "Patient", patient.id, { clinicId: tenant.clinicId });
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
        ...(body.dateOfBirth === undefined ? {} : { dateOfBirth: new Date(body.dateOfBirth) }),
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
  });
