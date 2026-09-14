import { Hono } from "hono";
import { PERMISSIONS, prisma, type TenantContext } from "@smrkomed/database";
import { z } from "zod";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { fail, ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const idParam = z.object({ id: z.string().min(1) });
const appointmentIdParam = z.object({ appointmentId: z.string().min(1) });
const orderIdParam = z.object({ orderId: z.string().min(1) });

const recordConsultationSchema = z
  .object({
    status: z.enum(["IN_PROGRESS", "COMPLETED"]).default("COMPLETED"),
    reasonForVisit: z.string().trim().max(500).optional(),
    summary: z.string().trim().min(1).max(5000),
    nextSteps: z.string().trim().max(2000).optional(),
    clinicalNotes: z.string().trim().max(5000).optional(),
    impression: z.string().trim().max(1000).optional(),
    prescriptionNotes: z.string().trim().max(2000).optional(),
  })
  .strict();

const doctorReviewReportSchema = z
  .object({
    clinicalNotes: z.string().trim().max(2000).optional(),
    action: z.enum(["ACKNOWLEDGED", "APPROVED", "REPEAT_TEST", "FOLLOWUP_REQUIRED"]).default("APPROVED"),
  })
  .strict();

export const doctorRoutes = new Hono<AppEnv>()
  // ─── 1. Prepare My Day ───────────────────────────────────────────────────────
  .get("/prepare-my-day", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Today's Appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELLED" },
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
            treatments: {
              where: { status: "ACTIVE" },
              select: {
                id: true,
                kind: true,
                label: true,
                stageIndex: true,
                stageName: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    // 2. Reports Pending Review (Diagnostic tasks in active/waiting status with ready results)
    const pendingReports = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        category: "DIAGNOSTIC",
        status: { in: ["WAITING", "IN_PROGRESS", "ACTIVE" as any] },
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 3. Clinical Escalations (Overdue, High priority or Escalated tasks)
    const escalations = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [
          { status: "OVERDUE" },
          { priority: "HIGH" },
          { priority: "CLINICAL" },
          { lastAction: { in: ["ESCALATED", "ESCALATE", "PATIENT_UNWELL", "NEED_HELP"] } },
        ],
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 15,
    });

    // 4. Patients Needing Attention (Couples with escalations or recent missed appointments)
    const missedAppts = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        status: "NO_SHOW",
        startsAt: { gte: new Date(now.getTime() - 7 * 86400000) },
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
      },
      take: 10,
    });

    // 5. Active Treatment Patients (Active IVF & IUI cycles)
    const activeTreatments = await prisma.treatment.findMany({
      where: {
        clinicId: tenant.clinicId,
        status: "ACTIVE",
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
        ivfCycle: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    // Factual briefing summary (zero fabricated numbers)
    const briefingText = [
      `You have ${appointments.length} appointment${appointments.length === 1 ? "" : "s"} scheduled for today.`,
      pendingReports.length > 0
        ? `${pendingReports.length} diagnostic report${pendingReports.length === 1 ? "" : "s"} awaiting review.`
        : "No diagnostic reports pending review.",
      escalations.length > 0
        ? `${escalations.length} clinical escalation${escalations.length === 1 ? "" : "s"} requiring attention.`
        : "No active clinical escalations.",
      activeTreatments.length > 0
        ? `${activeTreatments.length} patient${activeTreatments.length === 1 ? "" : "s"} currently in active fertility treatment.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return ok(c, {
      briefing: {
        date: now.toISOString().slice(0, 10),
        summary: briefingText,
        metrics: {
          todayAppointmentsCount: appointments.length,
          pendingReportsCount: pendingReports.length,
          escalationsCount: escalations.length,
          activeTreatmentsCount: activeTreatments.length,
          missedFollowUpsCount: missedAppts.length,
        },
      },
      todayAppointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        type: a.type,
        status: a.status,
        doctorName: a.doctorName,
        durationMin: a.durationMin,
        room: a.room,
        notes: a.notes,
        patientName: a.couple?.primaryPatient
          ? `${a.couple.primaryPatient.firstName} ${a.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        partnerName: a.couple?.partnerPatient
          ? `${a.couple.partnerPatient.firstName} ${a.couple.partnerPatient.lastName}`.trim()
          : null,
        coupleId: a.coupleId,
        activeTreatment: a.couple?.treatments?.[0]
          ? {
              id: a.couple.treatments[0].id,
              kind: a.couple.treatments[0].kind,
              label: a.couple.treatments[0].label,
              stageIndex: a.couple.treatments[0].stageIndex,
              stageName: a.couple.treatments[0].stageName,
            }
          : null,
      })),
      pendingReports: pendingReports.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        dueDate: r.dueDate?.toISOString() ?? null,
        patientName: r.couple?.primaryPatient
          ? `${r.couple.primaryPatient.firstName} ${r.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        coupleId: r.coupleId,
      })),
      clinicalEscalations: escalations.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        status: e.status,
        priority: e.priority,
        category: e.category,
        dueDate: e.dueDate?.toISOString() ?? null,
        patientName: e.couple?.primaryPatient
          ? `${e.couple.primaryPatient.firstName} ${e.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        coupleId: e.coupleId,
      })),
      patientsNeedingAttention: missedAppts.map((m) => ({
        appointmentId: m.id,
        patientName: m.couple?.primaryPatient
          ? `${m.couple.primaryPatient.firstName} ${m.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        reason: "Missed scheduled appointment (no-show)",
        missedDate: m.startsAt.toISOString(),
        coupleId: m.coupleId,
      })),
      activeTreatments: activeTreatments.map((t) => ({
        id: t.id,
        kind: t.kind,
        label: t.label,
        status: t.status,
        stageIndex: t.stageIndex,
        stageName: t.stageName,
        startedAt: t.startedAt?.toISOString() ?? null,
        cycleNumber: t.ivfCycle?.cycleNumber ?? 1,
        patientName: t.couple?.primaryPatient
          ? `${t.couple.primaryPatient.firstName} ${t.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        partnerName: t.couple?.partnerPatient
          ? `${t.couple.partnerPatient.firstName} ${t.couple.partnerPatient.lastName}`.trim()
          : null,
        coupleId: t.coupleId,
      })),
    });
  })

  // ─── 2. Schedule (Day / Week) ───────────────────────────────────────────────
  .get("/schedule", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const dateQuery = c.req.query("date");
    const range = c.req.query("range") === "week" ? "week" : "day";

    const baseDate = dateQuery ? new Date(dateQuery) : new Date();
    const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
    const endDate =
      range === "week"
        ? new Date(startDate.getTime() + 7 * 86400000 - 1)
        : new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: startDate, lte: endDate },
        status: { not: "CANCELLED" },
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
            treatments: {
              where: { status: "ACTIVE" },
              select: { id: true, kind: true, label: true, stageIndex: true, stageName: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    return ok(c, {
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      count: appointments.length,
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        durationMin: a.durationMin,
        type: a.type,
        status: a.status,
        room: a.room,
        doctorName: a.doctorName,
        notes: a.notes,
        patientName: a.couple?.primaryPatient
          ? `${a.couple.primaryPatient.firstName} ${a.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        partnerName: a.couple?.partnerPatient
          ? `${a.couple.partnerPatient.firstName} ${a.couple.partnerPatient.lastName}`.trim()
          : null,
        coupleId: a.coupleId,
        primaryPatientId: a.couple?.primaryPatientId ?? null,
        treatment: a.couple?.treatments?.[0] ?? null,
      })),
    });
  })

  // ─── 3. Consultation Note & Start/Complete Consultation ────────────────────
  .post("/consultations/:appointmentId", validate("param", appointmentIdParam), validate("json", recordConsultationSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.APPOINTMENTS_WRITE);
    const { appointmentId } = c.req.valid("param");
    const body = c.req.valid("json");

    // Enforce clinical authority: Only DOCTOR or CLINIC_ADMIN may sign off clinical consultation notes
    if (tenant.role !== "DOCTOR" && tenant.role !== "CLINIC_ADMIN") {
      return fail(c, 403, "CLINICAL_AUTHORITY_REQUIRED", "Only medical doctors or clinic administrators may record consultations.");
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { couple: true },
    });
    await requireClinicOwned(tenant, appointment);
    if (!appointment) return fail(c, 404, "NOT_FOUND", "Appointment not found");
    if (!appointment.coupleId) {
      return fail(c, 400, "COUPLE_REQUIRED", "Appointment must be linked to a patient/couple");
    }

    // Create ConsultationNote
    const fullSummary = [
      body.impression ? `Clinical Impression: ${body.impression}` : null,
      body.summary,
      body.clinicalNotes ? `Notes: ${body.clinicalNotes}` : null,
      body.prescriptionNotes ? `Prescriptions/Orders: ${body.prescriptionNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const note = await prisma.consultationNote.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: appointment.coupleId,
        createdById: tenant.userId,
        consultationDate: new Date(),
        summary: fullSummary,
        reasonForVisit: body.reasonForVisit ?? appointment.type,
        nextSteps: body.nextSteps ?? null,
      },
    });

    // Update appointment status to COMPLETED or IN_PROGRESS
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: body.status === "COMPLETED" ? "COMPLETED" : appointment.status,
        notes: body.nextSteps ? `Completed note: ${body.nextSteps}` : appointment.notes,
      },
    });

    await audit(tenant, "doctor.consultation.complete", "Appointment", appointment.id, {
      consultationNoteId: note.id,
      status: body.status,
    });

    return ok(c, {
      appointmentId: updatedAppointment.id,
      status: updatedAppointment.status,
      consultationNote: {
        id: note.id,
        coupleId: note.coupleId,
        reasonForVisit: note.reasonForVisit,
        summary: note.summary,
        nextSteps: note.nextSteps,
        createdAt: note.createdAt.toISOString(),
      },
    }, 201);
  })

  // ─── 4. Reports Requiring Review ───────────────────────────────────────────
  .get("/reports", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const filter = c.req.query("filter") ?? "pending_review";

    const statusFilter =
      filter === "reviewed"
        ? { in: ["COMPLETED" as const] }
        : filter === "all"
          ? undefined
          : { in: ["WAITING" as const, "IN_PROGRESS" as const, "ACTIVE" as any] };

    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        category: "DIAGNOSTIC",
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok(c, tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() ?? null,
      lastAction: t.lastAction,
      patientName: t.couple?.primaryPatient
        ? `${t.couple.primaryPatient.firstName} ${t.couple.primaryPatient.lastName}`.trim()
        : "Patient",
      coupleId: t.coupleId,
      createdAt: t.createdAt.toISOString(),
    })));
  })

  // ─── 5. Doctor Review & Clinical Sign-off on Reports ───────────────────────
  .post("/reports/:orderId/review", validate("param", orderIdParam), validate("json", doctorReviewReportSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { orderId } = c.req.valid("param");
    const body = c.req.valid("json");

    if (tenant.role !== "DOCTOR" && tenant.role !== "CLINIC_ADMIN") {
      return fail(c, 403, "CLINICAL_AUTHORITY_REQUIRED", "Only medical doctors or clinic administrators may sign off on clinical reports.");
    }

    const task = await prisma.careTask.findUnique({ where: { id: orderId } });
    await requireClinicOwned(tenant, task);
    if (!task) return fail(c, 404, "NOT_FOUND", "Diagnostic task not found");

    const updatedTask = await prisma.careTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        lastAction: `DOCTOR_REVIEWED:${body.action}`,
        description: [
          task.description,
          `\n--- Doctor Clinical Review (${new Date().toLocaleDateString("en-IN")}) ---`,
          `Action: ${body.action}`,
          body.clinicalNotes ? `Notes: ${body.clinicalNotes}` : null,
          `Reviewed by: ${tenant.userId}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    await audit(tenant, "doctor.report.review", "CareTask", task.id, {
      action: body.action,
      clinicalNotes: body.clinicalNotes ?? null,
    });

    return ok(c, {
      id: updatedTask.id,
      status: updatedTask.status,
      lastAction: updatedTask.lastAction,
      reviewedAt: new Date().toISOString(),
    });
  })

  // ─── 6. Care Loop Exceptions Only ──────────────────────────────────────────
  .get("/care-loop-exceptions", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    // Doctor App principle: show ONLY clinical exceptions (overdue, high priority, escalations)
    // Never overwhelm doctors with routine automated reminders.
    const exceptions = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [
          { status: "OVERDUE" },
          { priority: "HIGH" },
          { priority: "CLINICAL" },
          { lastAction: { in: ["ESCALATED", "ESCALATE", "PATIENT_UNWELL", "NEED_HELP", "EXCEPTION"] } },
        ],
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 40,
    });

    return ok(c, exceptions.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      status: e.status,
      priority: e.priority,
      category: e.category,
      dueDate: e.dueDate?.toISOString() ?? null,
      lastAction: e.lastAction,
      patientName: e.couple?.primaryPatient
        ? `${e.couple.primaryPatient.firstName} ${e.couple.primaryPatient.lastName}`.trim()
        : "Patient",
      coupleId: e.coupleId,
      createdAt: e.createdAt.toISOString(),
    })));
  })

  // ─── 7. Relevant Clinical Messages & Escalations ───────────────────────────
  .get("/messages", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.WHATSAPP_VIEW);

    // Doctor App messages priority: patient escalations, human handoffs, urgent threads
    const conversations = await prisma.conversation.findMany({
      where: {
        clinicId: tenant.clinicId,
        OR: [
          { priority: { in: ["HIGH", "URGENT"] } },
          { handoffAt: { not: null } },
          { status: "OPEN" },
        ],
      },
      include: {
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
      },
      orderBy: { handoffAt: "desc" },
      take: 30,
    });

    return ok(c, conversations.map((conv) => ({
      id: conv.id,
      channel: conv.channel,
      status: conv.status,
      priority: conv.priority,
      handoffAt: conv.handoffAt?.toISOString() ?? null,
      handoffReason: conv.handoffReason,
      contactPhone: conv.contactPhone,
      patientName: conv.couple?.primaryPatient
        ? `${conv.couple.primaryPatient.firstName} ${conv.couple.primaryPatient.lastName}`.trim()
        : "Patient",
      coupleId: conv.coupleId,
    })));
  });
