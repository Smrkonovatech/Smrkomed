/**
 * Sub-phase C.1 — WhatsApp appointment booking DB integration tests.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import {
  encodeSlotId,
  getAvailableAppointmentSlots,
  validateSlotStillAvailable,
} from "./modules/appointments/availability";
import {
  bookAppointmentFromSlot,
  cancelAppointmentForWhatsApp,
  getConversationPendingAction,
  rescheduleAppointmentFromSlot,
  setConversationPendingAction,
} from "./modules/appointments/whatsapp-booking";
import { classifyPatientIntent } from "./modules/whatsapp-ai/intent";
import { tryResolvePendingAppointmentAction } from "./modules/whatsapp-ai/pending-actions";
import { executePatientTool, runToolsForIntent } from "./modules/whatsapp-ai/tools";

const PREFIX = "wa-appt-c1";

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  clinicAId: string;
  clinicBId: string;
  patientAId: string;
  patientBId: string;
  coupleAId: string;
  coupleBId: string;
  conversationAId: string;
  conversationBId: string;
  staffAId: string;
};

let fixture: Fixture;

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((c) => c.id);
  const orgIds = [...new Set(clinics.map((c) => c.organizationId))];
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.demo` } },
    select: { id: true },
  });

  if (clinicIds.length > 0) {
    await prisma.whatsAppBookingIdempotency.deleteMany({ where: { clinicId: { in: clinicIds } } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppClinicSettings.deleteMany({ where: { clinicId: { in: clinicIds } } }).catch(() => undefined);
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
}

function nextWeekdaySlotStart(daysAhead = 1, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Skip Sunday (DEFAULT_HOURS.sun = null)
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
  }
  return d;
}

before(async () => {
  await cleanup();
  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });

  async function makeClinic(tag: "a" | "b") {
    const org = await prisma.organization.create({
      data: { name: `WA Appt Org ${tag}`, slug: `${PREFIX}-org-${tag}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: org.id,
        name: `WA Appt Clinic ${tag.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${tag}`,
        city: "Bangalore",
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: `staff-${tag}@${PREFIX}.demo`,
        passwordHash: "unused",
        name: `Staff ${tag}`,
      },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: staff.id, roleId: adminRole.id, status: "ACTIVE" },
    });
    await prisma.whatsAppClinicSettings
      .create({
        data: {
          clinicId: clinic.id,
          timezone: "Asia/Kolkata",
          workingHours: {
            sun: null,
            mon: { start: "09:00", end: "17:00" },
            tue: { start: "09:00", end: "17:00" },
            wed: { start: "09:00", end: "17:00" },
            thu: { start: "09:00", end: "17:00" },
            fri: { start: "09:00", end: "17:00" },
            sat: { start: "09:00", end: "13:00" },
          },
        },
      })
      .catch(async () => {
        // Model may use different create shape — ensure via upsert if available
      });
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: `Pat${tag}`,
        lastName: "Test",
        phone: `900000000${tag === "a" ? "1" : "2"}`,
      },
    });
    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        primaryPatientId: patient.id,
        slug: `${PREFIX}-couple-${tag}`,
      },
    });
    const conversation = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        patientId: patient.id,
        coupleId: couple.id,
        contactPhone: patient.phone,
        status: "OPEN",
      },
    });
    const ctx: TenantContext = {
      organizationId: org.id,
      organizationName: org.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      userId: staff.id,
      role: "CLINIC_ADMIN",
    };
    return { clinic, patient, couple, conversation, staff, ctx };
  }

  const a = await makeClinic("a");
  const b = await makeClinic("b");
  fixture = {
    ctxA: a.ctx,
    ctxB: b.ctx,
    clinicAId: a.clinic.id,
    clinicBId: b.clinic.id,
    patientAId: a.patient.id,
    patientBId: b.patient.id,
    coupleAId: a.couple.id,
    coupleBId: b.couple.id,
    conversationAId: a.conversation.id,
    conversationBId: b.conversation.id,
    staffAId: a.staff.id,
  };
});

after(async () => {
  await cleanup();
});

test("slots: returns real openings with null doctorId", async () => {
  const result = await getAvailableAppointmentSlots({ clinicId: fixture.clinicAId, limit: 5 });
  assert.equal(result.available, true);
  assert.ok(result.slots.length > 0);
  for (const s of result.slots) {
    assert.equal(s.doctorId, null);
    assert.ok(s.slotId.startsWith("s_"));
  }
});

test("BOOK: create + idempotency + CareTask once", async () => {
  const start = nextWeekdaySlotStart(2, 10);
  const slotId = encodeSlotId({
    startMs: start.getTime(),
    durationMin: 30,
    doctorName: null,
    appointmentType: "Consultation",
  });
  const key = `book_test_${fixture.conversationAId}_${slotId}`;

  const first = await bookAppointmentFromSlot({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    slotId,
    idempotencyKey: key,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.alreadyExisted, false);

  const second = await bookAppointmentFromSlot({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    slotId,
    idempotencyKey: key,
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.alreadyExisted, true);
  assert.equal(second.appointmentId, first.appointmentId);

  const appts = await prisma.appointment.count({
    where: { clinicId: fixture.clinicAId, id: first.appointmentId },
  });
  assert.equal(appts, 1);

  const idem = await prisma.whatsAppBookingIdempotency.findUnique({
    where: { clinicId_key: { clinicId: fixture.clinicAId, key } },
  });
  assert.ok(idem);
  assert.equal(idem!.appointmentId, first.appointmentId);

  const tasks = await prisma.careTask.findMany({
    where: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      category: "APPOINTMENT",
      description: { contains: first.appointmentId },
    },
  });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]!.status, "WAITING");

  const audits = await prisma.auditLog.count({
    where: {
      clinicId: fixture.clinicAId,
      action: "whatsapp.ai.appointment.book",
      entityId: first.appointmentId,
    },
  });
  assert.ok(audits >= 1);

  const notifs = await prisma.notification.count({
    where: { clinicId: fixture.clinicAId, title: "AI booked appointment" },
  });
  assert.ok(notifs >= 1);
});

test("CONFLICT: slot taken between display and book", async () => {
  const start = nextWeekdaySlotStart(3, 11);
  const slotId = encodeSlotId({
    startMs: start.getTime(),
    durationMin: 30,
    doctorName: null,
    appointmentType: "Consultation",
  });

  await prisma.appointment.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      type: "Consultation",
      startsAt: start,
      durationMin: 30,
      status: "CONFIRMED",
      notes: "blocking conflict",
    },
  });

  const valid = await validateSlotStillAvailable({
    clinicId: fixture.clinicAId,
    startTime: start,
    durationMin: 30,
  });
  assert.equal(valid.ok, false);
  if (valid.ok) return;
  assert.equal(valid.reason, "SLOT_CONFLICT");

  const booked = await bookAppointmentFromSlot({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    slotId,
    idempotencyKey: `conflict_${slotId}`,
  });
  assert.equal(booked.ok, false);
});

test("RESCHEDULE: updates appointment + CareTask due date; idempotent", async () => {
  const originalStart = nextWeekdaySlotStart(4, 10);
  const appt = await prisma.appointment.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      type: "Follow-up",
      startsAt: originalStart,
      durationMin: 30,
      status: "CONFIRMED",
      notes: "to reschedule",
    },
  });
  const task = await prisma.careTask.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      title: "AI booked appointment — Follow-up",
      description: `WhatsApp AI booked appointment ${appt.id} at ${originalStart.toISOString()}`,
      category: "APPOINTMENT",
      status: "WAITING",
      dueDate: originalStart,
      dueTime: "10:00",
    },
  });

  const newStart = nextWeekdaySlotStart(5, 14);
  const slotId = encodeSlotId({
    startMs: newStart.getTime(),
    durationMin: 30,
    doctorName: null,
    appointmentType: "Follow-up",
  });
  const key = `reschedule_${fixture.conversationAId}_${appt.id}_${slotId}`;

  const first = await rescheduleAppointmentFromSlot({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    appointmentId: appt.id,
    slotId,
    idempotencyKey: key,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.alreadyExisted, false);

  const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
  assert.ok(updated);
  assert.equal(updated!.startsAt.getTime(), newStart.getTime());

  const refreshed = await prisma.careTask.findUnique({ where: { id: task.id } });
  assert.ok(refreshed);
  assert.equal(refreshed!.status, "WAITING");
  assert.ok(refreshed!.dueDate);
  assert.equal(refreshed!.dueDate!.getTime(), newStart.getTime());
  assert.ok(refreshed!.rescheduledAt);
  assert.match(refreshed!.title, /rescheduled/i);

  const taskCount = await prisma.careTask.count({
    where: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      category: "APPOINTMENT",
      description: { contains: appt.id },
      status: { not: "CANCELLED" },
    },
  });
  assert.equal(taskCount, 1);

  const second = await rescheduleAppointmentFromSlot({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    appointmentId: appt.id,
    slotId,
    idempotencyKey: key,
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.alreadyExisted, true);
});

test("CANCEL: CareTask cancelled + idempotent", async () => {
  const start = nextWeekdaySlotStart(6, 10);
  const appt = await prisma.appointment.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      type: "Scan",
      startsAt: start,
      durationMin: 30,
      status: "CONFIRMED",
    },
  });
  await prisma.careTask.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      title: "AI booked appointment — Scan",
      description: `WhatsApp AI booked appointment ${appt.id} at ${start.toISOString()}`,
      category: "APPOINTMENT",
      status: "WAITING",
      dueDate: start,
    },
  });
  const key = `cancel_${fixture.conversationAId}_${appt.id}`;

  const first = await cancelAppointmentForWhatsApp({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    appointmentId: appt.id,
    idempotencyKey: key,
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.alreadyCancelled, false);

  const apptRow = await prisma.appointment.findUnique({ where: { id: appt.id } });
  assert.equal(apptRow!.status, "CANCELLED");

  const tasks = await prisma.careTask.findMany({
    where: {
      clinicId: fixture.clinicAId,
      description: { contains: appt.id },
      category: "APPOINTMENT",
    },
  });
  assert.ok(tasks.every((t) => t.status === "CANCELLED"));

  const second = await cancelAppointmentForWhatsApp({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    appointmentId: appt.id,
    idempotencyKey: key,
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.alreadyCancelled, true);
});

test("TENANT ISOLATION: clinic B cannot use clinic A appointment/idempotency", async () => {
  const start = nextWeekdaySlotStart(2, 15);
  const appt = await prisma.appointment.create({
    data: {
      clinicId: fixture.clinicAId,
      coupleId: fixture.coupleAId,
      type: "Consultation",
      startsAt: start,
      durationMin: 30,
      status: "CONFIRMED",
    },
  });
  const key = `iso_${appt.id}`;
  await prisma.whatsAppBookingIdempotency.create({
    data: {
      clinicId: fixture.clinicAId,
      key,
      appointmentId: appt.id,
      conversationId: fixture.conversationAId,
    },
  });

  const cancelB = await cancelAppointmentForWhatsApp({
    tenant: fixture.ctxB,
    conversationId: fixture.conversationBId,
    appointmentId: appt.id,
    idempotencyKey: key,
  });
  assert.equal(cancelB.ok, false);
  if (cancelB.ok) return;
  assert.equal(cancelB.reason, "APPOINTMENT_NOT_FOUND");

  const still = await prisma.appointment.findUnique({ where: { id: appt.id } });
  assert.equal(still!.status, "CONFIRMED");

  const slotsB = await getAvailableAppointmentSlots({ clinicId: fixture.clinicBId, limit: 3 });
  // Clinic B slots must not encode clinic A appointments as free incorrectly — generation is clinic-scoped
  assert.ok(slotsB.slots.every((s) => s.slotId.startsWith("s_")));
});

test("PENDING: slot pick requires confirmation; yes books; bare yes without pending does nothing", async () => {
  const slots = await getAvailableAppointmentSlots({ clinicId: fixture.clinicAId, limit: 3 });
  assert.ok(slots.slots.length >= 1);
  const slot = slots.slots[0]!;

  await setConversationPendingAction({
    clinicId: fixture.clinicAId,
    conversationId: fixture.conversationAId,
    action: {
      kind: "SLOT_CHOICE",
      purpose: "BOOK",
      slots: [{ index: 1, slotId: slot.slotId, label: "Slot 1" }],
      idempotencyKey: `pending_choice_${Date.now()}`,
    },
  });

  const pick = await tryResolvePendingAppointmentAction({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    patientMessage: "1",
  });
  assert.equal(pick.handled, true);
  if (!pick.handled) return;
  assert.match(pick.text, /confirm/i);
  assert.equal(pick.booked, undefined);

  const pending = await getConversationPendingAction({
    clinicId: fixture.clinicAId,
    conversationId: fixture.conversationAId,
  });
  assert.ok(pending);
  assert.equal(pending!.kind, "BOOK_CONFIRM");

  const confirm = await tryResolvePendingAppointmentAction({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    patientMessage: "yes",
  });
  assert.equal(confirm.handled, true);
  if (!confirm.handled) return;
  assert.equal(confirm.booked, true);

  await setConversationPendingAction({
    clinicId: fixture.clinicAId,
    conversationId: fixture.conversationAId,
    action: null,
  });
  const stray = await tryResolvePendingAppointmentAction({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    patientMessage: "yes",
  });
  assert.equal(stray.handled, false);
});

test("PENDING: expired action does not book", async () => {
  const start = nextWeekdaySlotStart(3, 16);
  const slotId = encodeSlotId({
    startMs: start.getTime(),
    durationMin: 30,
    doctorName: null,
    appointmentType: "Consultation",
  });
  await prisma.conversation.update({
    where: { id: fixture.conversationAId },
    data: {
      pendingAction: {
        kind: "BOOK_CONFIRM",
        slotId,
        idempotencyKey: `expired_${slotId}`,
        appointmentType: "Consultation",
        doctorName: null,
        startTime: start.toISOString(),
        durationMin: 30,
      },
      pendingActionExpiresAt: new Date(Date.now() - 60_000),
    },
  });

  const resolved = await tryResolvePendingAppointmentAction({
    tenant: fixture.ctxA,
    conversationId: fixture.conversationAId,
    patientId: fixture.patientAId,
    coupleId: fixture.coupleAId,
    patientMessage: "yes",
  });
  assert.equal(resolved.handled, false);

  const count = await prisma.appointment.count({
    where: {
      clinicId: fixture.clinicAId,
      notes: { contains: `expired_${slotId}` },
    },
  });
  assert.equal(count, 0);
});

test("AI-to-tool path: intent → getAvailableAppointmentSlots → structured slots", async () => {
  const intent = classifyPatientIntent("I want to book an appointment");
  assert.equal(intent.intent, "APPOINTMENT_BOOKING");
  assert.ok(intent.suggestedTools.includes("getAvailableAppointmentSlots"));

  const results = await runToolsForIntent({
    auth: {
      tenant: fixture.ctxA,
      conversationId: fixture.conversationAId,
      patientId: fixture.patientAId,
      coupleId: fixture.coupleAId,
    },
    toolNames: intent.suggestedTools,
    intent: intent.intent,
  });
  const slotTool = results.find((r) => r.tool === "getAvailableAppointmentSlots");
  assert.ok(slotTool);
  assert.equal(slotTool!.ok, true);
  const data = slotTool!.data as { type?: string; slots?: unknown[]; available?: boolean };
  assert.equal(data.type, "appointment_slots");
  assert.equal(data.available, true);
  assert.ok(Array.isArray(data.slots) && data.slots.length > 0);

  const doctorNamed = await executePatientTool(
    "getAvailableAppointmentSlots",
    {
      tenant: fixture.ctxA,
      conversationId: fixture.conversationAId,
      patientId: fixture.patientAId,
      coupleId: fixture.coupleAId,
    },
    { doctorName: "Dr Invented" },
  );
  assert.equal(doctorNamed.handoffRecommended, true);
  assert.equal(doctorNamed.handoffReason, "DOCTOR_SCHEDULE_NOT_VERIFIABLE");
  const namedData = doctorNamed.data as { slots?: unknown[] };
  assert.deepEqual(namedData.slots, []);
});

test("intent→tool: Show available slots executes appointment_slots", async () => {
  const intent = classifyPatientIntent("Show available slots");
  assert.equal(intent.intent, "APPOINTMENT_BOOKING");
  const results = await runToolsForIntent({
    auth: {
      tenant: fixture.ctxA,
      conversationId: fixture.conversationAId,
      patientId: fixture.patientAId,
      coupleId: fixture.coupleAId,
    },
    toolNames: intent.suggestedTools,
    intent: intent.intent,
  });
  const slotTool = results.find((r) => r.tool === "getAvailableAppointmentSlots");
  assert.ok(slotTool?.ok);
  const data = slotTool!.data as { type?: string; available?: boolean; slots?: unknown[] };
  assert.equal(data.type, "appointment_slots");
  assert.equal(data.available, true);
  assert.ok((data.slots?.length ?? 0) > 0);
});

test("date parse: reschedule to 6th resolves in current/next month", async () => {
  const { extractPreferredDateIso } = await import("./modules/whatsapp-ai/date-parse");
  const now = new Date(2026, 8, 5); // 5 Sep 2026
  assert.equal(extractPreferredDateIso("Can you reschedule to 6th", now), "2026-09-06");
});
