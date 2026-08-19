import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const createPatientSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(),
    phone: z.string().trim().max(32).optional(),
    whatsappNumber: z.string().trim().max(32).optional(),
    email: z.string().trim().email().optional(),
    preferredLanguage: z.string().trim().max(16).optional(),
  })
  .strict();

export const updatePatientSchema = createPatientSchema
  .partial()
  .extend({
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  })
  .strict();
