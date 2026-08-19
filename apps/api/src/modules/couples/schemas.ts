import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

const personInput = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    dob: z.string().trim().min(1),
    phone: z.string().trim().min(7).max(32),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email address"),
    language: z.string().trim().max(16).optional(),
  })
  .strict();

export const createCoupleSchema = z
  .object({
    primary: personInput,
    partner: personInput.optional(),
    treatment: z.enum(["IVF", "IUI", "Evaluation", "FET"]).default("Evaluation"),
    assignedDoctorId: z.string().min(1).optional(),
    assignedCoordinatorId: z.string().min(1).optional(),
    doctorName: z.string().trim().max(120).optional(),
    coordinatorName: z.string().trim().max(120).optional(),
    whatsappConsent: z.boolean().optional(),
    carePlanTemplate: z.string().trim().max(80).optional(),
  })
  .strict();

export const updateCoupleSchema = z
  .object({
    assignedDoctorId: z.string().min(1).nullable().optional(),
    assignedCoordinatorId: z.string().min(1).nullable().optional(),
    careLoopActive: z.boolean().optional(),
    status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  })
  .strict();
