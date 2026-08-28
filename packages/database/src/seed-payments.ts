import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { StaffMap } from "./seed-insurance";

function money(n: number) {
  return new Prisma.Decimal(n);
}

function day(offset: number, hour = 11) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Idempotent demo billing invoices + cash payments for existing couples. */
export async function seedClinicPaymentsData(input: {
  prisma: PrismaClient;
  clinicId: string;
  users: StaffMap;
  clinicName?: string;
  force?: boolean;
}) {
  const { prisma, clinicId, users } = input;

  const existingInvoices = await prisma.billingInvoice.count({ where: { clinicId } });
  if (!input.force && existingInvoices > 0) {
    return {
      skipped: true as const,
      reason: "Billing invoices already present",
      invoices: existingInvoices,
    };
  }

  if (input.force) {
    await prisma.billingRefund.deleteMany({ where: { clinicId } });
    await prisma.billingPayment.deleteMany({ where: { clinicId } });
    await prisma.billingInvoiceLine.deleteMany({
      where: { invoice: { clinicId } },
    });
    await prisma.billingInvoice.deleteMany({ where: { clinicId } });
    await prisma.paymentWebhookEvent.deleteMany({ where: { clinicId } });
  }

  const couples = await prisma.couple.findMany({
    where: { clinicId },
    include: { primaryPatient: true },
    orderBy: { createdAt: "asc" },
    take: 4,
  });

  if (couples.length === 0) {
    return {
      skipped: true as const,
      reason: "No couples available for payment seed",
      invoices: 0,
    };
  }

  const creator =
    users["admin@abcfertility.demo"] ??
    users["reception@abcfertility.demo"] ??
    Object.values(users)[0];
  const year = new Date().getFullYear();
  let created = 0;

  for (let i = 0; i < Math.min(couples.length, 3); i++) {
    const couple = couples[i]!;
    const patient = couple.primaryPatient;
    const invoiceNumber = `INV-${year}-${String(i + 1).padStart(5, "0")}`;
    const total = [85000, 45000, 125000][i] ?? 50000;
    const paid = i === 0 ? total : i === 1 ? Math.round(total * 0.4) : 0;
    const status = paid >= total ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "ISSUED";

    const invoice = await prisma.billingInvoice.create({
      data: {
        clinicId,
        invoiceNumber,
        patientId: patient.id,
        coupleId: couple.id,
        source: "TREATMENT",
        title: ["IVF stimulation cycle", "Ultrasound package", "ICSI add-on"][i] ?? "Treatment invoice",
        description: "Demo billing invoice — cash desk collections",
        currency: "INR",
        totalAmount: money(total),
        paidAmount: money(paid),
        status,
        dueDate: day(14 + i * 7),
        issuedAt: day(-3 - i),
        paidAt: status === "PAID" ? day(-1) : null,
        notes: "Seeded demo payment data",
        createdById: creator?.id ?? null,
        lines: {
          create: [
            {
              description: ["Cycle fee", "Monitoring visits", "Lab ICSI fee"][i] ?? "Treatment",
              quantity: 1,
              unitAmount: money(total),
              lineTotal: money(total),
            },
          ],
        },
      },
    });
    created += 1;

    if (paid > 0) {
      await prisma.billingPayment.create({
        data: {
          clinicId,
          invoiceId: invoice.id,
          patientId: patient.id,
          coupleId: couple.id,
          provider: "CASH",
          amount: money(paid),
          currency: "INR",
          status: "SUCCESS",
          method: "cash",
          paidAt: day(-1),
          createdById: creator?.id ?? null,
        },
      });
    }
  }

  return {
    skipped: false as const,
    invoices: created,
    clinicId,
  };
}
