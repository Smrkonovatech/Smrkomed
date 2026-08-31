import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });
export const patientIdParam = z.object({ patientId: z.string().min(1) });

export const linkAbhaSchema = z
  .object({
    abhaNumber: z.string().trim().min(8).max(32),
    abhaAddress: z.string().trim().max(120).optional().nullable(),
    confirmPossibleMatchPatientId: z.string().min(1).optional().nullable(),
  })
  .strict();

export const createConsentSchema = z
  .object({
    purpose: z.string().trim().min(3).max(240),
    dataCategories: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    expiresAt: z.string().trim().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    createCareTask: z.boolean().optional(),
  })
  .strict();

export const prepareExchangeSchema = z
  .object({
    purpose: z.string().trim().min(3).max(240),
    recordTypes: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
    dateFrom: z.string().trim().optional().nullable(),
    dateTo: z.string().trim().optional().nullable(),
    receivingEntity: z.string().trim().max(160).optional().nullable(),
    consentId: z.string().min(1).optional().nullable(),
    idempotencyKey: z.string().trim().min(8).max(120),
  })
  .strict();

export const shareExchangeSchema = z
  .object({
    consentId: z.string().min(1).optional().nullable(),
  })
  .strict();

export const journeyStartSchema = z
  .object({
    path: z.enum(["HAS_ABHA", "NO_ABHA", "NOT_SURE"]),
  })
  .strict();

export const journeyConsentSchema = z
  .object({
    sessionPurpose: z.enum(["LINK_EXISTING", "CREATE_ABHA", "DISCOVER"]),
    consentVersion: z.string().trim().min(1).max(40).default("abdm-consent-v1"),
    agreed: z.literal(true),
  })
  .strict();

export const journeyAuthStartSchema = z
  .object({
    purpose: z.enum(["LINK_EXISTING", "CREATE_ABHA", "DISCOVER"]),
    authMethod: z.string().trim().min(2).max(40),
  })
  .strict();

export const journeyOtpSchema = z
  .object({
    sessionId: z.string().uuid(),
    otp: z.string().trim().min(4).max(8),
  })
  .strict();

export const journeyDiscoverSchema = z
  .object({
    forceMockFound: z.boolean().optional(),
  })
  .strict();

export const journeyCreateSchema = z
  .object({
    sessionId: z.string().uuid(),
    detailsConfirmed: z.literal(true),
  })
  .strict();

export const journeyMatchSchema = z
  .object({
    confirmed: z.boolean(),
    abhaNumber: z.string().trim().min(8).max(32).optional(),
    sessionId: z.string().uuid().optional(),
  })
  .strict();
