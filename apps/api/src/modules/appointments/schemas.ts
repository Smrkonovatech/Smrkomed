import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const createAppointmentSchema = z
  .object({
    coupleId: z.string().min(1),
    type: z.string().trim().min(1).max(120),
    startsAt: z.string().datetime(),
    durationMin: z.number().int().positive().max(24 * 60).optional(),
    doctorName: z.string().trim().max(120).optional(),
    room: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const updateAppointmentSchema = z
  .object({
    type: z.string().trim().min(1).max(120).optional(),
    startsAt: z.string().datetime().optional(),
    durationMin: z.number().int().positive().max(24 * 60).optional(),
    doctorName: z.string().trim().max(120).nullable().optional(),
    room: z.string().trim().max(80).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    status: z.enum(["CONFIRMED", "WAITING", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  })
  .strict();
