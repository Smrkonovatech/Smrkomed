import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });
export const providerParam = z.object({
  provider: z.enum(["RAZORPAY", "CASHFREE", "PAYU"]),
});
export const patientParam = z.object({ patientId: z.string().min(1) });
export const coupleParam = z.object({ coupleId: z.string().min(1) });
export const saleParam = z.object({ saleId: z.string().min(1) });
export const paymentIdParam = z.object({ paymentId: z.string().min(1) });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  q: z.string().optional(),
  status: z.string().optional(),
  patientId: z.string().optional(),
  coupleId: z.string().optional(),
  invoiceId: z.string().optional(),
  provider: z.string().optional(),
});

export const connectGatewaySchema = z.object({
  mode: z.enum(["TEST", "LIVE"]).optional().default("TEST"),
  displayName: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  credentials: z
    .object({
      keyId: z.string().min(1).optional(),
      keySecret: z.string().min(1).optional(),
      appId: z.string().min(1).optional(),
      secretKey: z.string().min(1).optional(),
      merchantKey: z.string().min(1).optional(),
      merchantSalt: z.string().min(1).optional(),
      webhookSecret: z.string().min(1).optional(),
    })
    .passthrough(),
});

export const patchGatewaySchema = z.object({
  isActive: z.boolean().optional(),
  displayName: z.string().max(200).optional().nullable(),
  mode: z.enum(["TEST", "LIVE"]).optional(),
});

export const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).default(1),
  unitAmount: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().optional().nullable(),
  coupleId: z.string().optional().nullable(),
  pharmacySaleId: z.string().optional().nullable(),
  source: z.enum(["TREATMENT", "PHARMACY", "MANUAL", "OTHER"]).optional().default("MANUAL"),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  currency: z.string().max(10).optional().default("INR"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  provider: z.enum(["RAZORPAY", "CASHFREE", "PAYU", "MANUAL", "CASH"]).optional(),
  method: z.string().max(80).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  customer: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().max(40).optional(),
    })
    .optional(),
});

export const verifyPaymentSchema = z.object({
  gatewayPaymentId: z.string().min(1).optional().nullable(),
  gatewayOrderId: z.string().min(1).optional().nullable(),
  signature: z.string().optional().nullable(),
});

export const createRefundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional().nullable(),
});

export const paymentLinkSchema = z.object({
  description: z.string().max(500).optional().nullable(),
  customer: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().max(40).optional(),
    })
    .optional(),
});
