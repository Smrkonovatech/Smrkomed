import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

const flowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "TRIGGER",
    "WAIT",
    "CONDITION",
    "SEND_TEMPLATE",
    "SEND_TEXT",
    "CREATE_TASK",
    "ASSIGN_TASK",
    "ASSIGN_STAFF",
    "ESCALATE",
    "NOTIFY_STAFF",
    "ADD_TAG",
    "REMOVE_TAG",
    "END",
    "AI_DRAFT",
  ]),
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

const flowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  branch: z.string().max(40).optional(),
});

export const flowDefinitionSchema = z.object({
  nodes: z.array(flowNodeSchema).max(80),
  edges: z.array(flowEdgeSchema).max(120),
});

export const createFlowSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  triggerType: z.string().min(1).max(64),
  definition: flowDefinitionSchema.optional(),
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  triggerType: z.string().min(1).max(64).optional(),
  definition: flowDefinitionSchema.optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const listFlowsQuery = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "LIBRARY"]).optional(),
  q: z.string().max(120).optional(),
});

export const testFlowSchema = z.object({
  patientId: z.string().optional(),
  coupleId: z.string().optional(),
  conversationId: z.string().optional(),
  vars: z.record(z.string(), z.string()).optional(),
  simulateBranch: z.enum(["yes", "no"]).optional(),
});

export const manualTriggerSchema = z.object({
  patientId: z.string().optional(),
  coupleId: z.string().optional(),
  conversationId: z.string().optional(),
  triggerEventId: z.string().min(1).max(120).optional(),
  vars: z.record(z.string(), z.string()).optional(),
});

export const listExecutionsQuery = z.object({
  flowId: z.string().optional(),
  status: z.string().optional(),
  patientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const KB_CATEGORIES = [
  "Clinic Information",
  "Treatments",
  "Procedures",
  "Preparation Instructions",
  "Post-treatment Instructions",
  "Medicines",
  "Appointment Information",
  "Payment Information",
  "Insurance",
  "FAQs",
  "Fertility / IVF",
  "Dental",
  "Dermatology",
  "Maternity",
  "Aesthetics",
  "Custom",
] as const;

export const KB_SPECIALTIES = [
  "GENERAL",
  "FERTILITY",
  "DENTAL",
  "DERMATOLOGY",
  "MATERNITY",
  "AESTHETICS",
  "CUSTOM",
] as const;

export const createKbSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  content: z.string().min(1).max(50_000),
  keywords: z.string().max(500).nullable().optional(),
  specialty: z.enum(KB_SPECIALTIES).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export const updateKbSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(80).optional(),
  content: z.string().min(1).max(50_000).optional(),
  keywords: z.string().max(500).nullable().optional(),
  specialty: z.enum(KB_SPECIALTIES).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const listKbQuery = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  specialty: z.string().max(40).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

const workingHoursDaySchema = z
  .object({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })
  .nullable();

export const updateCommSettingsSchema = z.object({
  workingHours: z
    .object({
      mon: workingHoursDaySchema.optional(),
      tue: workingHoursDaySchema.optional(),
      wed: workingHoursDaySchema.optional(),
      thu: workingHoursDaySchema.optional(),
      fri: workingHoursDaySchema.optional(),
      sat: workingHoursDaySchema.optional(),
      sun: workingHoursDaySchema.optional(),
    })
    .nullable()
    .optional(),
  timezone: z.string().min(1).max(80).optional(),
  maxMessagesPerDay: z.number().int().min(1).max(50).optional(),
  minDelayMinutes: z.number().int().min(0).max(1440).optional(),
  requireConsentGranted: z.boolean().optional(),
  urgentBypassHours: z.boolean().optional(),
});

export const broadcastPreviewSchema = z.object({
  templateName: z.string().min(1).max(120),
  language: z.string().min(2).max(10).default("en"),
  filters: z
    .object({
      status: z.string().max(40).optional(),
      specialty: z.string().max(40).optional(),
      doctorName: z.string().max(120).optional(),
      inactiveDays: z.number().int().min(1).max(365).optional(),
    })
    .default({}),
});

export const takeoverSchema = z.object({
  reason: z
    .enum([
      "PATIENT_REQUESTED_HUMAN",
      "MEDICAL_QUESTION",
      "AUTOMATION_FAILED",
      "NO_RESPONSE",
      "PAYMENT_ISSUE",
      "APPOINTMENT_ISSUE",
      "CARE_LOOP_PRIORITY",
      "COMPLAINT",
      "PATIENT_CONFUSION",
      "HIGH_PRIORITY",
      "OTHER",
    ])
    .default("OTHER"),
  pauseAutomation: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  assignToUserId: z.string().optional(),
});

export const assignConversationSchema = z.object({
  assignedStaffId: z.string().nullable(),
});

export const conversationStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "WAITING_PATIENT",
    "WAITING_STAFF",
    "HUMAN_HANDOFF",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
  ]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export const inboxListQuery = z.object({
  filter: z
    .enum([
      "all",
      "unread",
      "assigned_to_me",
      "unassigned",
      "waiting_patient",
      "waiting_staff",
      "automation_active",
      "human_handoff",
      "escalated",
      "closed",
    ])
    .default("all"),
  q: z.string().max(120).optional(),
});

export const followUpFromInboxSchema = z.object({
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
});

export const updateConsentSchema = z.object({
  patientId: z.string().min(1),
  status: z.enum(["GRANTED", "REVOKED", "PENDING"]),
  source: z.string().max(120).optional(),
});

export const updatePreferencesSchema = z.object({
  whatsappEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  phoneEnabled: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  careReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  pharmacyReminders: z.boolean().optional(),
});

export const segmentPreviewSchema = z.object({
  filters: z
    .object({
      status: z.string().max(40).optional(),
      inactiveDays: z.number().int().min(1).max(365).optional(),
      doctorUserId: z.string().optional(),
      coordinatorUserId: z.string().optional(),
      appointmentWithinDays: z.number().int().min(0).max(30).optional(),
      appointmentStatus: z.string().max(40).optional(),
      overdueTasks: z.boolean().optional(),
      paymentOverdue: z.boolean().optional(),
      whatsappConsent: z.enum(["GRANTED", "REVOKED", "PENDING", "MISSING"]).optional(),
      noUpcomingAppointment: z.boolean().optional(),
      waitingForStaff: z.boolean().optional(),
    })
    .default({}),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  templateName: z.string().min(1).max(120),
  templateLanguage: z.string().min(2).max(10).default("en"),
  filters: segmentPreviewSchema.shape.filters.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const sessionTextSchema = z.object({
  body: z.string().min(1).max(4096),
});

export const typingSchema = z.object({
  typing: z.boolean(),
});

