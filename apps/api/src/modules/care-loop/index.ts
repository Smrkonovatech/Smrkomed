import { Hono } from "hono";
import { PERMISSIONS, getCarePlansForClinic, prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { createCarePlanSchema, idParam, updateCareTaskSchema } from "./schemas";

export const carePlanRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const plans = await getCarePlansForClinic(tenant);
    return ok(c, plans);
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const plan = await prisma.carePlan.findUnique({ where: { id } });
    return ok(c, await requireClinicOwned(tenant, plan));
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
        createdById: tenant.userId,
      },
    });
    await audit(tenant, "care_plan.create", "CarePlan", plan.id);
    return ok(c, plan, 201);
  });

export const careTaskRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const tasks = await prisma.careTask.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      orderBy: { createdAt: "desc" },
    });
    return ok(c, tasks);
  })
  .patch("/:id", validate("param", idParam), validate("json", updateCareTaskSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await prisma.careTask.findUnique({ where: { id } });
    await requireClinicOwned(tenant, existing);
    const completedAt = body.status === "COMPLETED" ? new Date() : body.status ? null : undefined;
    const task = await prisma.careTask.update({
      where: { id },
      data: {
        ...(body.title === undefined ? {} : { title: body.title }),
        ...(body.status === undefined ? {} : { status: body.status }),
        ...(body.dueDate === undefined ? {} : { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(completedAt === undefined ? {} : { completedAt }),
      },
    });
    await audit(tenant, "care_task.update", "CareTask", task.id);
    return ok(c, task);
  });
