import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const createCarePlanSchema = z
  .object({
    coupleId: z.string().min(1),
    type: z.enum(["FERTILITY_EVALUATION", "IUI", "IVF", "FET"]),
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const updateCarePlanSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    currentStep: z.number().int().min(0).optional(),
  })
  .strict();

export const createCareTaskSchema = z
  .object({
    coupleId: z.string().min(1),
    carePlanId: z.string().min(1).optional(),
    stageStepId: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional(),
    category: z.string().trim().max(80).optional(),
    taskType: z.string().trim().max(80).optional(),
    ownerRole: z.string().trim().max(80).optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "CLINICAL"]).optional(),
    dueDate: z.string().optional(),
    dueTime: z.string().trim().max(16).optional(),
    assignedUserId: z.string().min(1).optional(),
    communicationConfig: z.record(z.unknown()).optional(),
    reminderConfig: z.record(z.unknown()).optional(),
    escalationConfig: z.record(z.unknown()).optional(),
  })
  .strict();

export const updateCareTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "CLINICAL"]).optional(),
    status: z
      .enum([
        "WAITING",
        "IN_PROGRESS",
        "COMPLETED",
        "OVERDUE",
        "ESCALATED",
        "CANCELLED",
        "NOT_STARTED",
        "UPCOMING",
        "ACTIVE",
        "PENDING",
        "SKIPPED",
        "BLOCKED",
      ])
      .optional(),
    dueDate: z.string().nullable().optional(),
    dueTime: z.string().trim().max(16).nullable().optional(),
    rescheduleReason: z.string().trim().max(500).optional(),
    skipReason: z.string().trim().max(500).optional(),
    assignedUserId: z.string().min(1).optional(),
  })
  .strict();

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(["FERTILITY_EVALUATION", "IUI", "IVF", "FET"]).default("IVF"),
  specialty: z.string().trim().max(100).default("FERTILITY"),
  stages: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(500).optional(),
        stageType: z.string().optional(),
        completionStrategy: z.string().default("ALL_REQUIRED_TASKS_COMPLETE"),
        tasks: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              description: z.string().trim().max(500).optional(),
              taskType: z.string().default("PATIENT_TASK"),
              ownerRole: z.string().default("PATIENT"),
              priority: z.enum(["LOW", "NORMAL", "HIGH", "CLINICAL"]).default("NORMAL"),
              dueTimingDays: z.number().int().min(0).default(0),
              dueTimingHours: z.number().int().min(0).max(23).optional(),
              triggerEvent: z.string().optional(),
              communicationConfig: z.record(z.unknown()).optional(),
              reminderConfig: z.record(z.unknown()).optional(),
              escalationConfig: z.record(z.unknown()).optional(),
              completionCondition: z.record(z.unknown()).optional(),
              requiredAction: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        description: z.string().trim().max(500).optional(),
        stageType: z.string().optional(),
        completionStrategy: z.string().default("ALL_REQUIRED_TASKS_COMPLETE"),
        tasks: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              description: z.string().trim().max(500).optional(),
              taskType: z.string().default("PATIENT_TASK"),
              ownerRole: z.string().default("PATIENT"),
              priority: z.enum(["LOW", "NORMAL", "HIGH", "CLINICAL"]).default("NORMAL"),
              dueTimingDays: z.number().int().min(0).default(0),
              dueTimingHours: z.number().int().min(0).max(23).optional(),
              triggerEvent: z.string().optional(),
              communicationConfig: z.record(z.unknown()).optional(),
              reminderConfig: z.record(z.unknown()).optional(),
              escalationConfig: z.record(z.unknown()).optional(),
              completionCondition: z.record(z.unknown()).optional(),
              requiredAction: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .optional(),
});

export const assignTreatmentPlanSchema = z.object({
  coupleId: z.string().min(1),
  templateId: z.string().min(1),
  doctorId: z.string().optional(),
  coordinatorId: z.string().optional(),
  startDate: z.string().optional(),
  customValues: z
    .object({
      protocolNotes: z.string().optional(),
      prescriptionNotes: z.string().optional(),
      baselineDate: z.string().optional(),
    })
    .optional(),
});

export const branchDecisionSchema = z.object({
  branch: z.enum(["FRESH_TRANSFER", "FREEZE_ALL_FET", "PREGNANCY_CONFIRMED", "UNSUCCESSFUL_CYCLE"]),
  notes: z.string().max(1000).optional(),
});

export const pausePlanSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const completeTaskSchema = z.object({
  evidence: z
    .object({
      replyText: z.string().optional(),
      documentId: z.string().optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
});

export const simulateResponseSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export const resolveExceptionSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});
