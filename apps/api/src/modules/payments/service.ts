import type {
  BillingInvoice,
  BillingPayment,
  BillingPaymentStatus,
  PaymentGatewayConnection,
  Prisma,
} from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "@smrkomed/database";

import { decryptString, encryptString } from "../../integrations/credentials/encryption";
import { HttpError } from "../../lib/errors";
import type { GatewayCredentials } from "./providers";
import { dec } from "./serializer";

type Tx = Prisma.TransactionClient;

export function money(value: number): PrismaNS.Decimal {
  return new PrismaNS.Decimal(Math.round(value * 100) / 100);
}

export function outstanding(invoice: Pick<BillingInvoice, "totalAmount" | "paidAmount">) {
  return Math.max(0, Math.round((dec(invoice.totalAmount) - dec(invoice.paidAmount)) * 100) / 100);
}

export function decryptConnection(connection: PaymentGatewayConnection): GatewayCredentials {
  if (!connection.encryptedCredentials) {
    throw new HttpError(400, "GATEWAY_NOT_CONFIGURED", "Payment gateway credentials are not configured.");
  }
  try {
    const parsed = JSON.parse(decryptString(connection.encryptedCredentials)) as GatewayCredentials;
    if (connection.webhookSecretEncrypted && !parsed.webhookSecret) {
      parsed.webhookSecret = decryptString(connection.webhookSecretEncrypted);
    }
    return parsed;
  } catch {
    throw new HttpError(500, "GATEWAY_CREDENTIALS_INVALID", "Unable to read payment gateway credentials.");
  }
}

export function encryptCredentials(credentials: GatewayCredentials) {
  return encryptString(JSON.stringify(credentials));
}

export function publicConfigFromCredentials(
  provider: "RAZORPAY" | "CASHFREE" | "PAYU",
  credentials: GatewayCredentials,
  mode: "TEST" | "LIVE",
) {
  if (provider === "RAZORPAY") {
    return { keyId: credentials.keyId, mode };
  }
  if (provider === "CASHFREE") {
    return { appId: credentials.appId, mode };
  }
  return { merchantKey: credentials.merchantKey, mode };
}

export async function getDefaultConnection(clinicId: string) {
  const preferred = await prisma.paymentGatewayConnection.findFirst({
    where: { clinicId, isDefault: true, isActive: true, status: "CONNECTED" },
  });
  if (preferred) return preferred;
  return prisma.paymentGatewayConnection.findFirst({
    where: { clinicId, isActive: true, status: "CONNECTED" },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getConnectionForProvider(
  clinicId: string,
  provider: "RAZORPAY" | "CASHFREE" | "PAYU",
) {
  return prisma.paymentGatewayConnection.findUnique({
    where: { clinicId_provider: { clinicId, provider } },
  });
}

export async function unsetOtherDefaults(
  tx: Tx,
  clinicId: string,
  exceptProvider?: "RAZORPAY" | "CASHFREE" | "PAYU",
) {
  await tx.paymentGatewayConnection.updateMany({
    where: {
      clinicId,
      isDefault: true,
      ...(exceptProvider ? { provider: { not: exceptProvider } } : {}),
    },
    data: { isDefault: false },
  });
}

export async function nextInvoiceNumber(clinicId: string, tx?: Tx) {
  const client = tx ?? prisma;
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await client.billingInvoice.count({
    where: { clinicId, invoiceNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

async function syncPharmacySalePaymentStatus(
  tx: Tx,
  pharmacySaleId: string | null | undefined,
  invoice: Pick<BillingInvoice, "totalAmount" | "paidAmount" | "status">,
) {
  if (!pharmacySaleId) return;
  let paymentStatus: "PENDING" | "PAID" | "PARTIAL" | "REFUNDED" = "PENDING";
  if (invoice.status === "PAID") paymentStatus = "PAID";
  else if (invoice.status === "PARTIALLY_PAID") paymentStatus = "PARTIAL";
  else if (dec(invoice.paidAmount) <= 0) paymentStatus = "PENDING";
  await tx.pharmacySale.update({
    where: { id: pharmacySaleId },
    data: { paymentStatus },
  });
}

export async function applySuccessfulPayment(tx: Tx, payment: BillingPayment) {
  if (payment.status === "SUCCESS" || payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
    return { payment, invoice: payment.invoiceId ? await tx.billingInvoice.findUnique({ where: { id: payment.invoiceId } }) : null };
  }

  const updatedPayment = await tx.billingPayment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      paidAt: payment.paidAt ?? new Date(),
      failureReason: null,
    },
  });

  if (!payment.invoiceId) {
    if (payment.pharmacySaleId) {
      await tx.pharmacySale.update({
        where: { id: payment.pharmacySaleId },
        data: { paymentStatus: "PAID" },
      });
    }
    return { payment: updatedPayment, invoice: null };
  }

  const invoice = await tx.billingInvoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
  const newPaid = Math.round((dec(invoice.paidAmount) + dec(payment.amount)) * 100) / 100;
  const total = dec(invoice.totalAmount);
  const status = newPaid >= total - 0.001 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : invoice.status;
  const updatedInvoice = await tx.billingInvoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: money(newPaid),
      status,
      paidAt: status === "PAID" ? new Date() : invoice.paidAt,
    },
  });
  await syncPharmacySalePaymentStatus(tx, updatedInvoice.pharmacySaleId ?? payment.pharmacySaleId, updatedInvoice);
  return { payment: updatedPayment, invoice: updatedInvoice };
}

export async function applyRefund(
  tx: Tx,
  payment: BillingPayment,
  refundAmount: number,
  meta: {
    gatewayRefundId?: string | null;
    reason?: string | null;
    createdById?: string | null;
    status?: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING";
    failureReason?: string | null;
  },
) {
  const refundStatus = meta.status ?? "SUCCESS";
  const refund = await tx.billingRefund.create({
    data: {
      clinicId: payment.clinicId,
      paymentId: payment.id,
      amount: money(refundAmount),
      currency: payment.currency,
      status: refundStatus,
      reason: meta.reason ?? null,
      gatewayRefundId: meta.gatewayRefundId ?? null,
      failureReason: meta.failureReason ?? null,
      createdById: meta.createdById ?? null,
      processedAt: refundStatus === "SUCCESS" ? new Date() : null,
    },
  });

  if (refundStatus !== "SUCCESS") {
    return { refund, payment, invoice: null };
  }

  const successfulRefunds = await tx.billingRefund.aggregate({
    where: { paymentId: payment.id, status: "SUCCESS" },
    _sum: { amount: true },
  });
  const refundedTotal = dec(successfulRefunds._sum.amount);
  const paymentAmount = dec(payment.amount);
  let paymentStatus: BillingPaymentStatus = "PARTIALLY_REFUNDED";
  if (refundedTotal >= paymentAmount - 0.001) {
    paymentStatus = "REFUNDED";
  }

  const updatedPayment = await tx.billingPayment.update({
    where: { id: payment.id },
    data: { status: paymentStatus },
  });

  let updatedInvoice: BillingInvoice | null = null;
  if (payment.invoiceId) {
    const invoice = await tx.billingInvoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
    const newPaid = Math.max(0, Math.round((dec(invoice.paidAmount) - refundAmount) * 100) / 100);
    const total = dec(invoice.totalAmount);
    const status =
      newPaid <= 0.001 ? "ISSUED" : newPaid >= total - 0.001 ? "PAID" : "PARTIALLY_PAID";
    updatedInvoice = await tx.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: money(newPaid),
        status,
        paidAt: status === "PAID" ? invoice.paidAt ?? new Date() : null,
      },
    });
    await syncPharmacySalePaymentStatus(tx, updatedInvoice.pharmacySaleId ?? payment.pharmacySaleId, updatedInvoice);
  }

  return { refund, payment: updatedPayment, invoice: updatedInvoice };
}

export async function dashboardAggregates(clinicId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [todaySuccess, pending, failed, refundsToday, invoices] = await Promise.all([
    prisma.billingPayment.aggregate({
      where: {
        clinicId,
        status: "SUCCESS",
        paidAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.billingPayment.aggregate({
      where: { clinicId, status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.billingPayment.aggregate({
      where: { clinicId, status: "FAILED", createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.billingRefund.aggregate({
      where: { clinicId, status: "SUCCESS", processedAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.billingInvoice.findMany({
      where: { clinicId, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { totalAmount: true, paidAmount: true },
    }),
  ]);

  const outstandingTotal = invoices.reduce((sum, inv) => sum + outstanding(inv), 0);

  return {
    todayCollections: {
      amount: dec(todaySuccess._sum.amount),
      count: todaySuccess._count,
    },
    pending: {
      amount: dec(pending._sum.amount),
      count: pending._count,
    },
    outstanding: {
      amount: Math.round(outstandingTotal * 100) / 100,
      count: invoices.length,
    },
    failed: {
      amount: dec(failed._sum.amount),
      count: failed._count,
    },
    refunds: {
      amount: dec(refundsToday._sum.amount),
      count: refundsToday._count,
    },
  };
}
