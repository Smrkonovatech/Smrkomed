import { Prisma } from "@prisma/client";
import type { PharmacyStockMovementType, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { HttpError } from "../../lib/errors";

export function dec(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

export function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(Math.round(value * 100) / 100);
}

export function clinicWhere(tenant: TenantContext) {
  return { clinicId: tenant.clinicId };
}

export function isExpired(expiryDate: Date | null | undefined, now = new Date()) {
  if (!expiryDate) return false;
  const end = new Date(expiryDate);
  end.setHours(23, 59, 59, 999);
  return end < now;
}

export function daysUntil(expiryDate: Date | null | undefined, now = new Date()) {
  if (!expiryDate) return null;
  const end = new Date(expiryDate);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

export function batchStockStatus(
  batch: { availableQuantity: number; expiryDate: Date | null },
  product: { minimumStock: number; reorderLevel: number },
  warningDays: number,
) {
  if (isExpired(batch.expiryDate)) return "EXPIRED" as const;
  const days = daysUntil(batch.expiryDate);
  if (days !== null && days <= warningDays) {
    if (batch.availableQuantity <= 0) return "OUT_OF_STOCK" as const;
    return "EXPIRING_SOON" as const;
  }
  if (batch.availableQuantity <= 0) return "OUT_OF_STOCK" as const;
  const threshold = Math.max(product.minimumStock, product.reorderLevel);
  if (threshold > 0 && batch.availableQuantity <= threshold) return "LOW_STOCK" as const;
  return "IN_STOCK" as const;
}

export async function getPharmacySettings(clinicId: string) {
  return prisma.pharmacySetting.upsert({
    where: { clinicId },
    create: { clinicId },
    update: {},
  });
}

type ApplyStockInput = {
  tenant: TenantContext;
  productId: string;
  batchId: string;
  /** Signed delta: positive increases stock, negative decreases. */
  delta: number;
  type: PharmacyStockMovementType;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  tx?: Prisma.TransactionClient;
};

/** Atomically apply a stock change and write a movement row. Never allows negative available quantity. */
export async function applyStockChange(input: ApplyStockInput) {
  const client = input.tx ?? prisma;
  if (input.delta === 0) {
    throw new HttpError(422, "INVALID_QUANTITY", "Stock change quantity cannot be zero.");
  }

  const batch = await client.pharmacyBatch.findFirst({
    where: { id: input.batchId, clinicId: input.tenant.clinicId, productId: input.productId },
  });
  if (!batch) {
    throw new HttpError(404, "BATCH_NOT_FOUND", "Inventory batch was not found.");
  }

  const nextAvailable = batch.availableQuantity + input.delta;
  if (nextAvailable < 0) {
    throw new HttpError(422, "INSUFFICIENT_STOCK", "Insufficient available stock for this operation.", {
      available: batch.availableQuantity,
      requested: Math.abs(input.delta),
    });
  }

  const nextQuantity = Math.max(batch.quantity + input.delta, nextAvailable);

  const updated = await client.pharmacyBatch.update({
    where: { id: batch.id },
    data: {
      availableQuantity: nextAvailable,
      quantity: nextQuantity,
    },
  });

  const movement = await client.pharmacyStockMovement.create({
    data: {
      clinicId: input.tenant.clinicId,
      productId: input.productId,
      batchId: batch.id,
      type: input.type,
      quantity: input.delta,
      balanceAfter: nextAvailable,
      reason: input.reason ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      actorUserId: input.tenant.userId,
    },
  });

  return { batch: updated, movement };
}

export async function assertSellableBatch(
  tenant: TenantContext,
  batchId: string,
  quantity: number,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const batch = await client.pharmacyBatch.findFirst({
    where: { id: batchId, clinicId: tenant.clinicId },
    include: { product: true },
  });
  if (!batch) throw new HttpError(404, "BATCH_NOT_FOUND", "Inventory batch was not found.");
  if (isExpired(batch.expiryDate)) {
    throw new HttpError(422, "BATCH_EXPIRED", "Expired stock cannot be sold or dispensed.");
  }
  if (quantity <= 0) {
    throw new HttpError(422, "INVALID_QUANTITY", "Quantity must be greater than zero.");
  }
  if (batch.availableQuantity < quantity) {
    throw new HttpError(422, "INSUFFICIENT_STOCK", "Insufficient available stock for this operation.", {
      available: batch.availableQuantity,
      requested: quantity,
    });
  }
  return batch;
}

export async function nextDocumentNumber(
  tenant: TenantContext,
  prefix: string,
  field: "invoiceNumber" | "orderNumber",
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const like = `${prefix}-${stamp}-%`;

  if (field === "invoiceNumber") {
    const latest = await client.pharmacySale.findFirst({
      where: { clinicId: tenant.clinicId, invoiceNumber: { startsWith: `${prefix}-${stamp}-` } },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    const seq = latest ? Number(latest.invoiceNumber.split("-").pop() ?? "0") + 1 : 1;
    return `${prefix}-${stamp}-${String(seq).padStart(4, "0")}`;
  }

  const latest = await client.pharmacyPurchaseOrder.findFirst({
    where: { clinicId: tenant.clinicId, orderNumber: { startsWith: `${prefix}-${stamp}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  void like;
  const seq = latest ? Number(latest.orderNumber.split("-").pop() ?? "0") + 1 : 1;
  return `${prefix}-${stamp}-${String(seq).padStart(4, "0")}`;
}

export function productTotalStock(
  batches: Array<{ availableQuantity: number; expiryDate: Date | null }>,
) {
  return batches
    .filter((b) => !isExpired(b.expiryDate))
    .reduce((sum, b) => sum + b.availableQuantity, 0);
}
