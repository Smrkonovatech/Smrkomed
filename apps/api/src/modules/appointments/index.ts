import { Hono } from "hono";
import { PERMISSIONS, getAppointmentsForClinic, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { createAppointmentSchema, idParam, updateAppointmentSchema } from "./schemas";

export const appointmentRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const appointments = await getAppointmentsForClinic(tenant);
    return ok(c, appointments);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    return ok(c, await requireClinicOwned(tenant, appointment));
  })
  .post("/", validate("json", createAppointmentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.APPOINTMENTS_WRITE);
    const body = c.req.valid("json");
    const couple = await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        type: body.type,
        startsAt: new Date(body.startsAt),
        ...(body.durationMin === undefined ? {} : { durationMin: body.durationMin }),
        ...(body.doctorName === undefined ? {} : { doctorName: body.doctorName }),
        ...(body.room === undefined ? {} : { room: body.room }),
        ...(body.notes === undefined ? {} : { notes: body.notes }),
      },
    });
    await audit(tenant, "appointment.create", "Appointment", appointment.id);
    return ok(c, appointment, 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateAppointmentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.APPOINTMENTS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.appointment.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.type === undefined ? {} : { type: body.type }),
        ...(body.startsAt === undefined ? {} : { startsAt: new Date(body.startsAt) }),
        ...(body.durationMin === undefined ? {} : { durationMin: body.durationMin }),
        ...(body.doctorName === undefined ? {} : { doctorName: body.doctorName }),
        ...(body.room === undefined ? {} : { room: body.room }),
        ...(body.notes === undefined ? {} : { notes: body.notes }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
    });
    await audit(tenant, "appointment.update", "Appointment", appointment.id);
    return ok(c, appointment);
  });
