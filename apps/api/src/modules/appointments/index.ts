import { Hono } from "hono";
import { PERMISSIONS, getAppointmentsForClinic, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { serializeAppointment } from "../clinic-dto";
import { createAppointmentSchema, idParam, updateAppointmentSchema } from "./schemas";

export const appointmentRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const appointments = await getAppointmentsForClinic(tenant);
    return ok(c, appointments.map(serializeAppointment));
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    return ok(c, serializeAppointment(await requireClinicOwned(tenant, appointment)));
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
    await audit(tenant, "appointment.create", "Appointment", appointment.id, { patient: body.type });
    // Fire ACTIVE WhatsApp flows (idempotent). Failures are isolated and never block booking.
    void import("../whatsapp-automation/triggers")
      .then(({ dispatchWhatsAppTrigger }) =>
        dispatchWhatsAppTrigger({
          tenant,
          triggerType: "APPOINTMENT_BOOKED",
          triggerEventId: appointment.id,
          coupleId: couple.id,
          vars: {
            appointment_date: appointment.startsAt.toISOString().slice(0, 10),
            appointment_time: appointment.startsAt.toISOString().slice(11, 16),
            doctor_name: appointment.doctorName ?? "",
            clinic_name: tenant.clinicName,
          },
        }),
      )
      .catch(() => undefined);
    return ok(c, serializeAppointment(appointment), 201);
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
    if (body.status === "NO_SHOW") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "APPOINTMENT_MISSED",
            triggerEventId: `appt_missed_${appointment.id}`,
            coupleId: appointment.coupleId,
            vars: {
              appointment_date: appointment.startsAt.toISOString().slice(0, 10),
              appointment_time: appointment.startsAt.toISOString().slice(11, 16),
              doctor_name: appointment.doctorName ?? "",
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }
    if (body.status === "CANCELLED") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "APPOINTMENT_CANCELLED",
            triggerEventId: `appt_cancelled_${appointment.id}`,
            coupleId: appointment.coupleId,
            vars: {
              appointment_date: appointment.startsAt.toISOString().slice(0, 10),
              appointment_time: appointment.startsAt.toISOString().slice(11, 16),
              doctor_name: appointment.doctorName ?? "",
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }
    if (body.startsAt !== undefined && existing && existing.startsAt.getTime() !== appointment.startsAt.getTime()) {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "APPOINTMENT_RESCHEDULED",
            triggerEventId: `appt_resched_${appointment.id}_${appointment.startsAt.toISOString()}`,
            coupleId: appointment.coupleId,
            vars: {
              appointment_date: appointment.startsAt.toISOString().slice(0, 10),
              appointment_time: appointment.startsAt.toISOString().slice(11, 16),
              doctor_name: appointment.doctorName ?? "",
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }
    return ok(c, serializeAppointment(appointment));
  });
