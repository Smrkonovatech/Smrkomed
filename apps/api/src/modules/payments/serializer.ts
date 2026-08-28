import type {
  BillingInvoice,
  BillingInvoiceLine,
  BillingPayment,
  BillingRefund,
  PaymentGatewayConnection,
  Prisma,
} from "@prisma/client";

export function dec(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(value);
}

type PublicConfig = {
  keyId?: string | undefined;
  appId?: string | undefined;
  merchantKey?: string | undefined;
  mode?: string | undefined;
};

function asPublicConfig(config: Prisma.JsonValue | null | undefined): PublicConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  const obj = config as Record<string, unknown>;
  return {
    keyId: typeof obj["keyId"] === "string" ? obj["keyId"] : undefined,
    appId: typeof obj["appId"] === "string" ? obj["appId"] : undefined,
    merchantKey: typeof obj["merchantKey"] === "string" ? obj["merchantKey"] : undefined,
    mode: typeof obj["mode"] === "string" ? obj["mode"] : undefined,
  };
}

function last4(value?: string) {
  if (!value) return null;
  return value.length <= 4 ? value : value.slice(-4);
}

export function serializeConnection(connection: PaymentGatewayConnection) {
  const publicConfig = asPublicConfig(connection.config);
  const publicId = publicConfig.keyId ?? publicConfig.appId ?? publicConfig.merchantKey;
  return {
    id: connection.id,
    clinicId: connection.clinicId,
    provider: connection.provider,
    displayName: connection.displayName,
    mode: connection.mode,
    status: connection.status,
    isDefault: connection.isDefault,
    isActive: connection.isActive,
    lastTestedAt: connection.lastTestedAt?.toISOString() ?? null,
    lastError: connection.lastError,
    hasCredentials: Boolean(connection.encryptedCredentials),
    publicKeyLast4: last4(publicId),
    config: {
      keyId: publicConfig.keyId ? `****${last4(publicConfig.keyId)}` : undefined,
      appId: publicConfig.appId ? `****${last4(publicConfig.appId)}` : undefined,
      merchantKey: publicConfig.merchantKey ? `****${last4(publicConfig.merchantKey)}` : undefined,
      mode: publicConfig.mode ?? connection.mode,
    },
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export function serializeInvoiceLine(line: BillingInvoiceLine) {
  return {
    id: line.id,
    description: line.description,
    quantity: line.quantity,
    unitAmount: dec(line.unitAmount),
    lineTotal: dec(line.lineTotal),
    createdAt: line.createdAt.toISOString(),
  };
}

export function serializeInvoice(
  invoice: BillingInvoice & {
    lines?: BillingInvoiceLine[];
    payments?: BillingPayment[];
    patient?: { id: string; firstName: string; lastName: string } | null;
    couple?: { id: string; slug: string } | null;
  },
) {
  const total = dec(invoice.totalAmount);
  const paid = dec(invoice.paidAmount);
  return {
    id: invoice.id,
    clinicId: invoice.clinicId,
    invoiceNumber: invoice.invoiceNumber,
    patientId: invoice.patientId,
    coupleId: invoice.coupleId,
    pharmacySaleId: invoice.pharmacySaleId,
    source: invoice.source,
    title: invoice.title,
    description: invoice.description,
    currency: invoice.currency,
    totalAmount: total,
    paidAmount: paid,
    outstandingAmount: Math.max(0, Math.round((total - paid) * 100) / 100),
    status: invoice.status,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    issuedAt: invoice.issuedAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    notes: invoice.notes,
    createdById: invoice.createdById,
    patient: invoice.patient
      ? {
          id: invoice.patient.id,
          name: `${invoice.patient.firstName} ${invoice.patient.lastName}`.trim(),
        }
      : null,
    couple: invoice.couple ? { id: invoice.couple.id, slug: invoice.couple.slug } : null,
    lines: invoice.lines?.map(serializeInvoiceLine),
    payments: invoice.payments?.map(serializePayment),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function serializePayment(
  payment: BillingPayment & {
    refunds?: BillingRefund[];
    invoice?: Pick<BillingInvoice, "id" | "invoiceNumber" | "title"> | null;
  },
) {
  return {
    id: payment.id,
    clinicId: payment.clinicId,
    invoiceId: payment.invoiceId,
    patientId: payment.patientId,
    coupleId: payment.coupleId,
    pharmacySaleId: payment.pharmacySaleId,
    gatewayConnectionId: payment.gatewayConnectionId,
    provider: payment.provider,
    amount: dec(payment.amount),
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    gatewayOrderId: payment.gatewayOrderId,
    gatewayPaymentId: payment.gatewayPaymentId,
    gatewayReference: payment.gatewayReference,
    paymentLinkUrl: payment.paymentLinkUrl,
    paymentLinkId: payment.paymentLinkId,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdById: payment.createdById,
    invoice: payment.invoice
      ? {
          id: payment.invoice.id,
          invoiceNumber: payment.invoice.invoiceNumber,
          title: payment.invoice.title,
        }
      : null,
    refunds: payment.refunds?.map(serializeRefund),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function serializeRefund(refund: BillingRefund) {
  return {
    id: refund.id,
    clinicId: refund.clinicId,
    paymentId: refund.paymentId,
    amount: dec(refund.amount),
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    gatewayRefundId: refund.gatewayRefundId,
    failureReason: refund.failureReason,
    processedAt: refund.processedAt?.toISOString() ?? null,
    createdById: refund.createdById,
    createdAt: refund.createdAt.toISOString(),
    updatedAt: refund.updatedAt.toISOString(),
  };
}

export function formatReceiptText(input: {
  clinicName: string;
  payment: BillingPayment;
  invoice?: BillingInvoice | null;
  patientName?: string | null;
}) {
  const lines = [
    "SmrkoMed Payment Receipt",
    "========================",
    `Clinic: ${input.clinicName}`,
    `Receipt: ${input.payment.id}`,
    `Date: ${(input.payment.paidAt ?? input.payment.createdAt).toISOString()}`,
    `Provider: ${input.payment.provider}`,
    `Status: ${input.payment.status}`,
    `Amount: ₹${dec(input.payment.amount).toFixed(2)} ${input.payment.currency}`,
  ];
  if (input.invoice) {
    lines.push(`Invoice: ${input.invoice.invoiceNumber} — ${input.invoice.title}`);
  }
  if (input.patientName) {
    lines.push(`Patient: ${input.patientName}`);
  }
  if (input.payment.gatewayPaymentId) {
    lines.push(`Gateway payment: ${input.payment.gatewayPaymentId}`);
  }
  if (input.payment.method) {
    lines.push(`Method: ${input.payment.method}`);
  }
  lines.push("", "Thank you.");
  return lines.join("\n");
}
