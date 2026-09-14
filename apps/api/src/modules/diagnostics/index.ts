import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "../../lib/authz";
import { fail, ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import { audit } from "../../lib/audit";
import { realtimeBus } from "../realtime/bus";
import type { AppEnv } from "../../types";

const idParam = z.object({ id: z.string().min(1) });

const createDiagnosticOrderSchema = z
  .object({
    patientId: z.string().min(1),
    coupleId: z.string().optional(),
    testName: z.string().trim().min(1).max(200),
    category: z.enum([
      "Pathology",
      "Fertility Lab",
      "Semen Analysis",
      "Imaging",
      "IVF / Embryology",
      "Blood / Pathology",
      "Vitals",
      "Other",
    ]),
    priority: z.enum(["Routine", "Urgent", "Stat"]).default("Routine"),
    specimenType: z.string().trim().max(100).optional(),
    carePlanStepId: z.string().optional(),
    notes: z.string().trim().max(1000).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .strict();

const sampleCollectionSchema = z
  .object({
    sampleId: z.string().trim().min(1).max(100),
    sampleType: z.string().trim().min(1).max(100).optional(),
    collectedAt: z.string().datetime().optional(),
    collectedBy: z.string().trim().max(100).optional(),
  })
  .strict();

const resultItemSchema = z.object({
  parameter: z.string().trim().min(1),
  value: z.string().trim().optional(),
  result: z.string().trim().optional(),
  unit: z.string().trim().default(""),
  range: z.string().trim().default(""),
  flag: z.enum(["Normal", "High", "Low", "Critical", "Abnormal", "Not Evaluated"]).default("Normal"),
});

const enterResultsSchema = z
  .object({
    results: z.array(resultItemSchema).min(1),
    findings: z.string().trim().max(2000).optional(),
    technicianNotes: z.string().trim().max(1000).optional(),
  })
  .strict();

const verifyResultsSchema = z
  .object({
    verifiedBy: z.string().trim().min(1).max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const doctorReviewSchema = z
  .object({
    doctorNotes: z.string().trim().min(1).max(2000),
    action: z.enum(["APPROVE", "REQUEST_RETEST"]).default("APPROVE"),
  })
  .strict();

function mapPriorityToCareTaskPriority(priority: "Routine" | "Urgent" | "Stat") {
  if (priority === "Stat") return "CLINICAL" as const;
  if (priority === "Urgent") return "HIGH" as const;
  return "NORMAL" as const;
}

interface DiagnosticTaskMetadata {
  testName?: string;
  category?: string;
  priority?: string;
  specimenType?: string | null;
  status?: string;
  instructions?: string | null;
  orderedAt?: string;
  orderedBy?: string;
  notes?: string | null;
  specimen?: {
    collectedAt: string;
    collectedBy: string;
    barcode?: string | null;
    sampleId?: string | null;
    sampleType: string;
  } | null;
  results?: Array<{
    parameter: string;
    value?: string;
    result?: string;
    unit?: string;
    range?: string;
    flag?: string;
  }> | null;
  findings?: string | null;
  technicianNotes?: string | null;
  resultsEnteredAt?: string | null;
  resultsEnteredBy?: string | null;
  verification?: {
    verifiedAt: string;
    verifiedBy: string;
    notes?: string | null;
    status: string;
  } | null;
  doctorReview?: {
    reviewedAt: string;
    reviewedBy: string;
    doctorNotes: string;
    action: string;
    status: string;
  } | null;
}

function serializeDiagnosticTask(task: any, doc?: any) {
  const meta = ((task.metadata ?? {}) as DiagnosticTaskMetadata);
  return {
    id: task.id,
    clinicId: task.clinicId,
    coupleId: task.coupleId,
    patientId: task.targetPatientId || task.couple?.primaryPatientId || null,
    patientName: task.couple?.primaryPatient
      ? `${task.couple.primaryPatient.firstName} ${task.couple.primaryPatient.lastName}`.trim()
      : "Patient",
    patientPhone: task.couple?.primaryPatient?.phone || null,
    testName: meta.testName || task.title,
    category: meta.category || "General",
    priority: meta.priority || "Routine",
    specimenType: meta.specimenType || null,
    status: meta.status || (task.status === "COMPLETED" ? "Doctor Reviewed" : "Ordered"),
    careTaskStatus: task.status,
    specimen: meta.specimen || null,
    results: meta.results || null,
    findings: meta.findings || null,
    technicianNotes: meta.technicianNotes || null,
    verification: meta.verification || null,
    doctorReview: meta.doctorReview || null,
    documentId: doc?.id || task.documents?.[0]?.id || null,
    documentStatus: doc?.status || task.documents?.[0]?.status || null,
    carePlanStepId: task.carePlanStepId,
    dueDate: task.dueDate?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const diagnosticRoutes = new Hono<AppEnv>()
  // ── 1. List diagnostic orders ──────────────────────────────────────────────
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const category = c.req.query("category");
    const status = c.req.query("status");
    const patientId = c.req.query("patientId");
    const coupleId = c.req.query("coupleId");
    const reviewPending = c.req.query("reviewPending") === "true";

    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        taskType: "DIAGNOSTIC_ORDER",
        ...(coupleId ? { coupleId } : {}),
        ...(patientId
          ? {
              OR: [
                { targetPatientId: patientId },
                { couple: { primaryPatientId: patientId } },
                { couple: { partnerPatientId: patientId } },
              ],
            }
          : {}),
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    let serialized = tasks.map((t) => serializeDiagnosticTask(t, t.documents[0]));

    if (category) {
      serialized = serialized.filter((o) => o.category.toLowerCase() === category.toLowerCase());
    }
    if (status) {
      serialized = serialized.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }
    if (reviewPending) {
      serialized = serialized.filter((o) => o.status === "Verified" || o.status === "Result Ready");
    }

    return ok(c, serialized);
  })

  // ── 2. Review queue for doctors ────────────────────────────────────────────
  .get("/review-queue", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        taskType: "DIAGNOSTIC_ORDER",
        status: { in: ["WAITING", "IN_PROGRESS", "ACTIVE"] },
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const reviews = tasks
      .map((t) => serializeDiagnosticTask(t, t.documents[0]))
      .filter((o) => o.status === "Verified" || o.status === "Result Ready");

    return ok(c, reviews);
  })

  // ── 3. Diagnostic overview for patient ─────────────────────────────────────
  .get("/patient/:patientId", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const patientId = c.req.param("patientId");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        primaryCouples: { select: { id: true } },
        partnerCouples: { select: { id: true } },
      },
    });
    await requireClinicOwned(tenant, patient);

    const coupleIds = [
      ...(patient?.primaryCouples?.map((c) => c.id) || []),
      ...(patient?.partnerCouples?.map((c) => c.id) || []),
    ];

    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        taskType: "DIAGNOSTIC_ORDER",
        OR: [
          { targetPatientId: patientId },
          ...(coupleIds.length > 0 ? [{ coupleId: { in: coupleIds } }] : []),
        ],
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const orders = tasks.map((t) => serializeDiagnosticTask(t, t.documents[0]));

    const summary = {
      total: orders.length,
      ordered: orders.filter((o) => o.status === "Ordered").length,
      processing: orders.filter((o) => o.status === "Processing").length,
      resultsReady: orders.filter((o) => o.status === "Result Ready").length,
      verified: orders.filter((o) => o.status === "Verified").length,
      reviewed: orders.filter((o) => o.status === "Doctor Reviewed").length,
    };

    return ok(c, { orders, summary });
  })

  // ── 4. Order diagnostic (Doctor) ───────────────────────────────────────────
  .post("/", validate("json", createDiagnosticOrderSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const body = c.req.valid("json");

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      include: { primaryCouples: { select: { id: true } } },
    });
    await requireClinicOwned(tenant, patient);

    let coupleId = body.coupleId;
    if (!coupleId && patient?.primaryCouples?.length && patient.primaryCouples[0]) {
      coupleId = patient.primaryCouples[0].id;
    }

    if (coupleId) {
      const couple = await prisma.couple.findUnique({ where: { id: coupleId } });
      await requireClinicOwned(tenant, couple);
    }

    if (body.carePlanStepId) {
      const step = await prisma.carePlanStep.findUnique({
        where: { id: body.carePlanStepId },
        include: { carePlan: true },
      });
      if (step) {
        await requireClinicOwned(tenant, step.carePlan);
      }
    }

    const priorityCareTask = mapPriorityToCareTaskPriority(body.priority);
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const task = await prisma.careTask.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: coupleId || null,
        targetPatientId: patient?.id ?? null,
        title: body.testName,
        category: "DIAGNOSTIC",
        taskType: "DIAGNOSTIC_ORDER",
        ownerRole: "LAB",
        priority: priorityCareTask,
        status: "WAITING",
        dueDate,
        createdById: tenant.userId,
        carePlanStepId: body.carePlanStepId || null,
        metadata: {
          testName: body.testName,
          category: body.category,
          priority: body.priority,
          specimenType: body.specimenType || null,
          notes: body.notes || null,
          status: "Ordered",
          orderedAt: new Date().toISOString(),
          orderedBy: tenant.userId,
        },
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });

    // Create companion document awaiting upload
    const doc = await prisma.document.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: coupleId || null,
        patientId: patient?.id ?? null,
        careTaskId: task.id,
        name: `${body.testName} Report`,
        status: "AWAITING_UPLOAD",
        uploadedById: tenant.userId,
      },
    });

    await audit(tenant, "diagnostic.ordered", "CareTask", task.id, {
      testName: body.testName,
      category: body.category,
      priority: body.priority,
      patientId: patient?.id ?? null,
    });

    realtimeBus.publish({
      type: "DIAGNOSTIC_ORDER_CREATED",
      clinicId: tenant.clinicId,
      orderId: task.id,
    });

    return ok(c, serializeDiagnosticTask(task, doc), 201);
  })

  // ── 5. Get diagnostic order detail ─────────────────────────────────────────
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");

    const task = await prisma.careTask.findUnique({
      where: { id },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    await requireClinicOwned(tenant, task);

    return ok(c, serializeDiagnosticTask(task, task?.documents[0]));
  })

  // ── 6. Record sample collection (Lab) ──────────────────────────────────────
  .post("/:id/sample", validate("param", idParam), validate("json", sampleCollectionSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const task = await prisma.careTask.findUnique({ where: { id } });
    await requireClinicOwned(tenant, task);

    const meta = ((task?.metadata ?? {}) as DiagnosticTaskMetadata);
    const updatedMeta: DiagnosticTaskMetadata = {
      ...meta,
      status: "Processing",
      specimen: {
        sampleId: body.sampleId,
        barcode: body.sampleId,
        sampleType: body.sampleType || meta.specimenType || "Blood",
        collectedAt: body.collectedAt || new Date().toISOString(),
        collectedBy: body.collectedBy || tenant.userId,
      },
    };

    const updatedTask = await prisma.careTask.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        metadata: updatedMeta as any,
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    await audit(tenant, "diagnostic.sample_collected", "CareTask", id, {
      sampleId: body.sampleId,
    });

    realtimeBus.publish({
      type: "DIAGNOSTIC_SAMPLE_COLLECTED",
      clinicId: tenant.clinicId,
      orderId: id,
    });

    return ok(c, serializeDiagnosticTask(updatedTask, (updatedTask as any).documents?.[0]));
  })

  // ── 7. Enter results (Lab) ─────────────────────────────────────────────────
  .post("/:id/results", validate("param", idParam), validate("json", enterResultsSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const task = await prisma.careTask.findUnique({ where: { id } });
    await requireClinicOwned(tenant, task);

    const meta = ((task?.metadata ?? {}) as DiagnosticTaskMetadata);
    const updatedMeta: DiagnosticTaskMetadata = {
      ...meta,
      status: "Result Ready",
      results: body.results.map((r) => ({
        parameter: r.parameter,
        value: r.value ?? r.result ?? "",
        unit: r.unit,
        range: r.range,
        flag: r.flag,
      })),
      findings: body.findings ?? meta.findings ?? null,
      technicianNotes: body.technicianNotes ?? null,
      resultsEnteredAt: new Date().toISOString(),
      resultsEnteredBy: tenant.userId,
    };

    // Move document to UPLOADED
    await prisma.document.updateMany({
      where: { careTaskId: id },
      data: { status: "UPLOADED" },
    });

    const updatedTask = await prisma.careTask.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        metadata: updatedMeta as any,
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    await audit(tenant, "diagnostic.results_entered", "CareTask", id, {
      parameterCount: body.results.length,
    });

    realtimeBus.publish({
      type: "DIAGNOSTIC_RESULTS_ENTERED",
      clinicId: tenant.clinicId,
      orderId: id,
    });

    return ok(c, serializeDiagnosticTask(updatedTask, (updatedTask as any).documents?.[0]));
  })

  // ── 8. Verify results (Lab Supervisor / Senior Tech) ────────────────────────
  .post("/:id/verify", validate("param", idParam), validate("json", verifyResultsSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const task = await prisma.careTask.findUnique({ where: { id } });
    await requireClinicOwned(tenant, task);

    const meta = ((task?.metadata ?? {}) as DiagnosticTaskMetadata);
    if (!meta.results && !meta.findings) {
      return fail(c, 400, "RESULTS_REQUIRED", "Cannot verify order before results are entered.");
    }

    const updatedMeta: DiagnosticTaskMetadata = {
      ...meta,
      status: "Verified",
      verification: {
        verifiedAt: new Date().toISOString(),
        verifiedBy: body.verifiedBy || tenant.userId,
        notes: body.notes || null,
        status: "Verified",
      },
    };

    // Update document status to DOCTOR_REVIEW
    await prisma.document.updateMany({
      where: { careTaskId: id },
      data: { status: "DOCTOR_REVIEW" },
    });

    const updatedTask = await prisma.careTask.update({
      where: { id },
      data: {
        status: "ACTIVE", // Active awaiting clinical doctor review
        metadata: updatedMeta as any,
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    await audit(tenant, "diagnostic.verified", "CareTask", id, {
      verifiedBy: body.verifiedBy || tenant.userId,
    });

    realtimeBus.publish({
      type: "DIAGNOSTIC_VERIFIED",
      clinicId: tenant.clinicId,
      orderId: id,
    });

    return ok(c, serializeDiagnosticTask(updatedTask, (updatedTask as any).documents?.[0]));
  })

  // ── 9. Doctor review & clinical sign-off (Restricted to Doctors / Admins) ────
  .post("/:id/review", validate("param", idParam), validate("json", doctorReviewSchema), async (c) => {
    // Enforce clinical authority: Only DOCTOR or CLINIC_ADMIN can review diagnostic results
    const tenant = requirePermission(c, PERMISSIONS.CLINICAL_ESCALATIONS);
    if (tenant.role !== "DOCTOR" && tenant.role !== "CLINIC_ADMIN") {
      return fail(c, 403, "CLINICAL_AUTHORITY_REQUIRED", "Only authorised medical doctors may review diagnostic results.");
    }

    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const task = await prisma.careTask.findUnique({
      where: { id },
      include: { carePlanStep: true },
    });
    await requireClinicOwned(tenant, task);

    const meta = ((task?.metadata ?? {}) as DiagnosticTaskMetadata);
    if (meta.status !== "Verified" && meta.status !== "Result Ready") {
      return fail(c, 400, "VERIFICATION_REQUIRED", "Unverified reports cannot be accepted as verified clinical facts.");
    }

    const isApproval = body.action === "APPROVE";
    const updatedMeta: DiagnosticTaskMetadata = {
      ...meta,
      status: isApproval ? "Doctor Reviewed" : "Ordered",
      doctorReview: {
        reviewedAt: new Date().toISOString(),
        reviewedBy: tenant.userId,
        doctorNotes: body.doctorNotes,
        action: body.action,
        status: isApproval ? "Reviewed" : "Retest Requested",
      },
    };

    // Update document status
    await prisma.document.updateMany({
      where: { careTaskId: id },
      data: { status: isApproval ? "REVIEWED" : "AWAITING_UPLOAD" },
    });

    const updatedTask = await prisma.careTask.update({
      where: { id },
      data: {
        status: isApproval ? "COMPLETED" : "WAITING",
        completedAt: isApproval ? new Date() : null,
        completedBy: isApproval ? tenant.userId : null,
        metadata: updatedMeta as any,
      },
      include: {
        couple: {
          include: {
            primaryPatient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        documents: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    // Connect to Journey Stage: If task belongs to carePlanStep, check if step completes
    if (isApproval && task?.carePlanStepId) {
      const remainingTasks = await prisma.careTask.count({
        where: {
          carePlanStepId: task.carePlanStepId,
          status: { notIn: ["COMPLETED", "SKIPPED"] },
          id: { not: task.id },
        },
      });

      if (remainingTasks === 0) {
        await prisma.carePlanStep.update({
          where: { id: task.carePlanStepId },
          data: {
            status: "DONE",
            completedAt: new Date(),
            completedById: tenant.userId,
          },
        });
      }
    }

    await audit(tenant, "diagnostic.reviewed", "CareTask", id, {
      action: body.action,
      doctorNotes: body.doctorNotes,
    });

    realtimeBus.publish({
      type: "DIAGNOSTIC_REVIEWED",
      clinicId: tenant.clinicId,
      orderId: id,
    });

    return ok(c, serializeDiagnosticTask(updatedTask, (updatedTask as any).documents?.[0]));
  });
