import type { PrismaClient } from "@prisma/client";
import {
  IVF_BASIC_JOURNEY,
  IVF_FREEZE_ALL_PROTOCOL,
  IVF_STANDARD_JOURNEY,
  type SeedTemplateDef,
} from "./ivf-template-seed-data";

export async function seedTreatmentPlanTemplates(prisma: PrismaClient, clinicId: string) {
  const templatesToSeed: SeedTemplateDef[] = [
    IVF_STANDARD_JOURNEY,
    IVF_FREEZE_ALL_PROTOCOL,
    IVF_BASIC_JOURNEY,
  ];

  const seededTemplateIds: Record<string, string> = {};

  for (const tpl of templatesToSeed) {
    const existing = await prisma.carePlanTemplate.findFirst({
      where: { clinicId, name: tpl.name },
      include: { steps: true },
    });

    let templateId = existing?.id;

    if (!existing) {
      const created = await prisma.carePlanTemplate.create({
        data: {
          clinicId,
          name: tpl.name,
          type: tpl.type,
          description: tpl.description,
          specialty: tpl.specialty,
          version: tpl.version,
          isSystem: tpl.isSystem,
          isActive: true,
          config: (tpl.config ?? {}) as object,
        },
      });
      templateId = created.id;
    } else {
      await prisma.carePlanTemplate.update({
        where: { id: existing.id },
        data: {
          description: tpl.description,
          specialty: tpl.specialty,
          version: tpl.version,
          isSystem: tpl.isSystem,
          isActive: true,
          config: (tpl.config ?? {}) as object,
        },
      });
    }

    if (!templateId) continue;
    seededTemplateIds[tpl.name] = templateId;

    // Delete existing steps and tasks for clean seeding
    await prisma.carePlanTemplateTask.deleteMany({ where: { templateId } });
    await prisma.carePlanTemplateStep.deleteMany({ where: { templateId } });

    // Seed stages and tasks
    for (let sIdx = 0; sIdx < tpl.stages.length; sIdx += 1) {
      const stage = tpl.stages[sIdx]!;
      const step = await prisma.carePlanTemplateStep.create({
        data: {
          templateId,
          sortOrder: sIdx,
          name: stage.name,
          description: stage.description,
          stageType: stage.stageType,
          completionStrategy: stage.completionStrategy,
          config: (stage.config ?? {}) as object,
        },
      });

      for (let tIdx = 0; tIdx < stage.tasks.length; tIdx += 1) {
        const task = stage.tasks[tIdx]!;
        await prisma.carePlanTemplateTask.create({
          data: {
            templateId,
            stepId: step.id,
            title: task.title,
            description: task.description,
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

  return seededTemplateIds;
}
