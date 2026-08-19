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
  createCarePlanSchema,
  createCareTaskSchema,
  idParam,
  updateCarePlanSchema,
  updateCareTaskSchema,
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
} as const;

export const carePlanRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const plans = await getCarePlansForClinic(tenant);
    return ok(c, plans.map(serializeCarePlan));
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const plan = await prisma.carePlan.findUnique({ where: { id } });
    return ok(c, serializeCarePlan(await requireClinicOwned(tenant, plan)));
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
        ...(body.currentStep === undefined ? {} : { currentStep: body.currentStep }),
      },
    });
    await audit(tenant, "care_plan.update", "CarePlan", plan.id);
    return ok(c, serializeCarePlan(plan));
  });

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
    const couple = await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    const carePlanId = body.carePlanId;
    if (carePlanId) {
      const plan = await prisma.carePlan.findUnique({ where: { id: carePlanId } });
      await requireClinicOwned(tenant, plan);
    }
    const dueDate = body.dueDate ? new Date(body.dueDate.includes("T") ? body.dueDate : `${body.dueDate}T00:00:00`) : undefined;
    const task = await prisma.careTask.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        ...(carePlanId ? { carePlanId } : {}),
        title: body.title,
        ...(body.description === undefined ? {} : { description: body.description }),
        ...(body.category === undefined ? {} : { category: body.category }),
        ...(dueDate && !Number.isNaN(dueDate.getTime()) ? { dueDate } : {}),
        ...(body.dueTime === undefined ? {} : { dueTime: body.dueTime }),
        createdById: tenant.userId,
        ...(body.assignedUserId
          ? { assignments: { create: { userId: body.assignedUserId } } }
          : {}),
      },
      include: taskInclude,
    });
    await audit(tenant, "care_task.create", "CareTask", task.id, { patient: body.title });
    return ok(c, serializeTask(task, task.couple ?? undefined), 201);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateCareTaskSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.careTask.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    const completedAt = body.status === "COMPLETED" ? new Date() : body.status ? null : undefined;
    const dueDate =
      body.dueDate === undefined
        ? undefined
        : body.dueDate
          ? new Date(body.dueDate.includes("T") ? body.dueDate : `${body.dueDate}T00:00:00`)
          : null;
    await prisma.careTask.update({
      where: { id },
      data: {
        ...(body.title === undefined ? {} : { title: body.title }),
        ...(body.status === undefined ? {} : { status: body.status }),
        ...(dueDate === undefined ? {} : { dueDate }),
        ...(body.dueTime === undefined ? {} : { dueTime: body.dueTime }),
        ...(completedAt === undefined ? {} : { completedAt }),
      },
    });
    const task = await prisma.careTask.findUnique({ where: { id }, include: taskInclude });
    if (!task) throw notFound();
    await audit(tenant, "care_task.update", "CareTask", task.id, { patient: task.title });
    return ok(c, serializeTask(task, task.couple ?? undefined));
  });
