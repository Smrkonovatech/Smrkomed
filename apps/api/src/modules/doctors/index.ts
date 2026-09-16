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

const recordConsultationSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).default("COMPLETED"),
  reasonForVisit: z.string().trim().max(500).optional(),
  summary: z.string().trim().max(5000).default("Clinical consultation recorded"),
  nextSteps: z.string().trim().max(2000).optional(),
  clinicalNotes: z.string().trim().max(5000).optional(),
  impression: z.string().trim().max(1000).optional(),
  prescriptionNotes: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  diagnosis: z.string().trim().max(1000).optional(),
});

const doctorReviewReportSchema = z
  .object({
    clinicalNotes: z.string().trim().max(2000).optional(),
    action: z.enum(["ACKNOWLEDGED", "APPROVED", "REPEAT_TEST", "FOLLOWUP_REQUIRED"]).default("APPROVED"),
  })
  .strict();

import { hash } from "bcryptjs";

function formatDoctorProfile(clinicId: string, user: any, profileConfig?: any) {
  const rawName = user.name || user.email;
  const displayName = rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`;
  const nameParts = rawName.replace(/^Dr\.\s*/i, "").split(" ");
  const firstName = nameParts[0] || "Doctor";
  const lastName = nameParts.slice(1).join(" ") || "";
  const regNum =
    profileConfig?.registrationNumber ||
    `KMC-${(Math.abs(user.id.split("").reduce((a: number, b: string) => (a << 5) - a + b.charCodeAt(0), 0)) % 89999 + 10000)}`;

  return {
    id: `doc_${user.id}`,
    staffUserId: user.id,
    status: user.isActive ? "active" : "inactive",
    isDraft: false,
    firstName,
    lastName,
    displayName,
    gender: profileConfig?.gender || "Female",
    dateOfBirth: profileConfig?.dateOfBirth || "1988-06-15",
    phone: user.phone || profileConfig?.phone || "",
    email: user.email,
    alternatePhone: profileConfig?.alternatePhone || "",
    employeeId: profileConfig?.employeeId || `DOC-${user.id.slice(-4).toUpperCase()}`,
    registrationNumber: regNum,
    registrationAuthority: profileConfig?.registrationAuthority || "State Medical Council",
    country: profileConfig?.country || "India",
    state: profileConfig?.state || "Karnataka",
    city: profileConfig?.city || "Bangalore",
    designation: user.title || profileConfig?.designation || "Senior Fertility Consultant",
    department: profileConfig?.department || "Reproductive Medicine",
    primarySpecialty: profileConfig?.primarySpecialty || user.title || "Reproductive Medicine",
    subSpecialties: profileConfig?.subSpecialties || ["IVF", "IUI", "FET", "Fertility Evaluation"],
    yearsExperience: profileConfig?.yearsExperience ? Number(profileConfig.yearsExperience) : 10,
    yearsInSpecialty: profileConfig?.yearsInSpecialty ? Number(profileConfig.yearsInSpecialty) : 7,
    consultationTypes: profileConfig?.consultationTypes || ["In-clinic", "Online"],
    languages: profileConfig?.languages || ["English", "Hindi"],
    professionalBio:
      profileConfig?.professionalBio ||
      `${displayName} is a certified specialist in Reproductive Medicine, committed to clinical excellence, evidence-based IVF protocols, and compassionate patient care.`,
    shortIntro:
      profileConfig?.shortIntro ||
      `${user.title || "Fertility Specialist"} dedicated to patient-centered reproductive healthcare.`,
    clinicalInterests:
      profileConfig?.clinicalInterests || "Advanced IVF protocols, follicular monitoring, fertility evaluation",
    expertise: profileConfig?.expertise || ["IVF", "IUI", "FET", "Fertility Evaluation", "Reproductive Medicine"],
    services: profileConfig?.services || ["Initial Consultation", "Follow-up Consultation", "Follicular Monitoring", "Cycle Review"],
    procedures: profileConfig?.procedures || ["IUI", "Oocyte Retrieval", "Embryo Transfer"],
    qualifications: profileConfig?.qualifications || (profileConfig?.qualificationsText ? [
      {
        id: "q1",
        degree: profileConfig.qualificationsText,
        specialization: user.title || "Reproductive Medicine",
        institution: "Medical Council Accredited College",
        university: "Health Sciences University",
        location: "Bangalore",
        startYear: "2010",
        endYear: "2016",
        description: "Medical qualifications & training",
      }
    ] : [
      {
        id: "q1",
        degree: "MBBS",
        specialization: "Medicine",
        institution: "Bangalore Medical College",
        university: "RGUHS",
        location: "Bangalore",
        startYear: "2006",
        endYear: "2011",
        description: "Undergraduate medical training",
      },
      {
        id: "q2",
        degree: "MS",
        specialization: "Obstetrics & Gynaecology",
        institution: "St. John's Medical College",
        university: "RGUHS",
        location: "Bangalore",
        startYear: "2012",
        endYear: "2015",
        description: "Postgraduate clinical degree",
      },
    ]),
    experience: profileConfig?.experience || [
      {
        id: "e1",
        organization: "ABC Fertility Centre",
        position: user.title || "Consultant Fertility Specialist",
        department: profileConfig?.department || "Reproductive Medicine",
        startDate: "2021-01",
        endDate: "",
        currentlyWorking: true,
        description: "Consultations, cycle planning, and clinical oversight.",
        responsibilities: "Patient consultations, follicular monitoring scans, clinical decisions",
      },
    ],
    weeklySchedule: profileConfig?.weeklySchedule || {
      monday: { enabled: true, slots: [{ start: "09:00", end: "17:00", slotDurationMinutes: 30, maxPatients: 16, consultationModes: ["in_clinic", "video"] }] },
      tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00", slotDurationMinutes: 30, maxPatients: 16, consultationModes: ["in_clinic", "video"] }] },
      wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00", slotDurationMinutes: 30, maxPatients: 16, consultationModes: ["in_clinic", "video"] }] },
      thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00", slotDurationMinutes: 30, maxPatients: 16, consultationModes: ["in_clinic", "video"] }] },
      friday: { enabled: true, slots: [{ start: "09:00", end: "17:00", slotDurationMinutes: 30, maxPatients: 16, consultationModes: ["in_clinic", "video"] }] },
      saturday: { enabled: true, slots: [{ start: "09:00", end: "13:00", slotDurationMinutes: 30, maxPatients: 8, consultationModes: ["in_clinic"] }] },
      sunday: { enabled: false, slots: [] },
    },
    appointmentSettings: profileConfig?.appointmentSettings || {
      inClinicFee: 1500,
      videoFee: 1200,
      followUpFee: 800,
      followUpValidityDays: 14,
      emergencyFee: 2500,
    },
    leaves: profileConfig?.leaves || [],
    blockedTimes: profileConfig?.blockedTimes || [],
    documents: profileConfig?.documents || [],
    activity: profileConfig?.activity || [
      {
        id: "act_init",
        kind: "created",
        message: "Doctor profile initialized and active",
        at: user.createdAt?.toISOString?.() ?? new Date().toISOString(),
      },
    ],
    locationId: clinicId,
    locationName: profileConfig?.locationName || "Bangalore",
    createdAt: user.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

const handlePrepareMyDay = async (c: any) => {
  const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // When the caller is a DOCTOR, scope everything strictly to their patients and appointments
    const isDoctorRole = tenant.role === "DOCTOR";
    const doctorUser = isDoctorRole
      ? await prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } })
      : null;
    const docName = doctorUser?.name?.trim();
    const docNameWithoutPrefix = docName?.replace(/^Dr\.\s*/i, "");

    const doctorAppointmentConditions: any[] = [];
    if (isDoctorRole) {
      doctorAppointmentConditions.push({ couple: { assignedDoctorId: tenant.userId } });
      if (docName) {
        doctorAppointmentConditions.push({ doctorName: { contains: docName, mode: "insensitive" } });
        if (docNameWithoutPrefix && docNameWithoutPrefix !== docName) {
          doctorAppointmentConditions.push({ doctorName: { contains: docNameWithoutPrefix, mode: "insensitive" } });
        }
      }
    }

    const doctorCoupleFilter = isDoctorRole ? { couple: { assignedDoctorId: tenant.userId } } : {};

    // 1. Today's Appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELLED" },
        ...(doctorAppointmentConditions.length > 0 ? { OR: doctorAppointmentConditions } : {}),
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
        ...doctorCoupleFilter,
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
        ...doctorCoupleFilter,
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
        ...(doctorAppointmentConditions.length > 0 ? { OR: doctorAppointmentConditions } : {}),
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

    // 5. Active Treatment Patients (Active IVF & IUI cycles) — filtered by doctor if role=DOCTOR
    const activeTreatments = await prisma.treatment.findMany({
      where: {
        clinicId: tenant.clinicId,
        status: "ACTIVE",
        ...(isDoctorRole ? { couple: { assignedDoctorId: tenant.userId } } : {}),
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
};

export const doctorRoutes = new Hono<AppEnv>()
  .get("/prepare-my-day", handlePrepareMyDay)
  .get("/prepare-day", handlePrepareMyDay)

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

    const isDoctorRole = tenant.role === "DOCTOR";
    const doctorUser = isDoctorRole
      ? await prisma.user.findUnique({ where: { id: tenant.userId }, select: { name: true } })
      : null;
    const docName = doctorUser?.name?.trim();
    const docNameWithoutPrefix = docName?.replace(/^Dr\.\s*/i, "");

    const doctorScheduleConditions: any[] = [];
    if (isDoctorRole) {
      doctorScheduleConditions.push({ couple: { assignedDoctorId: tenant.userId } });
      if (docName) {
        doctorScheduleConditions.push({ doctorName: { contains: docName, mode: "insensitive" } });
        if (docNameWithoutPrefix && docNameWithoutPrefix !== docName) {
          doctorScheduleConditions.push({ doctorName: { contains: docNameWithoutPrefix, mode: "insensitive" } });
        }
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: tenant.clinicId,
        startsAt: { gte: startDate, lte: endDate },
        status: { not: "CANCELLED" },
        ...(doctorScheduleConditions.length > 0 ? { OR: doctorScheduleConditions } : {}),
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

    // Enforce clinical authority: DOCTOR, CLINIC_ADMIN, CARE_COORDINATOR, or NURSE may record consultation notes
    if (tenant.role !== "DOCTOR" && tenant.role !== "CLINIC_ADMIN" && tenant.role !== "CARE_COORDINATOR" && tenant.role !== "NURSE") {
      return fail(c, 403, "CLINICAL_AUTHORITY_REQUIRED", "Only medical doctors, clinic coordinators, or administrators may record consultations.");
    }

    let appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { couple: true },
    });

    if (!appointment) {
      // Gracefully handle if appointmentId is actually a coupleId or patientId
      let couple = await prisma.couple.findUnique({ where: { id: appointmentId } });
      if (!couple) {
        couple = await prisma.couple.findFirst({
          where: {
            clinicId: tenant.clinicId,
            OR: [{ primaryPatientId: appointmentId }, { partnerPatientId: appointmentId }],
          },
        });
      }
      if (couple) {
        await requireClinicOwned(tenant, couple);
        appointment = await prisma.appointment.create({
          data: {
            clinicId: tenant.clinicId,
            coupleId: couple.id,
            type: body.reasonForVisit ?? "Doctor Consultation",
            startsAt: new Date(),
            status: body.status === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
            doctorName: tenant.role === "DOCTOR" ? "Doctor" : "Doctor / Care Team",
            notes: body.clinicalNotes ?? body.notes ?? body.summary,
          },
          include: { couple: true },
        });
      }
    }

    await requireClinicOwned(tenant, appointment);
    if (!appointment) return fail(c, 404, "NOT_FOUND", "Appointment not found");
    if (!appointment.coupleId) {
      return fail(c, 400, "COUPLE_REQUIRED", "Appointment must be linked to a patient/couple");
    }

    const clinicalNotes = body.clinicalNotes ?? body.notes;
    const impression = body.impression ?? body.diagnosis;

    // Create ConsultationNote
    const fullSummary = [
      impression ? `Clinical Impression: ${impression}` : null,
      body.summary,
      clinicalNotes ? `Notes: ${clinicalNotes}` : null,
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
    const isDoctorRole = tenant.role === "DOCTOR";
    const doctorCoupleFilter = isDoctorRole ? { couple: { assignedDoctorId: tenant.userId } } : {};

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
        ...doctorCoupleFilter,
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
    const isDoctorRole = tenant.role === "DOCTOR";
    const doctorCoupleFilter = isDoctorRole ? { couple: { assignedDoctorId: tenant.userId } } : {};

    // Doctor App principle: show ONLY clinical exceptions (overdue, high priority, escalations)
    // Never overwhelm doctors with routine automated reminders.
    const exceptions = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        ...doctorCoupleFilter,
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
    const isDoctorRole = tenant.role === "DOCTOR";
    const doctorConversationFilter = isDoctorRole
      ? {
          OR: [
            { couple: { assignedDoctorId: tenant.userId } },
            { assignedStaffId: tenant.userId },
          ],
        }
      : {};

    // Doctor App messages priority: patient escalations, human handoffs, urgent threads
    const conversations = await prisma.conversation.findMany({
      where: {
        clinicId: tenant.clinicId,
        ...doctorConversationFilter,
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
  })

  // ─── 8. Doctor Management: List All Doctors in Clinic ────────────────────────
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId: tenant.clinicId,
        status: "ACTIVE",
        role: { key: "DOCTOR" },
        user: { isActive: true },
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const profileRules = await prisma.automationRule.findMany({
      where: {
        clinicId: tenant.clinicId,
        trigger: "DOCTOR_PROFILE",
      },
    });

    const profileMap = new Map<string, any>();
    for (const rule of profileRules) {
      if (rule.name) profileMap.set(rule.name, rule.config);
    }

    const doctors = memberships.map((m) => {
      const savedConfig = profileMap.get(m.user.id) || profileMap.get(`doc_${m.user.id}`);
      return formatDoctorProfile(tenant.clinicId, m.user, savedConfig);
    });

    return ok(c, doctors);
  })

  // ─── 9. Doctor Management: Get Single Doctor Profile ─────────────────────────
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const cleanId = id.replace(/^doc_/, "");

    const membership = await prisma.clinicMembership.findFirst({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ userId: cleanId }, { userId: id }],
      },
      include: { user: true },
    });

    if (!membership) {
      return fail(c, 404, "NOT_FOUND", "Doctor profile not found in this clinic.");
    }

    const profileRule = await prisma.automationRule.findFirst({
      where: {
        clinicId: tenant.clinicId,
        trigger: "DOCTOR_PROFILE",
        OR: [{ name: membership.user.id }, { name: `doc_${membership.user.id}` }],
      },
    });

    return ok(c, formatDoctorProfile(tenant.clinicId, membership.user, profileRule?.config));
  })

  // ─── 10. Doctor Management: Create Doctor With Account & Full Profile ────────
  .post("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.USERS_MANAGE);
    const body = await c.req.json();
    const email = (body.email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return fail(c, 400, "INVALID_EMAIL", "A valid email is required.");
    }

    const rawName = (body.displayName || `${body.firstName || ""} ${body.lastName || ""}`).trim();
    const name = rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`.trim();
    if (name.length < 2) {
      return fail(c, 400, "INVALID_NAME", "Doctor name is required.");
    }

    const password = body.password || "Doctor@12345";
    const passwordHash = await hash(password, 10);
    const title = body.designation || body.primarySpecialty || body.title || "Fertility Specialist";
    const phone = body.phone || null;

    const doctorRole = await prisma.role.findUnique({ where: { key: "DOCTOR" } });
    if (!doctorRole) {
      return fail(c, 400, "ROLE_NOT_FOUND", "Doctor role not found in system.");
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const existingMembership = await prisma.clinicMembership.findUnique({
        where: { clinicId_userId: { clinicId: tenant.clinicId, userId: user.id } },
      });
      if (existingMembership) {
        return fail(c, 409, "DOCTOR_EXISTS", "A doctor with this email already belongs to this clinic.");
      }
      await prisma.clinicMembership.create({
        data: {
          clinicId: tenant.clinicId,
          userId: user.id,
          roleId: doctorRole.id,
          status: "ACTIVE",
        },
      });
    } else {
      const initials = name
        .replace(/^Dr\.\s*/i, "")
        .split(" ")
        .map((p: string) => p[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();

      user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            initials,
            title,
            phone,
            isActive: true,
          },
        });
        await tx.clinicMembership.create({
          data: {
            clinicId: tenant.clinicId,
            userId: u.id,
            roleId: doctorRole.id,
            status: "ACTIVE",
          },
        });
        return u;
      });
    }

    const profileData = {
      ...body,
      displayName: name,
      email,
      phone,
      department: body.department || "Reproductive Medicine",
      primarySpecialty: body.primarySpecialty || title,
      registrationNumber: body.registrationNumber || null,
      registrationAuthority: body.registrationAuthority || "State Medical Council",
      yearsExperience: body.yearsExperience ? Number(body.yearsExperience) : 10,
      qualifications: body.qualifications || null,
      experience: body.experience || null,
      weeklySchedule: body.weeklySchedule || null,
      appointmentSettings: body.appointmentSettings || null,
    };

    const existingRule = await prisma.automationRule.findFirst({
      where: {
        clinicId: tenant.clinicId,
        trigger: "DOCTOR_PROFILE",
        name: user.id,
      },
    });

    if (existingRule) {
      await prisma.automationRule.update({
        where: { id: existingRule.id },
        data: { config: profileData },
      });
    } else {
      await prisma.automationRule.create({
        data: {
          clinicId: tenant.clinicId,
          trigger: "DOCTOR_PROFILE",
          name: user.id,
          config: profileData,
        },
      });
    }

    return ok(c, {
      ...formatDoctorProfile(tenant.clinicId, user, profileData),
      credentials: {
        email,
        password,
        loginUrl: "/login",
      },
    }, 201);
  })

  // ─── 11. Doctor Management: Update Doctor Profile ────────────────────────────
  .put("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.USERS_MANAGE);
    const { id } = c.req.valid("param");
    const cleanId = id.replace(/^doc_/, "");
    const body = await c.req.json();

    const membership = await prisma.clinicMembership.findFirst({
      where: {
        clinicId: tenant.clinicId,
        OR: [{ userId: cleanId }, { userId: id }],
      },
      include: { user: true },
    });

    if (!membership) {
      return fail(c, 404, "NOT_FOUND", "Doctor not found in this clinic.");
    }

    const rawName = (body.displayName || `${body.firstName || ""} ${body.lastName || ""}`).trim();
    const updatedName = rawName ? (rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`) : membership.user.name;

    const updatedUser = await prisma.user.update({
      where: { id: membership.user.id },
      data: {
        name: updatedName,
        phone: body.phone !== undefined ? body.phone : membership.user.phone,
        title: body.designation ?? body.primarySpecialty ?? membership.user.title,
        isActive: body.status !== undefined ? body.status === "active" : membership.user.isActive,
      },
    });

    const existingRule = await prisma.automationRule.findFirst({
      where: {
        clinicId: tenant.clinicId,
        trigger: "DOCTOR_PROFILE",
        OR: [{ name: membership.user.id }, { name: `doc_${membership.user.id}` }],
      },
    });

    const mergedConfig = {
      ...(typeof existingRule?.config === "object" ? (existingRule.config as Record<string, unknown>) : {}),
      ...body,
      displayName: updatedName,
    };

    if (existingRule) {
      await prisma.automationRule.update({
        where: { id: existingRule.id },
        data: { config: mergedConfig },
      });
    } else {
      await prisma.automationRule.create({
        data: {
          clinicId: tenant.clinicId,
          trigger: "DOCTOR_PROFILE",
          name: membership.user.id,
          config: mergedConfig,
        },
      });
    }

    return ok(c, formatDoctorProfile(tenant.clinicId, updatedUser, mergedConfig));
  });
