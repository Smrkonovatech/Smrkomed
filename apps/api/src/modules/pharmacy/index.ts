import { Hono } from "hono";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS, prisma, type TenantContext } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import {
  adjustStockSchema,
  createBatchSchema,
  createPrescriptionSchema,
  createProductSchema,
  createPurchaseOrderSchema,
  createSaleSchema,
  createSupplierSchema,
  dispensePrescriptionSchema,
  idParam,
  listQuery,
  receivePurchaseOrderSchema,
  reportQuery,
  updateProductSchema,
  updateSettingsSchema,
  updateSupplierSchema,
} from "./schemas";
import {
  serializeBatch,
  serializeMovement,
  serializePrescription,
  serializeProduct,
  serializePurchaseOrder,
  serializeSale,
  serializeSupplier,
} from "./serializer";
import {
  applyStockChange,
  assertSellableBatch,
  clinicWhere,
  dec,
  getPharmacySettings,
  isExpired,
  money,
  nextDocumentNumber,
  productTotalStock,
} from "./stock";
import { scheduleMedicationReminders, serializeReminder } from "./reminders";

type Ctx = Parameters<typeof requirePermission>[0];

function requirePharmacyView(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_VIEW);
}

function requirePharmacyManage(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_MANAGE);
}

function requirePharmacyInventory(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_INVENTORY);
}

function requirePharmacySales(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_SALES);
}

function requirePharmacyPrescriptions(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_PRESCRIPTIONS);
}

function requirePharmacyPurchaseRead(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_VIEW);
}

function requirePharmacyPurchaseWrite(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_PURCHASE);
}

function requirePharmacyReports(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_REPORTS);
}

function requirePharmacySettings(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PHARMACY_SETTINGS);
}

function paginated<T>(items: T[], page: number, pageSize: number, total: number) {
  return { items, page, pageSize, total };
}

function nullIfEmpty(value: string | null | undefined) {
  if (value === "") return null;
  return value ?? undefined;
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function productOrderBy(sort?: string): Prisma.PharmacyProductOrderByWithRelationInput {
  switch (sort) {
    case "name-desc":
      return { name: "desc" };
    case "createdAt":
      return { createdAt: "asc" };
    case "createdAt-desc":
      return { createdAt: "desc" };
    default:
      return { name: "asc" };
  }
}

function batchOrderBy(sort?: string): Prisma.PharmacyBatchOrderByWithRelationInput {
  switch (sort) {
    case "expiryDate-desc":
      return { expiryDate: "desc" };
    case "expiryDate":
      return { expiryDate: "asc" };
    case "createdAt-desc":
      return { createdAt: "desc" };
    default:
      return { expiryDate: "asc" };
  }
}

function saleOrderBy(sort?: string): Prisma.PharmacySaleOrderByWithRelationInput {
  switch (sort) {
    case "soldAt":
      return { soldAt: "asc" };
    case "totalAmount-desc":
      return { totalAmount: "desc" };
    default:
      return { soldAt: "desc" };
  }
}

function computeSaleLine(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
  gstPercent: number,
) {
  const gross = unitPrice * quantity;
  const afterDiscount = Math.max(gross - discountAmount, 0);
  const taxAmount = (afterDiscount * gstPercent) / 100;
  const lineTotal = afterDiscount + taxAmount;
  return {
    taxAmount: money(taxAmount),
    lineTotal: money(lineTotal),
    subtotal: gross,
    tax: taxAmount,
  };
}

function adjustDelta(
  type: "ADJUSTMENT" | "DAMAGED" | "EXPIRED" | "RETURNED" | "TRANSFER_IN" | "TRANSFER_OUT",
  quantity: number,
  direction?: "increase" | "decrease",
) {
  if (direction === "increase") return quantity;
  if (direction === "decrease") return -quantity;
  if (type === "RETURNED" || type === "TRANSFER_IN") return quantity;
  return -quantity;
}

async function loadProduct(tenant: TenantContext, id: string) {
  const product = await prisma.pharmacyProduct.findUnique({ where: { id } });
  return requireClinicOwned(tenant, product);
}

async function loadBatch(tenant: TenantContext, id: string) {
  const batch = await prisma.pharmacyBatch.findUnique({
    where: { id },
    include: { product: true, supplier: true },
  });
  return requireClinicOwned(tenant, batch);
}

async function loadSupplier(tenant: TenantContext, id: string) {
  const supplier = await prisma.pharmacySupplier.findUnique({ where: { id } });
  return requireClinicOwned(tenant, supplier);
}

async function loadPurchaseOrder(tenant: TenantContext, id: string) {
  const order = await prisma.pharmacyPurchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true, batch: true } },
    },
  });
  return requireClinicOwned(tenant, order);
}

async function loadSale(tenant: TenantContext, id: string) {
  const sale = await prisma.pharmacySale.findUnique({
    where: { id },
    include: {
      patient: true,
      createdBy: true,
      items: { include: { product: true, batch: true } },
    },
  });
  return requireClinicOwned(tenant, sale);
}

async function loadPrescription(tenant: TenantContext, id: string) {
  const rx = await prisma.pharmacyPrescription.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      appointment: true,
      treatment: true,
      items: {
        include: {
          product: true,
          batch: true,
          reminders: { orderBy: { scheduledAt: "asc" } },
        },
      },
    },
  });
  return requireClinicOwned(tenant, rx);
}

const prescriptionListInclude = {
  patient: true,
  doctor: true,
  appointment: true,
  treatment: true,
  items: {
    include: {
      product: true,
      batch: true,
      reminders: { orderBy: { scheduledAt: "asc" as const }, take: 5 },
    },
  },
} as const;

async function lowStockProducts(tenant: TenantContext, warningDays: number, limit = 10) {
  const products = await prisma.pharmacyProduct.findMany({
    where: { ...clinicWhere(tenant), status: "ACTIVE" },
    include: { batches: true },
  });
  return products
    .map((product) => ({ product, stock: productTotalStock(product.batches) }))
    .filter(({ product, stock }) => {
      const threshold = Math.max(product.minimumStock, product.reorderLevel);
      return threshold > 0 && stock <= threshold;
    })
    .slice(0, limit)
    .map(({ product, stock }) => ({
      productId: product.id,
      name: product.name,
      currentStock: stock,
      minimumStock: product.minimumStock,
      reorderLevel: product.reorderLevel,
    }));
}

async function expiringBatches(tenant: TenantContext, warningDays: number, limit = 10) {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + warningDays);
  const batches = await prisma.pharmacyBatch.findMany({
    where: {
      ...clinicWhere(tenant),
      availableQuantity: { gt: 0 },
      expiryDate: { not: null, lte: horizon },
    },
    include: { product: true },
    orderBy: { expiryDate: "asc" },
    take: limit * 3,
  });
  return batches
    .filter((batch) => !isExpired(batch.expiryDate, now))
    .slice(0, limit)
    .map((batch) => serializeBatch(batch, batch.product, warningDays));
}

async function expiredBatches(tenant: TenantContext, limit = 100) {
  const batches = await prisma.pharmacyBatch.findMany({
    where: {
      ...clinicWhere(tenant),
      availableQuantity: { gt: 0 },
      expiryDate: { not: null, lt: new Date() },
    },
    include: { product: true },
    orderBy: { expiryDate: "asc" },
    take: limit,
  });
  const settings = await getPharmacySettings(tenant.clinicId);
  return batches.map((batch) => serializeBatch(batch, batch.product, settings.expiryWarningDays));
}

export const pharmacyRoutes = new Hono<AppEnv>()
  // ─── Dashboard ───────────────────────────────────────────────────────────
  .get("/dashboard", async (c) => {
    const tenant = requirePharmacyView(c);
    const settings = await getPharmacySettings(tenant.clinicId);
    const { start, end } = dayBounds();

    const [products, stockItems, todaySalesAgg, pendingPrescriptionsCount, lowStock, expiringSoon, recentSales, pendingPrescriptions, upcomingReminders, outOfStock] =
      await Promise.all([
        prisma.pharmacyProduct.count({ where: { ...clinicWhere(tenant), status: { not: "ARCHIVED" } } }),
        prisma.pharmacyBatch.count({ where: { ...clinicWhere(tenant), availableQuantity: { gt: 0 } } }),
        prisma.pharmacySale.aggregate({
          where: { ...clinicWhere(tenant), soldAt: { gte: start, lte: end } },
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
        prisma.pharmacyPrescription.count({
          where: { ...clinicWhere(tenant), status: { in: ["PENDING", "PARTIALLY_DISPENSED"] } },
        }),
        lowStockProducts(tenant, settings.expiryWarningDays, 8),
        expiringBatches(tenant, settings.expiryWarningDays, 8),
        prisma.pharmacySale.findMany({
          where: clinicWhere(tenant),
          include: { patient: true, createdBy: true, items: { include: { product: true, batch: true } } },
          orderBy: { soldAt: "desc" },
          take: 8,
        }),
        prisma.pharmacyPrescription.findMany({
          where: { ...clinicWhere(tenant), status: { in: ["PENDING", "PARTIALLY_DISPENSED"] } },
          include: prescriptionListInclude,
          orderBy: { prescriptionDate: "desc" },
          take: 8,
        }),
        prisma.medicationReminder.findMany({
          where: {
            ...clinicWhere(tenant),
            status: { in: ["SCHEDULED", "PENDING"] },
            scheduledAt: { gte: new Date() },
          },
          include: {
            patient: true,
            prescriptionItem: { include: { product: true } },
          },
          orderBy: { scheduledAt: "asc" },
          take: 8,
        }),
        prisma.pharmacyProduct.count({
          where: {
            ...clinicWhere(tenant),
            status: "ACTIVE",
            batches: { every: { availableQuantity: { lte: 0 } } },
          },
        }),
      ]);

    const allProducts = await prisma.pharmacyProduct.findMany({
      where: { ...clinicWhere(tenant), status: "ACTIVE" },
      include: { batches: true },
    });
    const lowStockCount = allProducts.filter((product) => {
      const stock = productTotalStock(product.batches);
      const threshold = Math.max(product.minimumStock, product.reorderLevel);
      return threshold > 0 && stock <= threshold;
    }).length;

    const expiringSoonCount = await prisma.pharmacyBatch.count({
      where: {
        ...clinicWhere(tenant),
        availableQuantity: { gt: 0 },
        expiryDate: {
          not: null,
          gt: new Date(),
          lte: new Date(Date.now() + settings.expiryWarningDays * 86_400_000),
        },
      },
    });

    return ok(c, {
      totals: {
        products,
        stockItems,
        lowStock: lowStockCount,
        outOfStock,
        expiringSoon: expiringSoonCount,
        todaySales: todaySalesAgg._count.id,
        todaySalesAmount: dec(todaySalesAgg._sum.totalAmount),
        pendingPrescriptions: pendingPrescriptionsCount,
        upcomingReminders: upcomingReminders.length,
      },
      lowStock,
      expiringSoon,
      recentSales: recentSales.map(serializeSale),
      pendingPrescriptions: pendingPrescriptions.map(serializePrescription),
      upcomingReminders: upcomingReminders.map(serializeReminder),
    });
  })

  // ─── Settings ──────────────────────────────────────────────────────────────
  .get("/settings", async (c) => {
    const tenant = requirePharmacyView(c);
    const settings = await getPharmacySettings(tenant.clinicId);
    return ok(c, {
      expiryWarningDays: settings.expiryWarningDays,
      lowStockEnabled: settings.lowStockEnabled,
    });
  })
  .patch("/settings", validate("json", updateSettingsSchema), async (c) => {
    const tenant = requirePharmacySettings(c);
    const body = c.req.valid("json");
    await getPharmacySettings(tenant.clinicId);
    const settings = await prisma.pharmacySetting.update({
      where: { clinicId: tenant.clinicId },
      data: {
        ...(body.expiryWarningDays === undefined ? {} : { expiryWarningDays: body.expiryWarningDays }),
        ...(body.lowStockEnabled === undefined ? {} : { lowStockEnabled: body.lowStockEnabled }),
      },
    });
    await audit(tenant, "pharmacy.settings.update", "PharmacySetting", settings.id);
    return ok(c, {
      expiryWarningDays: settings.expiryWarningDays,
      lowStockEnabled: settings.lowStockEnabled,
    });
  })

  // ─── Products ───────────────────────────────────────────────────────────────
  .get("/products", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const settings = await getPharmacySettings(tenant.clinicId);
    const where: Prisma.PharmacyProductWhereInput = {
      ...clinicWhere(tenant),
      ...(query.status ? { status: query.status as "ACTIVE" | "INACTIVE" | "ARCHIVED" } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.manufacturer ? { manufacturer: query.manufacturer } : {}),
      ...(query.prescriptionRequired === "true" ? { prescriptionRequired: true } : {}),
      ...(query.prescriptionRequired === "false" ? { prescriptionRequired: false } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { genericName: { contains: query.q, mode: "insensitive" } },
              { brandName: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacyProduct.count({ where }),
      prisma.pharmacyProduct.findMany({
        where,
        include: { batches: true, _count: { select: { batches: true } } },
        orderBy: productOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(
      c,
      paginated(
        rows.map((row) => serializeProduct(row, settings.expiryWarningDays)),
        query.page,
        query.pageSize,
        total,
      ),
    );
  })
  .get("/products/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyView(c);
    const { id } = c.req.valid("param");
    const settings = await getPharmacySettings(tenant.clinicId);
    const product = await prisma.pharmacyProduct.findUnique({
      where: { id },
      include: {
        batches: { include: { supplier: true } },
        _count: { select: { batches: true } },
      },
    });
    await requireClinicOwned(tenant, product);
    const movements = await prisma.pharmacyStockMovement.findMany({
      where: { clinicId: tenant.clinicId, productId: id },
      include: {
        product: { select: { id: true, name: true } },
        batch: { select: { id: true, batchNumber: true } },
        actor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    return ok(c, {
      ...serializeProduct(product!, settings.expiryWarningDays),
      recentMovements: movements.map(serializeMovement),
    });
  })
  .post("/products", validate("json", createProductSchema), async (c) => {
    const tenant = requirePharmacyManage(c);
    const body = c.req.valid("json");
    const product = await prisma.pharmacyProduct.create({
      data: {
        clinicId: tenant.clinicId,
        name: body.name,
        genericName: body.genericName ?? null,
        brandName: body.brandName ?? null,
        category: body.category ?? null,
        subCategory: body.subCategory ?? null,
        description: body.description ?? null,
        manufacturer: body.manufacturer ?? null,
        unit: body.unit ?? "unit",
        packSize: body.packSize ?? null,
        medicineType: body.medicineType ?? null,
        imageUrl: body.imageUrl ?? null,
        prescriptionRequired: body.prescriptionRequired ?? false,
        minimumStock: body.minimumStock ?? 0,
        reorderLevel: body.reorderLevel ?? 0,
        defaultPurchasePrice: money(body.defaultPurchasePrice ?? 0),
        defaultSellingPrice: money(body.defaultSellingPrice ?? 0),
        defaultMrp: money(body.defaultMrp ?? 0),
        gstPercent: money(body.gstPercent ?? 0),
        status: body.status ?? "ACTIVE",
      },
      include: { batches: true, _count: { select: { batches: true } } },
    });
    await audit(tenant, "pharmacy.product.create", "PharmacyProduct", product.id);
    const settings = await getPharmacySettings(tenant.clinicId);
    return ok(c, serializeProduct(product, settings.expiryWarningDays), 201);
  })
  .patch("/products/:id", validate("param", idParam), validate("json", updateProductSchema), async (c) => {
    const tenant = requirePharmacyManage(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await loadProduct(tenant, id);
    const product = await prisma.pharmacyProduct.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.genericName === undefined ? {} : { genericName: body.genericName }),
        ...(body.brandName === undefined ? {} : { brandName: body.brandName }),
        ...(body.category === undefined ? {} : { category: body.category }),
        ...(body.subCategory === undefined ? {} : { subCategory: body.subCategory }),
        ...(body.description === undefined ? {} : { description: body.description }),
        ...(body.manufacturer === undefined ? {} : { manufacturer: body.manufacturer }),
        ...(body.unit === undefined ? {} : { unit: body.unit }),
        ...(body.packSize === undefined ? {} : { packSize: body.packSize }),
        ...(body.medicineType === undefined ? {} : { medicineType: body.medicineType }),
        ...(body.imageUrl === undefined ? {} : { imageUrl: body.imageUrl }),
        ...(body.prescriptionRequired === undefined ? {} : { prescriptionRequired: body.prescriptionRequired }),
        ...(body.minimumStock === undefined ? {} : { minimumStock: body.minimumStock }),
        ...(body.reorderLevel === undefined ? {} : { reorderLevel: body.reorderLevel }),
        ...(body.defaultPurchasePrice === undefined ? {} : { defaultPurchasePrice: money(body.defaultPurchasePrice) }),
        ...(body.defaultSellingPrice === undefined ? {} : { defaultSellingPrice: money(body.defaultSellingPrice) }),
        ...(body.defaultMrp === undefined ? {} : { defaultMrp: money(body.defaultMrp) }),
        ...(body.gstPercent === undefined ? {} : { gstPercent: money(body.gstPercent) }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
      include: { batches: true, _count: { select: { batches: true } } },
    });
    await audit(tenant, "pharmacy.product.update", "PharmacyProduct", product.id);
    const settings = await getPharmacySettings(tenant.clinicId);
    return ok(c, serializeProduct(product, settings.expiryWarningDays));
  })

  // ─── Inventory ──────────────────────────────────────────────────────────────
  .get("/inventory/movements", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const where: Prisma.PharmacyStockMovementWhereInput = {
      ...clinicWhere(tenant),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacyStockMovement.count({ where }),
      prisma.pharmacyStockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          batch: { select: { id: true, batchNumber: true } },
          actor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeMovement), query.page, query.pageSize, total));
  })
  .post("/inventory/adjust", validate("json", adjustStockSchema), async (c) => {
    const tenant = requirePharmacyInventory(c);
    const body = c.req.valid("json");
    await loadProduct(tenant, body.productId);
    const batch = await loadBatch(tenant, body.batchId);
    if (batch.productId !== body.productId) {
      throw new HttpError(422, "BATCH_PRODUCT_MISMATCH", "Batch does not belong to the specified product.");
    }
    const delta = adjustDelta(body.type, body.quantity, body.direction);
    const { batch: updated, movement } = await applyStockChange({
      tenant,
      productId: body.productId,
      batchId: body.batchId,
      delta,
      type: body.type,
      reason: body.reason,
    });
    await audit(tenant, "pharmacy.inventory.adjust", "PharmacyBatch", updated.id, { type: body.type });
    const settings = await getPharmacySettings(tenant.clinicId);
    return ok(c, {
      batch: serializeBatch(updated, batch.product, settings.expiryWarningDays),
      movement: serializeMovement(movement),
    });
  })
  .get("/inventory", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const settings = await getPharmacySettings(tenant.clinicId);
    const where: Prisma.PharmacyBatchWhereInput = {
      ...clinicWhere(tenant),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.q
        ? {
            OR: [
              { batchNumber: { contains: query.q, mode: "insensitive" } },
              { product: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const rows = await prisma.pharmacyBatch.findMany({
      where,
      include: { product: true, supplier: true },
      orderBy: batchOrderBy(query.sort),
    });
    let serialized = rows.map((row) => serializeBatch(row, row.product, settings.expiryWarningDays));
    if (query.status) {
      serialized = serialized.filter((row) => row.status === query.status);
    }
    const total = serialized.length;
    const page = query.page;
    const pageSize = query.pageSize;
    const items = serialized.slice((page - 1) * pageSize, page * pageSize);
    return ok(c, paginated(items, page, pageSize, total));
  })
  .post("/inventory", validate("json", createBatchSchema), async (c) => {
    const tenant = requirePharmacyInventory(c);
    const body = c.req.valid("json");
    const product = await loadProduct(tenant, body.productId);
    if (body.supplierId) await loadSupplier(tenant, body.supplierId);

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.pharmacyBatch.create({
        data: {
          clinicId: tenant.clinicId,
          productId: body.productId,
          supplierId: body.supplierId ?? null,
          batchNumber: body.batchNumber,
          quantity: 0,
          availableQuantity: 0,
          purchasePrice: money(body.purchasePrice ?? dec(product.defaultPurchasePrice)),
          sellingPrice: money(body.sellingPrice ?? dec(product.defaultSellingPrice)),
          mrp: money(body.mrp ?? dec(product.defaultMrp)),
          gstPercent: money(body.gstPercent ?? dec(product.gstPercent)),
          manufacturingDate: parseOptionalDate(body.manufacturingDate),
          expiryDate: parseOptionalDate(body.expiryDate),
          purchaseDate: parseOptionalDate(body.purchaseDate) ?? new Date(),
          storageLocation: body.storageLocation ?? null,
          notes: body.notes ?? null,
        },
      });
      const { batch: updated, movement } = await applyStockChange({
        tenant,
        productId: body.productId,
        batchId: batch.id,
        delta: body.quantity,
        type: "PURCHASE",
        reason: "Manual inventory intake",
        tx,
      });
      return { batch: updated, movement };
    });

    await audit(tenant, "pharmacy.inventory.create", "PharmacyBatch", result.batch.id);
    const settings = await getPharmacySettings(tenant.clinicId);
    const fullBatch = await prisma.pharmacyBatch.findUnique({
      where: { id: result.batch.id },
      include: { product: true, supplier: true },
    });
    return ok(
      c,
      {
        batch: serializeBatch(fullBatch!, fullBatch!.product, settings.expiryWarningDays),
        movement: serializeMovement(result.movement),
      },
      201,
    );
  })

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  .get("/suppliers", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyPurchaseRead(c);
    const query = c.req.valid("query");
    const where: Prisma.PharmacySupplierWhereInput = {
      ...clinicWhere(tenant),
      ...(query.status ? { status: query.status as "ACTIVE" | "INACTIVE" } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacySupplier.count({ where }),
      prisma.pharmacySupplier.findMany({
        where,
        include: { _count: { select: { purchaseOrders: true, batches: true } } },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeSupplier), query.page, query.pageSize, total));
  })
  .get("/suppliers/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPurchaseRead(c);
    const { id } = c.req.valid("param");
    const supplier = await prisma.pharmacySupplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true, batches: true } } },
    });
    return ok(c, serializeSupplier(await requireClinicOwned(tenant, supplier)));
  })
  .post("/suppliers", validate("json", createSupplierSchema), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const body = c.req.valid("json");
    const supplier = await prisma.pharmacySupplier.create({
      data: {
        clinicId: tenant.clinicId,
        name: body.name,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: nullIfEmpty(body.email) ?? null,
        address: body.address ?? null,
        gstNumber: body.gstNumber ?? null,
        licenseInfo: body.licenseInfo ?? null,
        notes: body.notes ?? null,
        status: body.status ?? "ACTIVE",
      },
      include: { _count: { select: { purchaseOrders: true, batches: true } } },
    });
    await audit(tenant, "pharmacy.supplier.create", "PharmacySupplier", supplier.id);
    return ok(c, serializeSupplier(supplier), 201);
  })
  .patch("/suppliers/:id", validate("param", idParam), validate("json", updateSupplierSchema), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await loadSupplier(tenant, id);
    const supplier = await prisma.pharmacySupplier.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.contactPerson === undefined ? {} : { contactPerson: body.contactPerson }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.email === undefined ? {} : { email: nullIfEmpty(body.email) ?? null }),
        ...(body.address === undefined ? {} : { address: body.address }),
        ...(body.gstNumber === undefined ? {} : { gstNumber: body.gstNumber }),
        ...(body.licenseInfo === undefined ? {} : { licenseInfo: body.licenseInfo }),
        ...(body.notes === undefined ? {} : { notes: body.notes }),
        ...(body.status === undefined ? {} : { status: body.status }),
      },
      include: { _count: { select: { purchaseOrders: true, batches: true } } },
    });
    await audit(tenant, "pharmacy.supplier.update", "PharmacySupplier", supplier.id);
    return ok(c, serializeSupplier(supplier));
  })

  // ─── Purchase orders ───────────────────────────────────────────────────────
  .get("/purchase-orders", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyPurchaseRead(c);
    const query = c.req.valid("query");
    const where: Prisma.PharmacyPurchaseOrderWhereInput = {
      ...clinicWhere(tenant),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.status
        ? { status: query.status as "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" }
        : {}),
      ...(query.from || query.to
        ? {
            orderDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacyPurchaseOrder.count({ where }),
      prisma.pharmacyPurchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: { include: { product: true, batch: true } },
        },
        orderBy: { orderDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializePurchaseOrder), query.page, query.pageSize, total));
  })
  .get("/purchase-orders/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPurchaseRead(c);
    const { id } = c.req.valid("param");
    return ok(c, serializePurchaseOrder(await loadPurchaseOrder(tenant, id)));
  })
  .post("/purchase-orders", validate("json", createPurchaseOrderSchema), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const body = c.req.valid("json");
    await loadSupplier(tenant, body.supplierId);
    for (const item of body.items) await loadProduct(tenant, item.productId);

    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextDocumentNumber(tenant, "PHARM", "orderNumber", tx);
      const subtotal = body.items.reduce((sum, item) => sum + item.quantityOrdered * item.purchasePrice, 0);
      const taxAmount = body.taxAmount ?? 0;
      const totalAmount = subtotal + taxAmount;
      return tx.pharmacyPurchaseOrder.create({
        data: {
          clinicId: tenant.clinicId,
          supplierId: body.supplierId,
          orderNumber,
          orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
          expectedDelivery: parseOptionalDate(body.expectedDelivery),
          status: body.status ?? "DRAFT",
          taxAmount: money(taxAmount),
          totalAmount: money(totalAmount),
          notes: body.notes ?? null,
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              quantityOrdered: item.quantityOrdered,
              purchasePrice: money(item.purchasePrice),
              mrp: money(item.mrp ?? 0),
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true, batch: true } },
        },
      });
    });

    await audit(tenant, "pharmacy.purchase_order.create", "PharmacyPurchaseOrder", order.id);
    return ok(c, serializePurchaseOrder(order), 201);
  })
  .post("/purchase-orders/:id/order", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const { id } = c.req.valid("param");
    const existing = await loadPurchaseOrder(tenant, id);
    if (existing.status !== "DRAFT") {
      throw new HttpError(422, "INVALID_STATUS", "Only draft purchase orders can be marked as ordered.");
    }
    const order = await prisma.pharmacyPurchaseOrder.update({
      where: { id },
      data: { status: "ORDERED" },
      include: { supplier: true, items: { include: { product: true, batch: true } } },
    });
    await audit(tenant, "pharmacy.purchase_order.order", "PharmacyPurchaseOrder", order.id);
    return ok(c, serializePurchaseOrder(order));
  })
  .post("/purchase-orders/:id/receive", validate("param", idParam), validate("json", receivePurchaseOrderSchema), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await loadPurchaseOrder(tenant, id);
    if (existing.status === "CANCELLED" || existing.status === "RECEIVED") {
      throw new HttpError(422, "INVALID_STATUS", "This purchase order cannot receive stock.");
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const receiveItem of body.items) {
        const poItem = existing.items.find((item) => item.id === receiveItem.itemId);
        if (!poItem) {
          throw new HttpError(404, "PO_ITEM_NOT_FOUND", "Purchase order line item was not found.");
        }
        const remaining = poItem.quantityOrdered - poItem.quantityReceived;
        if (receiveItem.quantityReceived > remaining) {
          throw new HttpError(422, "OVER_RECEIVE", "Received quantity exceeds the remaining ordered quantity.", {
            remaining,
          });
        }

        let batch = await tx.pharmacyBatch.findFirst({
          where: {
            clinicId: tenant.clinicId,
            productId: poItem.productId,
            batchNumber: receiveItem.batchNumber,
          },
        });

        if (!batch) {
          const product = await tx.pharmacyProduct.findUniqueOrThrow({ where: { id: poItem.productId } });
          batch = await tx.pharmacyBatch.create({
            data: {
              clinicId: tenant.clinicId,
              productId: poItem.productId,
              supplierId: existing.supplierId,
              batchNumber: receiveItem.batchNumber,
              quantity: 0,
              availableQuantity: 0,
              purchasePrice: money(receiveItem.purchasePrice ?? dec(poItem.purchasePrice)),
              mrp: money(receiveItem.mrp ?? dec(poItem.mrp)),
              gstPercent: money(dec(product.gstPercent)),
              manufacturingDate: parseOptionalDate(receiveItem.manufacturingDate),
              expiryDate: new Date(receiveItem.expiryDate),
              purchaseDate: new Date(),
              storageLocation: receiveItem.storageLocation ?? null,
            },
          });
        }

        await applyStockChange({
          tenant,
          productId: poItem.productId,
          batchId: batch.id,
          delta: receiveItem.quantityReceived,
          type: "PURCHASE",
          reason: `PO receive ${existing.orderNumber}`,
          referenceType: "PharmacyPurchaseOrder",
          referenceId: existing.id,
          tx,
        });

        await tx.pharmacyPurchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantityReceived: poItem.quantityReceived + receiveItem.quantityReceived,
            batchId: batch.id,
            batchNumber: receiveItem.batchNumber,
            expiryDate: new Date(receiveItem.expiryDate),
            ...(receiveItem.purchasePrice === undefined ? {} : { purchasePrice: money(receiveItem.purchasePrice) }),
            ...(receiveItem.mrp === undefined ? {} : { mrp: money(receiveItem.mrp) }),
          },
        });
      }

      const refreshedItems = await tx.pharmacyPurchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const fullyReceived = refreshedItems.every((item) => item.quantityReceived >= item.quantityOrdered);
      const anyReceived = refreshedItems.some((item) => item.quantityReceived > 0);
      const nextStatus = fullyReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : existing.status;

      return tx.pharmacyPurchaseOrder.update({
        where: { id },
        data: { status: nextStatus },
        include: { supplier: true, items: { include: { product: true, batch: true } } },
      });
    });

    await audit(tenant, "pharmacy.purchase_order.receive", "PharmacyPurchaseOrder", order.id);
    return ok(c, serializePurchaseOrder(order));
  })
  .post("/purchase-orders/:id/cancel", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPurchaseWrite(c);
    const { id } = c.req.valid("param");
    const existing = await loadPurchaseOrder(tenant, id);
    if (existing.status === "RECEIVED") {
      throw new HttpError(422, "INVALID_STATUS", "Received purchase orders cannot be cancelled.");
    }
    const order = await prisma.pharmacyPurchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { supplier: true, items: { include: { product: true, batch: true } } },
    });
    await audit(tenant, "pharmacy.purchase_order.cancel", "PharmacyPurchaseOrder", order.id);
    return ok(c, serializePurchaseOrder(order));
  })

  // ─── Sales ──────────────────────────────────────────────────────────────────
  .get("/sales", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const where: Prisma.PharmacySaleWhereInput = {
      ...clinicWhere(tenant),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.from || query.to
        ? {
            soldAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacySale.count({ where }),
      prisma.pharmacySale.findMany({
        where,
        include: {
          patient: true,
          createdBy: true,
          items: { include: { product: true, batch: true } },
        },
        orderBy: saleOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeSale), query.page, query.pageSize, total));
  })
  .get("/sales/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyView(c);
    const { id } = c.req.valid("param");
    return ok(c, serializeSale(await loadSale(tenant, id)));
  })
  .post("/sales", validate("json", createSaleSchema), async (c) => {
    const tenant = requirePharmacySales(c);
    const body = c.req.valid("json");
    if (body.patientId) {
      await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: body.patientId } }));
    }
    if (body.coupleId) {
      await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    }

    const sale = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextDocumentNumber(tenant, "PHARM", "invoiceNumber", tx);
      const computedLines = [];
      for (const item of body.items) {
        const batch = await assertSellableBatch(tenant, item.batchId, item.quantity, tx);
        if (batch.productId !== item.productId) {
          throw new HttpError(422, "BATCH_PRODUCT_MISMATCH", "Batch does not belong to the specified product.");
        }
        const unitPrice = item.unitPrice ?? dec(batch.sellingPrice);
        const discountAmount = item.discountAmount ?? 0;
        const gstPercent = dec(batch.gstPercent);
        const line = computeSaleLine(item.quantity, unitPrice, discountAmount, gstPercent);
        computedLines.push({ item, batch, unitPrice, discountAmount, ...line });
      }

      const subtotal = computedLines.reduce((sum, line) => sum + line.subtotal, 0);
      const itemDiscount = computedLines.reduce((sum, line) => sum + line.discountAmount, 0);
      const saleDiscount = body.discountAmount ?? 0;
      const taxAmount = computedLines.reduce((sum, line) => sum + line.tax, 0);
      const totalAmount = subtotal - itemDiscount - saleDiscount + taxAmount;

      const created = await tx.pharmacySale.create({
        data: {
          clinicId: tenant.clinicId,
          invoiceNumber,
          patientId: body.patientId ?? null,
          coupleId: body.coupleId ?? null,
          doctorName: body.doctorName ?? null,
          subtotal: money(subtotal),
          discountAmount: money(itemDiscount + saleDiscount),
          taxAmount: money(taxAmount),
          totalAmount: money(Math.max(totalAmount, 0)),
          paymentMethod: body.paymentMethod ?? "CASH",
          paymentStatus: body.paymentStatus ?? "PAID",
          notes: body.notes ?? null,
          createdById: tenant.userId,
          items: {
            create: computedLines.map((line) => ({
              productId: line.item.productId,
              batchId: line.item.batchId,
              quantity: line.item.quantity,
              unitPrice: money(line.unitPrice),
              taxAmount: line.taxAmount,
              discountAmount: money(line.discountAmount),
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: {
          patient: true,
          createdBy: true,
          items: { include: { product: true, batch: true } },
        },
      });

      for (const line of computedLines) {
        await applyStockChange({
          tenant,
          productId: line.item.productId,
          batchId: line.item.batchId,
          delta: -line.item.quantity,
          type: "SALE",
          reason: `Sale ${invoiceNumber}`,
          referenceType: "PharmacySale",
          referenceId: created.id,
          tx,
        });
      }

      return created;
    });

    await audit(tenant, "pharmacy.sale.create", "PharmacySale", sale.id);
    return ok(c, serializeSale(sale), 201);
  })

  // ─── Prescriptions ──────────────────────────────────────────────────────────
  .get("/prescriptions", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const where: Prisma.PharmacyPrescriptionWhereInput = {
      ...clinicWhere(tenant),
      ...(query.status
        ? { status: query.status as "PENDING" | "PARTIALLY_DISPENSED" | "DISPENSED" | "CANCELLED" }
        : {}),
      ...(query.from || query.to
        ? {
            prescriptionDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.pharmacyPrescription.count({ where }),
      prisma.pharmacyPrescription.findMany({
        where,
        include: prescriptionListInclude,
        orderBy: { prescriptionDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializePrescription), query.page, query.pageSize, total));
  })
  .get("/prescriptions/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyView(c);
    const { id } = c.req.valid("param");
    return ok(c, serializePrescription(await loadPrescription(tenant, id)));
  })
  .post("/prescriptions", validate("json", createPrescriptionSchema), async (c) => {
    const tenant = requirePharmacyPrescriptions(c);
    const body = c.req.valid("json");
    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: body.patientId } }));
    if (body.coupleId) {
      await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    }
    if (body.appointmentId) {
      await requireClinicOwned(tenant, await prisma.appointment.findUnique({ where: { id: body.appointmentId } }));
    }
    if (body.treatmentId) {
      await requireClinicOwned(tenant, await prisma.treatment.findUnique({ where: { id: body.treatmentId } }));
    }

    const productRows = await Promise.all(body.items.map((item) => loadProduct(tenant, item.productId)));
    const appointment = body.appointmentId
      ? await prisma.appointment.findUnique({ where: { id: body.appointmentId } })
      : null;

    const rx = await prisma.pharmacyPrescription.create({
      data: {
        clinicId: tenant.clinicId,
        patientId: body.patientId,
        coupleId: body.coupleId ?? null,
        doctorId: body.doctorId ?? (tenant.role === "DOCTOR" ? tenant.userId : null),
        doctorName: body.doctorName ?? null,
        appointmentId: body.appointmentId ?? null,
        treatmentId: body.treatmentId ?? null,
        prescriptionDate: body.prescriptionDate ? new Date(body.prescriptionDate) : new Date(),
        notes: body.notes ?? null,
        items: {
          create: body.items.map((item, index) => ({
            productId: item.productId,
            medicineName: item.medicineName ?? productRows[index]!.name,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            duration: item.duration ?? null,
            instructions: item.instructions ?? null,
            timeOfDay: item.timeOfDay ?? null,
            beforeAfterFood: item.beforeAfterFood ?? null,
            startDate: parseOptionalDate(item.startDate),
            endDate: parseOptionalDate(item.endDate),
            quantityPrescribed: item.quantityPrescribed,
          })),
        },
      },
      include: prescriptionListInclude,
    });

    if (body.scheduleReminders !== false) {
      const appointmentLabel = appointment
        ? `Your ${appointment.type} is scheduled for ${appointment.startsAt.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}.`
        : null;
      for (const item of rx.items) {
        await scheduleMedicationReminders({
          tenant,
          prescriptionItemId: item.id,
          patientId: body.patientId,
          medicineName: item.medicineName,
          dosage: item.dosage ?? "As prescribed",
          timeOfDay: item.timeOfDay ?? "As scheduled",
          instructions: item.instructions ?? "Follow your care team instructions.",
          startDate: item.startDate,
          endDate: item.endDate,
          appointmentLabel,
        });
      }
    }

    await audit(tenant, "pharmacy.prescription.create", "PharmacyPrescription", rx.id);
    return ok(c, serializePrescription(await loadPrescription(tenant, rx.id)), 201);
  })
  .post("/prescriptions/:id/dispense", validate("param", idParam), validate("json", dispensePrescriptionSchema), async (c) => {
    const tenant = requirePharmacyPrescriptions(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await loadPrescription(tenant, id);
    if (existing.status === "CANCELLED" || existing.status === "DISPENSED") {
      throw new HttpError(422, "INVALID_STATUS", "This prescription cannot be dispensed.");
    }

    const rx = await prisma.$transaction(async (tx) => {
      for (const dispenseItem of body.items) {
        const rxItem = existing.items.find((item) => item.id === dispenseItem.itemId);
        if (!rxItem) {
          throw new HttpError(404, "RX_ITEM_NOT_FOUND", "Prescription line item was not found.");
        }
        const remaining = rxItem.quantityPrescribed - rxItem.quantityDispensed;
        if (dispenseItem.quantity > remaining) {
          throw new HttpError(422, "OVER_DISPENSE", "Dispense quantity exceeds the remaining prescribed amount.", {
            remaining,
          });
        }
        const batch = await assertSellableBatch(tenant, dispenseItem.batchId, dispenseItem.quantity, tx);
        if (batch.productId !== rxItem.productId) {
          throw new HttpError(422, "BATCH_PRODUCT_MISMATCH", "Batch does not belong to the prescribed product.");
        }

        await applyStockChange({
          tenant,
          productId: rxItem.productId,
          batchId: dispenseItem.batchId,
          delta: -dispenseItem.quantity,
          type: "DISPENSE",
          reason: `Prescription dispense ${existing.id}`,
          referenceType: "PharmacyPrescription",
          referenceId: existing.id,
          tx,
        });

        await tx.pharmacyPrescriptionItem.update({
          where: { id: rxItem.id },
          data: {
            quantityDispensed: rxItem.quantityDispensed + dispenseItem.quantity,
            batchId: dispenseItem.batchId,
          },
        });
      }

      const refreshedItems = await tx.pharmacyPrescriptionItem.findMany({ where: { prescriptionId: id } });
      const fullyDispensed = refreshedItems.every((item) => item.quantityDispensed >= item.quantityPrescribed);
      const anyDispensed = refreshedItems.some((item) => item.quantityDispensed > 0);
      const nextStatus = fullyDispensed ? "DISPENSED" : anyDispensed ? "PARTIALLY_DISPENSED" : existing.status;

      return tx.pharmacyPrescription.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(fullyDispensed ? { dispensedById: tenant.userId, dispensedAt: new Date() } : {}),
        },
        include: prescriptionListInclude,
      });
    });

    await audit(tenant, "pharmacy.prescription.dispense", "PharmacyPrescription", rx.id);
    return ok(c, serializePrescription(rx));
  })
  .post("/prescriptions/:id/cancel", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPrescriptions(c);
    const { id } = c.req.valid("param");
    const existing = await loadPrescription(tenant, id);
    if (existing.status === "DISPENSED") {
      throw new HttpError(422, "INVALID_STATUS", "Fully dispensed prescriptions cannot be cancelled.");
    }
    const rx = await prisma.pharmacyPrescription.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        patient: true,
        doctor: true,
        items: { include: { product: true, batch: true } },
      },
    });
    await audit(tenant, "pharmacy.prescription.cancel", "PharmacyPrescription", rx.id);
    return ok(c, serializePrescription(rx));
  })

  // ─── Patient / couple history ───────────────────────────────────────────────
  .get("/patients/:patientId/history", async (c) => {
    const tenant = requirePharmacyView(c);
    const patientId = c.req.param("patientId");
    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: patientId } }));

    const [prescriptions, sales] = await Promise.all([
      prisma.pharmacyPrescription.findMany({
        where: { ...clinicWhere(tenant), patientId },
        include: prescriptionListInclude,
        orderBy: { prescriptionDate: "desc" },
        take: 50,
      }),
      prisma.pharmacySale.findMany({
        where: { ...clinicWhere(tenant), patientId },
        include: {
          patient: true,
          createdBy: true,
          items: { include: { product: true, batch: true } },
        },
        orderBy: { soldAt: "desc" },
        take: 50,
      }),
    ]);

    return ok(c, {
      prescriptions: prescriptions.map(serializePrescription),
      sales: sales.map(serializeSale),
    });
  })
  .get("/couples/:coupleId/history", async (c) => {
    const tenant = requirePharmacyView(c);
    const coupleId = c.req.param("coupleId");
    await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: coupleId } }));

    const [prescriptions, sales] = await Promise.all([
      prisma.pharmacyPrescription.findMany({
        where: { ...clinicWhere(tenant), coupleId },
        include: prescriptionListInclude,
        orderBy: { prescriptionDate: "desc" },
        take: 50,
      }),
      prisma.pharmacySale.findMany({
        where: { ...clinicWhere(tenant), coupleId },
        include: {
          patient: true,
          createdBy: true,
          items: { include: { product: true, batch: true } },
        },
        orderBy: { soldAt: "desc" },
        take: 50,
      }),
    ]);

    return ok(c, {
      prescriptions: prescriptions.map(serializePrescription),
      sales: sales.map(serializeSale),
    });
  })

  // ─── Medication reminders (demo WhatsApp) ───────────────────────────────────
  .get("/reminders", validate("query", listQuery), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const where = {
      ...clinicWhere(tenant),
      ...(query.status ? { status: query.status as "SCHEDULED" | "SENT" | "SKIPPED_NO_CONSENT" | "CANCELLED" | "FAILED" | "PENDING" | "DELIVERED" } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.medicationReminder.count({ where }),
      prisma.medicationReminder.findMany({
        where,
        include: {
          patient: true,
          prescriptionItem: { include: { product: true } },
        },
        orderBy: { scheduledAt: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeReminder), query.page, query.pageSize, total));
  })
  .get("/reminders/:id", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyView(c);
    const { id } = c.req.valid("param");
    const reminder = await prisma.medicationReminder.findUnique({
      where: { id },
      include: {
        patient: true,
        prescriptionItem: { include: { product: true } },
      },
    });
    await requireClinicOwned(tenant, reminder);
    return ok(c, serializeReminder(reminder!));
  })
  .post("/reminders/:id/simulate", validate("param", idParam), async (c) => {
    const tenant = requirePharmacyPrescriptions(c);
    const { id } = c.req.valid("param");
    const reminder = await prisma.medicationReminder.findUnique({
      where: { id },
      include: {
        patient: true,
        prescriptionItem: { include: { product: true } },
      },
    });
    await requireClinicOwned(tenant, reminder);
    if (!reminder) throw new HttpError(404, "REMINDER_NOT_FOUND", "Reminder was not found.");
    if (reminder.status === "SKIPPED_NO_CONSENT") {
      throw new HttpError(422, "NO_CONSENT", "WhatsApp reminders are disabled for this patient.");
    }
    if (reminder.status === "CANCELLED") {
      throw new HttpError(422, "CANCELLED", "This reminder was cancelled.");
    }

    // Demo-only: never call Meta Graph. Mark as SENT with simulated delivery.
    const updated = await prisma.medicationReminder.update({
      where: { id },
      data: {
        status: "SENT",
        demoMode: true,
        sentAt: new Date(),
        failureReason: null,
      },
      include: {
        patient: true,
        prescriptionItem: { include: { product: true } },
      },
    });
    await audit(tenant, "pharmacy.reminder.simulate", "MedicationReminder", updated.id);
    return ok(c, {
      ...serializeReminder(updated),
      note: "Demo — Message simulated. No real WhatsApp message was sent.",
    });
  })

  // ─── Alerts ─────────────────────────────────────────────────────────────────
  .get("/alerts", validate("query", listQuery.pick({ warningDays: true })), async (c) => {
    const tenant = requirePharmacyView(c);
    const query = c.req.valid("query");
    const settings = await getPharmacySettings(tenant.clinicId);
    const warningDays = query.warningDays ?? settings.expiryWarningDays;

    const [lowStock, expiringSoon, expired] = await Promise.all([
      lowStockProducts(tenant, warningDays, 100),
      expiringBatches(tenant, warningDays, 100),
      expiredBatches(tenant, 100),
    ]);

    return ok(c, { lowStock, expiringSoon, expired });
  })

  // ─── Reports ────────────────────────────────────────────────────────────────
  .get("/reports", validate("query", reportQuery), async (c) => {
    const tenant = requirePharmacyReports(c);
    const query = c.req.valid("query");
    const settings = await getPharmacySettings(tenant.clinicId);
    const warningDays = query.warningDays ?? settings.expiryWarningDays;
    const dateFilter =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;

    switch (query.type) {
      case "sales": {
        const where: Prisma.PharmacySaleWhereInput = {
          ...clinicWhere(tenant),
          ...(dateFilter ? { soldAt: dateFilter } : {}),
          ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
        };
        const rows = await prisma.pharmacySale.findMany({
          where,
          include: {
            patient: true,
            createdBy: true,
            items: { include: { product: true, batch: true } },
          },
          orderBy: { soldAt: "desc" },
        });
        const totalAmount = rows.reduce((sum, row) => sum + dec(row.totalAmount), 0);
        return ok(c, {
          type: query.type,
          summary: { count: rows.length, totalAmount },
          items: rows.map(serializeSale),
        });
      }
      case "inventory": {
        const where: Prisma.PharmacyBatchWhereInput = {
          ...clinicWhere(tenant),
          ...(query.productId ? { productId: query.productId } : {}),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
          ...(query.category ? { product: { category: query.category } } : {}),
        };
        const rows = await prisma.pharmacyBatch.findMany({
          where,
          include: { product: true, supplier: true },
          orderBy: { expiryDate: "asc" },
        });
        return ok(c, {
          type: query.type,
          summary: {
            batches: rows.length,
            availableUnits: rows.reduce((sum, row) => sum + row.availableQuantity, 0),
          },
          items: rows.map((row) => serializeBatch(row, row.product, warningDays)),
        });
      }
      case "low-stock": {
        const items = await lowStockProducts(tenant, warningDays, 500);
        return ok(c, { type: query.type, summary: { count: items.length }, items });
      }
      case "expiry": {
        const expiringSoon = await expiringBatches(tenant, warningDays, 500);
        const expired = await expiredBatches(tenant, 500);
        return ok(c, {
          type: query.type,
          summary: { expiringSoon: expiringSoon.length, expired: expired.length },
          expiringSoon,
          expired,
        });
      }
      case "purchase": {
        const where: Prisma.PharmacyPurchaseOrderWhereInput = {
          ...clinicWhere(tenant),
          ...(query.supplierId ? { supplierId: query.supplierId } : {}),
          ...(dateFilter ? { orderDate: dateFilter } : {}),
        };
        const rows = await prisma.pharmacyPurchaseOrder.findMany({
          where,
          include: { supplier: true, items: { include: { product: true, batch: true } } },
          orderBy: { orderDate: "desc" },
        });
        const totalAmount = rows.reduce((sum, row) => sum + dec(row.totalAmount), 0);
        return ok(c, {
          type: query.type,
          summary: { count: rows.length, totalAmount },
          items: rows.map(serializePurchaseOrder),
        });
      }
      case "movement": {
        const where: Prisma.PharmacyStockMovementWhereInput = {
          ...clinicWhere(tenant),
          ...(query.productId ? { productId: query.productId } : {}),
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(query.userId ? { actorUserId: query.userId } : {}),
        };
        const rows = await prisma.pharmacyStockMovement.findMany({
          where,
          include: {
            product: { select: { id: true, name: true } },
            batch: { select: { id: true, batchNumber: true } },
            actor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        return ok(c, {
          type: query.type,
          summary: { count: rows.length },
          items: rows.map(serializeMovement),
        });
      }
      case "supplier": {
        const where: Prisma.PharmacySupplierWhereInput = {
          ...clinicWhere(tenant),
          ...(query.supplierId ? { id: query.supplierId } : {}),
        };
        const rows = await prisma.pharmacySupplier.findMany({
          where,
          include: { _count: { select: { purchaseOrders: true, batches: true } } },
          orderBy: { name: "asc" },
        });
        return ok(c, {
          type: query.type,
          summary: { count: rows.length },
          items: rows.map(serializeSupplier),
        });
      }
      default:
        throw new HttpError(404, "UNKNOWN_REPORT", "Unknown report type.");
    }
  });
