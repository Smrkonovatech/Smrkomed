import { Hono } from "hono";
import { PERMISSIONS, getCarePlansForClinic, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { serializeCarePlan, serializeTask } from "../clinic-dto";
import {
  activatePatientTreatmentPlan,
  addDoctorTask,
  completeCareTask,
  getJourneyExecution,
  handleBranchDecision,
  handlePatientResponse,
  modifyDoctorTask,
  pauseCarePlan,
  resumeCarePlan,
} from "./engine";
import {
  assignTreatmentPlanSchema,
  branchDecisionSchema,
  completeTaskSchema,
  createCarePlanSchema,
  createCareTaskSchema,
  createTemplateSchema,
  idParam,
  pausePlanSchema,
  resolveExceptionSchema,
  simulateResponseSchema,
  updateCarePlanSchema,
  updateCareTaskSchema,
  updateTemplateSchema,
} from "./schemas";

const taskInclude = {
  assignments: { include: { user: { select: { name: true } } }, take: 1 },
  couple: {
    include: {
      assignedCoordinator: { select: { name: true } },
      assignedDoctor: { select: { name: true } },
      primaryPatient: true,
    },
  },
  carePlanStep: true,
} as const;

// ─── Treatment Plan Templates Routes ─────────────────────────────────────────

export const treatmentPlanTemplateRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const templates = await prisma.carePlanTemplate.findMany({
      where: {
        OR: [{ clinicId: tenant.clinicId }, { isSystem: true }],
      },
      include: {
        steps: {
          orderBy: { sortOrder: "asc" },
          include: { tasks: { orderBy: { sortOrder: "asc" } } },
        },
        _count: { select: { plans: true } },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    const serialized = templates.map((tpl) => {
      const taskCount = tpl.steps.reduce((sum, s) => sum + s.tasks.length, 0);
      return {
        id: tpl.id,
        clinicId: tpl.clinicId,
        name: tpl.name,
        description: tpl.description,
        specialty: tpl.specialty,
        type: tpl.type,
        version: tpl.version,
        isSystem: tpl.isSystem,
        isActive: tpl.isActive,
        stageCount: tpl.steps.length,
        taskCount,
        usageCount: tpl._count.plans,
        lastUpdated: tpl.updatedAt.toISOString().slice(0, 10),
        stages: tpl.steps.map((s) => ({
          id: s.id,
          sortOrder: s.sortOrder,
          name: s.name,
          description: s.description,
          stageType: s.stageType,
          completionStrategy: s.completionStrategy,
          taskCount: s.tasks.length,
          tasks: s.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            taskType: t.taskType,
            ownerRole: t.ownerRole,
            priority: t.priority,
            dueTimingDays: t.dueTimingDays,
            dueTimingHours: t.dueTimingHours,
            triggerEvent: t.triggerEvent,
            communicationConfig: t.communicationConfig,
            reminderConfig: t.reminderConfig,
            escalationConfig: t.escalationConfig,
            completionCondition: t.completionCondition,
            requiredAction: t.requiredAction,
          })),
        })),
      };
    });

    return ok(c, serialized);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");

    const tpl = await prisma.carePlanTemplate.findFirst({
      where: {
        id,
        OR: [{ clinicId: tenant.clinicId }, { isSystem: true }],
      },
      include: {
        steps: {
          orderBy: { sortOrder: "asc" },
          include: { tasks: { orderBy: { sortOrder: "asc" } } },
        },
        _count: { select: { plans: true } },
      },
    });

    if (!tpl) throw notFound("Treatment plan template not found.");

    return ok(c, {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      specialty: tpl.specialty,
      type: tpl.type,
      version: tpl.version,
      isSystem: tpl.isSystem,
      isActive: tpl.isActive,
      usageCount: tpl._count.plans,
      stages: tpl.steps.map((s) => ({
        id: s.id,
        sortOrder: s.sortOrder,
        name: s.name,
        description: s.description,
        stageType: s.stageType,
        completionStrategy: s.completionStrategy,
        tasks: s.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          taskType: t.taskType,
          ownerRole: t.ownerRole,
          priority: t.priority,
          dueTimingDays: t.dueTimingDays,
          dueTimingHours: t.dueTimingHours,
          triggerEvent: t.triggerEvent,
          communicationConfig: t.communicationConfig,
          reminderConfig: t.reminderConfig,
          escalationConfig: t.escalationConfig,
          completionCondition: t.completionCondition,
          requiredAction: t.requiredAction,
        })),
      })),
    });
  })
  .post("/", validate("json", createTemplateSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const body = c.req.valid("json");

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.carePlanTemplate.create({
        data: {
          clinicId: tenant.clinicId,
          name: body.name,
          description: body.description ?? null,
          type: body.type,
          specialty: body.specialty,
          version: 1,
          isSystem: false,
          isActive: true,
        },
      });

      for (let sIdx = 0; sIdx < body.stages.length; sIdx += 1) {
        const stage = body.stages[sIdx]!;
        const step = await tx.carePlanTemplateStep.create({
          data: {
            templateId: created.id,
            sortOrder: sIdx,
            name: stage.name,
            description: stage.description ?? null,
            stageType: stage.stageType ?? null,
            completionStrategy: stage.completionStrategy,
          },
        });

        for (let tIdx = 0; tIdx < stage.tasks.length; tIdx += 1) {
          const task = stage.tasks[tIdx]!;
          await tx.carePlanTemplateTask.create({
            data: {
              templateId: created.id,
              stepId: step.id,
              title: task.title,
              description: task.description ?? null,
              taskType: task.taskType,
              ownerRole: task.ownerRole,
              priority: task.priority,
              dueTimingDays: task.dueTimingDays,
              dueTimingHours: task.dueTimingHours ?? null,
              triggerEvent: task.triggerEvent ?? "STAGE_STARTED",
              communicationConfig: (task.communicationConfig ?? {}) as object,
              reminderConfig: (task.reminderConfig ?? {}) as object,
              escalationConfig: (task.escalationConfig ?? {}) as object,
              completionCondition: (task.completionCondition ?? {}) as object,
              requiredAction: task.requiredAction ?? null,
              sortOrder: tIdx,
            },
          });
        }
      }

      return created;
    });

    await audit(tenant, "treatment_plan_template.create", "CarePlanTemplate", template.id, {
      name: body.name,
      stagesCount: body.stages.length,
    });

    return ok(c, template, 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateTemplateSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await prisma.carePlanTemplate.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!existing) throw notFound("Template not found or system templates cannot be directly overwritten.");

    const updated = await prisma.$transaction(async (tx) => {
      const tpl = await tx.carePlanTemplate.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          version: existing.version + 1,
        },
      });

      if (body.stages) {
        await tx.carePlanTemplateTask.deleteMany({ where: { templateId: id } });
        await tx.carePlanTemplateStep.deleteMany({ where: { templateId: id } });

        for (let sIdx = 0; sIdx < body.stages.length; sIdx += 1) {
          const stage = body.stages[sIdx]!;
          const step = await tx.carePlanTemplateStep.create({
            data: {
              templateId: id,
              sortOrder: sIdx,
              name: stage.name,
              description: stage.description ?? null,
              stageType: stage.stageType ?? null,
              completionStrategy: stage.completionStrategy,
            },
          });

          for (let tIdx = 0; tIdx < stage.tasks.length; tIdx += 1) {
            const task = stage.tasks[tIdx]!;
            await tx.carePlanTemplateTask.create({
              data: {
                templateId: id,
                stepId: step.id,
                title: task.title,
                description: task.description ?? null,
                taskType: task.taskType,
                ownerRole: task.ownerRole,
                priority: task.priority,
                dueTimingDays: task.dueTimingDays,
                dueTimingHours: task.dueTimingHours ?? null,
                triggerEvent: task.triggerEvent ?? "STAGE_STARTED",
                communicationConfig: (task.communicationConfig ?? {}) as object,
                reminderConfig: (task.reminderConfig ?? {}) as object,
                escalationConfig: (task.escalationConfig ?? {}) as object,
                completionCondition: (task.completionCondition ?? {}) as object,
                requiredAction: task.requiredAction ?? null,
                sortOrder: tIdx,
              },
            });
          }
        }
      }

      return tpl;
    });

    await audit(tenant, "treatment_plan_template.update", "CarePlanTemplate", id);
    return ok(c, updated);
  })
  .post("/:id/duplicate", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");

    const source = await prisma.carePlanTemplate.findFirst({
      where: { id, OR: [{ clinicId: tenant.clinicId }, { isSystem: true }] },
      include: {
        steps: {
          orderBy: { sortOrder: "asc" },
          include: { tasks: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!source) throw notFound("Source template not found.");

    const duplicated = await prisma.$transaction(async (tx) => {
      const copy = await tx.carePlanTemplate.create({
        data: {
          clinicId: tenant.clinicId,
          name: `${source.name} (Custom Copy)`,
          description: source.description,
          type: source.type,
          specialty: source.specialty,
          version: 1,
          isSystem: false,
          isActive: true,
          config: (source.config ?? {}) as object,
        },
      });

      for (const st of source.steps) {
        const step = await tx.carePlanTemplateStep.create({
          data: {
            templateId: copy.id,
            sortOrder: st.sortOrder,
            name: st.name,
            description: st.description,
            stageType: st.stageType,
            completionStrategy: st.completionStrategy,
            config: (st.config ?? {}) as object,
          },
        });

        for (const tk of st.tasks) {
          await tx.carePlanTemplateTask.create({
            data: {
              templateId: copy.id,
              stepId: step.id,
              title: tk.title,
              description: tk.description,
              taskType: tk.taskType,
              ownerRole: tk.ownerRole,
              priority: tk.priority,
              dueTimingDays: tk.dueTimingDays,
              dueTimingHours: tk.dueTimingHours,
              triggerEvent: tk.triggerEvent,
              communicationConfig: (tk.communicationConfig ?? {}) as object,
              reminderConfig: (tk.reminderConfig ?? {}) as object,
              escalationConfig: (tk.escalationConfig ?? {}) as object,
              completionCondition: (tk.completionCondition ?? {}) as object,
              requiredAction: tk.requiredAction,
              sortOrder: tk.sortOrder,
            },
          });
        }
      }

      return copy;
    });

    await audit(tenant, "treatment_plan_template.duplicate", "CarePlanTemplate", duplicated.id, {
      sourceId: source.id,
      name: duplicated.name,
    });

    return ok(c, duplicated, 201);
  })
  .post("/:id/toggle", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");

    const existing = await prisma.carePlanTemplate.findFirst({
      where: { id, clinicId: tenant.clinicId },
    });
    if (!existing) throw notFound("Clinic template not found.");

    const updated = await prisma.carePlanTemplate.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return ok(c, updated);
  });

// ─── Care Plans Routes ───────────────────────────────────────────────────────

export const carePlanRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const plans = await getCarePlansForClinic(tenant);
    return ok(c, plans.map(serializeCarePlan));
  })
  .get("/templates", async (c) => {
    // Convenient alias to templates
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const templates = await prisma.carePlanTemplate.findMany({
      where: { OR: [{ clinicId: tenant.clinicId }, { isSystem: true }] },
      include: {
        steps: {
          orderBy: { sortOrder: "asc" },
          include: { tasks: true },
        },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });
    return ok(c, templates);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const plan = await prisma.carePlan.findUnique({ where: { id } });
    return ok(c, serializeCarePlan(await requireClinicOwned(tenant, plan)));
  })
  .get("/:id/journey", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const journey = await getJourneyExecution(tenant, id);
    return ok(c, journey);
  })
  .post("/assign", validate("json", assignTreatmentPlanSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const body = c.req.valid("json");
    const result = await activatePatientTreatmentPlan(tenant, body);
    return ok(c, result, 201);
  })
  .post("/:id/branch", validate("param", idParam), validate("json", branchDecisionSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await handleBranchDecision(tenant, id, body.branch, body.notes);
    return ok(c, result);
  })
  .post("/:id/pause", validate("param", idParam), validate("json", pausePlanSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await pauseCarePlan(tenant, id, body.reason);
    return ok(c, result);
  })
  .post("/:id/resume", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");
    const result = await resumeCarePlan(tenant, id);
    return ok(c, result);
  })
  .post("/", validate("json", createCarePlanSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const body = c.req.valid("json");
    const couple = await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    const plan = await prisma.carePlan.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        type: body.type,
        name: body.name,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        startDate: new Date(),
        createdById: tenant.userId,
      },
    });
    await audit(tenant, "care_plan.create", "CarePlan", plan.id, { patient: body.name });
    return ok(c, serializeCarePlan(plan), 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateCarePlanSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_PLANS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.carePlan.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    const plan = await prisma.carePlan.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.status === undefined ? {} : { status: body.status }),
        ...(body.currentStep === undefined ? {} : { currentStep: body.currentStep, currentStageIndex: body.currentStep }),
      },
    });
    await audit(tenant, "care_plan.update", "CarePlan", plan.id);
    return ok(c, serializeCarePlan(plan));
  });

// ─── Care Tasks Routes ───────────────────────────────────────────────────────

export const careTaskRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const tasks = await prisma.careTask.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    });
    return ok(c, tasks.map((task) => serializeTask(task, task.couple ?? undefined)));
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const task = await prisma.careTask.findUnique({ where: { id }, include: taskInclude });
    await requireClinicOwned(tenant, task);
    return ok(c, serializeTask(task!, task!.couple ?? undefined));
  })
  .post("/", validate("json", createCareTaskSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const body = c.req.valid("json");

    const task = await addDoctorTask(tenant, {
      coupleId: body.coupleId,
      carePlanId: body.carePlanId,
      stageStepId: body.stageStepId,
      title: body.title,
      description: body.description,
      taskType: body.taskType,
      ownerRole: body.ownerRole,
      assignedUserId: body.assignedUserId,
      priority: body.priority,
      dueDate: body.dueDate,
      dueTime: body.dueTime,
      communicationConfig: body.communicationConfig as { whatsappEnabled?: boolean; templateName?: string } | undefined,
      reminderConfig: body.reminderConfig as { remindAtHours?: number } | undefined,
      escalationConfig: body.escalationConfig as { escalateAfterHours?: number; escalateTo?: string } | undefined,
    });

    const refreshed = await prisma.careTask.findUnique({ where: { id: task.id }, include: taskInclude });
    return ok(c, serializeTask(refreshed!, refreshed!.couple ?? undefined), 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateCareTaskSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const updated = await modifyDoctorTask(tenant, id, {
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate ?? undefined,
      dueTime: body.dueTime ?? undefined,
      rescheduleReason: body.rescheduleReason,
      skipReason: body.skipReason,
      status: body.status,
      assignedUserId: body.assignedUserId,
    });

    const refreshed = await prisma.careTask.findUnique({ where: { id: updated.id }, include: taskInclude });
    return ok(c, serializeTask(refreshed!, refreshed!.couple ?? undefined));
  })
  .post("/:id/complete", validate("param", idParam), validate("json", completeTaskSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await completeCareTask(tenant, id, body.evidence);
    return ok(c, result);
  })
  .post("/:id/simulate-response", validate("param", idParam), validate("json", simulateResponseSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await handlePatientResponse(tenant, id, body.text);
    return ok(c, result);
  });

// ─── Care Loop Exceptions & Analytics ────────────────────────────────────────

export const careLoopRoutes = new Hono<AppEnv>()
  .get("/exceptions", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const escalations = await prisma.escalation.findMany({
      where: { clinicId: tenant.clinicId, status: "OPEN" },
      include: {
        couple: { include: { primaryPatient: true, assignedDoctor: true, assignedCoordinator: true } },
        careTask: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = escalations.map((e) => ({
      id: e.id,
      coupleId: e.coupleId,
      coupleName: e.couple ? `${e.couple.primaryPatient.firstName} ${e.couple.primaryPatient.lastName}` : "Couple",
      slug: e.couple?.slug,
      careTaskId: e.careTaskId,
      taskTitle: e.careTask?.title,
      type: e.type,
      severity: e.severity,
      reason: e.reason,
      status: e.status,
      assignedTo: e.assignedTo?.name ?? "Care Team",
      createdAt: e.createdAt.toISOString(),
    }));

    return ok(c, formatted);
  })
  .post("/exceptions/:id/resolve", validate("param", idParam), validate("json", resolveExceptionSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_LOOP_MANAGE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    await requireClinicOwned(
      tenant,
      await prisma.escalation.findUnique({ where: { id } }),
    );

    const updated = await prisma.escalation.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    await audit(tenant, "escalation.resolve", "Escalation", id, { notes: body.notes ?? null });
    return ok(c, updated);
  })
  .get("/analytics", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const [plans, tasks, escalations] = await Promise.all([
      prisma.carePlan.findMany({
        where: { clinicId: tenant.clinicId },
        select: { id: true, status: true, currentStageName: true, type: true },
      }),
      prisma.careTask.findMany({
        where: { clinicId: tenant.clinicId },
        select: { id: true, status: true, priority: true, dueDate: true },
      }),
      prisma.escalation.findMany({
        where: { clinicId: tenant.clinicId },
        select: { id: true, status: true, severity: true, type: true },
      }),
    ]);

    const activeJourneys = plans.filter((p) => p.status === "ACTIVE").length;
    const completedJourneys = plans.filter((p) => p.status === "COMPLETED").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const overdueTasks = tasks.filter((t) => t.status === "OVERDUE" || t.status === "BLOCKED").length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const openExceptions = escalations.filter((e) => e.status === "OPEN").length;
    const resolvedExceptions = escalations.filter((e) => e.status === "RESOLVED").length;

    // Stage distribution
    const stageCounts: Record<string, number> = {};
    for (const p of plans) {
      const stage = p.currentStageName || "Consultation";
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    }

    return ok(c, {
      treatmentPlansAssigned: plans.length,
      activeJourneys,
      completedJourneys,
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      openExceptions,
      resolvedExceptions,
      stageDistribution: stageCounts,
    });
  });
