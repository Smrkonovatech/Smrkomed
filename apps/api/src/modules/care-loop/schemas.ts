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
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500).optional(),
    category: z.string().trim().max(80).optional(),
    dueDate: z.string().optional(),
    dueTime: z.string().trim().max(16).optional(),
    assignedUserId: z.string().min(1).optional(),
  })
  .strict();

export const updateCareTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["WAITING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "ESCALATED", "CANCELLED"]).optional(),
    dueDate: z.string().nullable().optional(),
    dueTime: z.string().trim().max(16).nullable().optional(),
  })
  .strict();
