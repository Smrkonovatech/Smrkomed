import { z } from "zod";

import { CAMPAIGN_STATUSES, LEAD_SOURCES, LEAD_STAGES, LEAD_STATUSES, LOST_REASONS, SORT_FIELDS } from "../crm/constants";

function zEnum<T extends string>(values: readonly T[]) {
  return z.enum(values as [T, ...T[]]);
}

export const idParam = z.object({ id: z.string().min(1) });

const sourceEnum = zEnum(LEAD_SOURCES);

export const createLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(32).optional(),
    email: z.string().trim().email().optional(),
    source: sourceEnum,
    sourceDetail: z.string().trim().max(200).optional(),
    campaignId: z.string().min(1).max(64).optional(),
    campaign: z.string().trim().max(200).optional(),
    medium: z.string().trim().max(80).optional(),
    location: z.string().trim().max(200).optional(),
    treatmentInterest: z.string().trim().max(80).optional(),
    preferredLanguage: z.string().trim().max(16).optional(),
    utmSource: z.string().trim().max(80).optional(),
    utmMedium: z.string().trim().max(80).optional(),
    utmCampaign: z.string().trim().max(120).optional(),
    utmTerm: z.string().trim().max(80).optional(),
    utmContent: z.string().trim().max(80).optional(),
    createAnyway: z.boolean().optional(),
    assignedToId: z.string().min(1).max(64).optional(),
  })
  .strict();

export const updateLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    status: z
      .enum([
        ...LEAD_STATUSES,
        "CONTACTED",
        "QUALIFIED",
        "CONSULTATION_BOOKED",
        "CONSULTATION_COMPLETED",
        "TREATMENT_DISCUSSION",
        "TREATMENT_STARTED",
        "ACTIVE_PATIENT",
      ])
      .optional(),
    stage: zEnum(LEAD_STAGES).optional(),
    location: z.string().trim().max(200).nullable().optional(),
    treatmentInterest: z.string().trim().max(80).nullable().optional(),
    preferredLanguage: z.string().trim().max(16).nullable().optional(),
    sourceDetail: z.string().trim().max(200).nullable().optional(),
    campaignId: z.string().min(1).max(64).nullable().optional(),
    medium: z.string().trim().max(80).nullable().optional(),
    nextFollowUpAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export const listLeadQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  stage: zEnum(LEAD_STAGES).optional(),
  status: zEnum(LEAD_STATUSES).optional(),
  source: sourceEnum.optional(),
  campaignId: z.string().min(1).optional(),
  assignedUser: z.string().min(1).optional(),
  treatmentInterest: z.string().trim().max(80).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sort: zEnum(SORT_FIELDS).optional(),
});

export const assignLeadSchema = z
  .object({
    assignedToId: z.string().min(1).max(64).nullable(),
    roundRobin: z.boolean().optional(),
  })
  .strict();

export const stageLeadSchema = z
  .object({
    stage: zEnum(LEAD_STAGES),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export const convertLeadSchema = z
  .object({
    createCouple: z.boolean().optional(),
    partnerName: z.string().trim().max(200).optional(),
    existingPatientId: z.string().min(1).max(64).optional(),
    bookConsultationAt: z.string().datetime().optional(),
  })
  .strict();

export const lostLeadSchema = z
  .object({
    reason: zEnum(LOST_REASONS),
    detail: z.string().trim().max(300).optional(),
  })
  .strict();

export const activityCreateSchema = z
  .object({
    type: z.enum([
      "CALL_ATTEMPTED",
      "CALL_CONNECTED",
      "COUNSELLING_COMPLETED",
      "NOTE_ADDED",
      "WHATSAPP_SENT",
      "WHATSAPP_RECEIVED",
    ]),
    description: z.string().trim().min(1).max(1000),
  })
  .strict();

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional(),
    dueDate: z.string().datetime(),
    priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
    ownerId: z.string().min(1).max(64).optional(),
  })
  .strict();

export const whatsappSendSchema = z
  .object({
    templateId: z.string().min(1).max(64),
    parameters: z.array(z.string().max(256)).max(10).default([]),
  })
  .strict();

export const importPreviewSchema = z
  .object({
    rows: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          phone: z.string().trim().max(32).optional(),
          email: z.string().trim().email().optional().or(z.literal("")),
          source: sourceEnum,
          campaign: z.string().trim().max(200).optional(),
          treatmentInterest: z.string().trim().max(80).optional(),
          assignedToEmail: z.string().trim().email().optional(),
        }),
      )
      .min(1)
      .max(200),
    confirm: z.boolean().optional(),
  })
  .strict();

export const campaignCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    source: sourceEnum,
    medium: z.string().trim().max(80).optional(),
    treatmentFocus: z.string().trim().max(80).optional(),
    status: zEnum(CAMPAIGN_STATUSES).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    campaignExternalId: z.string().trim().max(120).optional(),
  })
  .strict();

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const campaignListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  source: sourceEnum.optional(),
  status: zEnum(CAMPAIGN_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

export const publicLeadSchema = z
  .object({
    clinicSlug: z.string().trim().min(2).max(80),
    name: z.string().trim().min(2).max(200),
    phone: z.string().trim().min(8).max(32),
    email: z.string().trim().email().optional().or(z.literal("")),
    treatment: z.string().trim().max(80).optional(),
    location: z.string().trim().max(200).optional(),
    utmSource: z.string().trim().max(80).optional(),
    utmMedium: z.string().trim().max(80).optional(),
    utmCampaign: z.string().trim().max(120).optional(),
    utmTerm: z.string().trim().max(80).optional(),
    utmContent: z.string().trim().max(80).optional(),
    landingPage: z.string().trim().max(300).optional(),
    website: z.string().max(0).optional(),
  })
  .strict();
