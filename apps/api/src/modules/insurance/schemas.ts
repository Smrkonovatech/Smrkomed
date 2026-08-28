import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  q: z.string().optional(),
  status: z.string().optional(),
  patientId: z.string().optional(),
  coupleId: z.string().optional(),
  providerId: z.string().optional(),
  tpaId: z.string().optional(),
});

export const createProviderSchema = z.object({
  name: z.string().min(1).max(200),
  logoUrl: z.string().max(500).optional().nullable(),
  supportContact: z.string().max(200).optional().nullable(),
  supportEmail: z.string().email().optional().nullable().or(z.literal("")),
  supportPhone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateProviderSchema = createProviderSchema.partial();

export const createTpaSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateTpaSchema = createTpaSchema.partial();

export const createPolicySchema = z.object({
  patientId: z.string().min(1),
  coupleId: z.string().optional().nullable(),
  providerId: z.string().min(1),
  tpaId: z.string().optional().nullable(),
  policyName: z.string().min(1).max(200),
  policyNumber: z.string().min(1).max(100),
  memberId: z.string().max(100).optional().nullable(),
  policyHolderName: z.string().max(200).optional().nullable(),
  relationshipToHolder: z.string().max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  sumInsured: z.number().min(0),
  availableCoverage: z.number().min(0),
  networkStatus: z.string().max(100).optional().nullable(),
  cashlessStatus: z.string().max(100).optional().nullable(),
  status: z
    .enum(["ACTIVE", "EXPIRED", "PENDING_VERIFICATION", "CANCELLED"])
    .optional()
    .default("PENDING_VERIFICATION"),
  eligibilityStatus: z
    .enum(["PENDING", "VERIFIED", "NOT_VERIFIED", "FAILED"])
    .optional()
    .default("PENDING"),
  notes: z.string().max(4000).optional().nullable(),
  cardDocumentId: z.string().optional().nullable(),
});

export const updatePolicySchema = createPolicySchema.partial().omit({ patientId: true });

export const createClaimSchema = z.object({
  patientId: z.string().min(1),
  coupleId: z.string().optional().nullable(),
  policyId: z.string().min(1),
  claimType: z.enum(["CASHLESS", "REIMBURSEMENT", "PRE_AUTH"]).optional().default("PRE_AUTH"),
  treatmentLabel: z.string().max(200).optional().nullable(),
  procedureLabel: z.string().max(200).optional().nullable(),
  diagnosisCategory: z.string().max(200).optional().nullable(),
  expectedAdmissionDate: z.string().optional().nullable(),
  expectedDischargeDate: z.string().optional().nullable(),
  doctorName: z.string().max(200).optional().nullable(),
  assignedCoordinatorId: z.string().optional().nullable(),
  amountRequested: z.number().min(0).default(0),
  priority: z.string().max(40).optional().default("NORMAL"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  documentIds: z
    .array(
      z.object({
        documentId: z.string().min(1),
        documentType: z.string().max(100).optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  submitPreauth: z.boolean().optional().default(false),
});

export const updateClaimSchema = z.object({
  claimType: z.enum(["CASHLESS", "REIMBURSEMENT", "PRE_AUTH"]).optional(),
  treatmentLabel: z.string().max(200).optional().nullable(),
  procedureLabel: z.string().max(200).optional().nullable(),
  diagnosisCategory: z.string().max(200).optional().nullable(),
  expectedAdmissionDate: z.string().optional().nullable(),
  expectedDischargeDate: z.string().optional().nullable(),
  doctorName: z.string().max(200).optional().nullable(),
  assignedCoordinatorId: z.string().optional().nullable(),
  amountRequested: z.number().min(0).optional(),
  amountApproved: z.number().min(0).optional(),
  amountRejected: z.number().min(0).optional(),
  patientResponsibility: z.number().min(0).optional(),
  priority: z.string().max(40).optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "QUERY",
      "APPROVED",
      "PARTIALLY_APPROVED",
      "REJECTED",
      "FINAL_BILL_PENDING",
      "PAYMENT_PENDING",
      "PAID",
      "CLOSED",
    ])
    .optional(),
});

export const createQuerySchema = z.object({
  message: z.string().min(1).max(4000),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export const respondQuerySchema = z.object({
  responseMessage: z.string().min(1).max(4000),
  markResolved: z.boolean().optional().default(false),
});

export const attachDocumentSchema = z.object({
  documentId: z.string().min(1),
  documentType: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.string().max(100).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
