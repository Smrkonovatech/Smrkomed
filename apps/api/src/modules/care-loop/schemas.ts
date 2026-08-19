import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const createCarePlanSchema = z
  .object({
    coupleId: z.string().min(1),
    type: z.enum(["FERTILITY_EVALUATION", "IUI", "IVF", "FET"]),
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const updateCareTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["WAITING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "ESCALATED", "CANCELLED"]).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  })
  .strict();
