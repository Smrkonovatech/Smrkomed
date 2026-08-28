import type {
  PharmacyBatch,
  PharmacyProduct,
  PharmacyPurchaseOrder,
  PharmacyPurchaseOrderItem,
  PharmacyPrescription,
  PharmacyPrescriptionItem,
  PharmacySale,
  PharmacySaleItem,
  PharmacyStockMovement,
  PharmacySupplier,
  Patient,
  User,
} from "@prisma/client";

import { batchStockStatus, daysUntil, dec, isExpired, productTotalStock } from "./stock";

type ProductWithBatches = PharmacyProduct & {
  batches?: PharmacyBatch[];
  _count?: { batches?: number };
};

export function serializeProduct(product: ProductWithBatches, warningDays = 30) {
  const batches = product.batches ?? [];
  const currentStock = productTotalStock(batches);
  const threshold = Math.max(product.minimumStock, product.reorderLevel);
  const lowStock = threshold > 0 && currentStock <= threshold;
  return {
    id: product.id,
    clinicId: product.clinicId,
    name: product.name,
    genericName: product.genericName,
    brandName: product.brandName,
    category: product.category,
    subCategory: product.subCategory,
    description: product.description,
    manufacturer: product.manufacturer,
    unit: product.unit,
    packSize: product.packSize,
    medicineType: product.medicineType,
    imageUrl: product.imageUrl,
    prescriptionRequired: product.prescriptionRequired,
    minimumStock: product.minimumStock,
    reorderLevel: product.reorderLevel,
    defaultPurchasePrice: dec(product.defaultPurchasePrice),
    defaultSellingPrice: dec(product.defaultSellingPrice),
    defaultMrp: dec(product.defaultMrp),
    gstPercent: dec(product.gstPercent),
    status: product.status,
    currentStock,
    lowStock,
    batchCount: product._count?.batches ?? batches.length,
    batches: batches.map((b) => serializeBatch(b, product, warningDays)),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function serializeBatch(
  batch: PharmacyBatch & { product?: PharmacyProduct; supplier?: PharmacySupplier | null },
  product?: PharmacyProduct,
  warningDays = 30,
) {
  const prod = product ?? batch.product;
  const status = prod
    ? batchStockStatus(batch, prod, warningDays)
    : batch.availableQuantity <= 0
      ? "OUT_OF_STOCK"
      : isExpired(batch.expiryDate)
        ? "EXPIRED"
        : "IN_STOCK";
  return {
    id: batch.id,
    clinicId: batch.clinicId,
    productId: batch.productId,
    supplierId: batch.supplierId,
    batchNumber: batch.batchNumber,
    quantity: batch.quantity,
    availableQuantity: batch.availableQuantity,
    reservedQuantity: batch.reservedQuantity,
    purchasePrice: dec(batch.purchasePrice),
    sellingPrice: dec(batch.sellingPrice),
    mrp: dec(batch.mrp),
    gstPercent: dec(batch.gstPercent),
    manufacturingDate: batch.manufacturingDate?.toISOString() ?? null,
    expiryDate: batch.expiryDate?.toISOString() ?? null,
    purchaseDate: batch.purchaseDate?.toISOString() ?? null,
    storageLocation: batch.storageLocation,
    notes: batch.notes,
    status,
    daysRemaining: daysUntil(batch.expiryDate),
    expired: isExpired(batch.expiryDate),
    product: prod
      ? {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          manufacturer: prod.manufacturer,
          minimumStock: prod.minimumStock,
          reorderLevel: prod.reorderLevel,
          imageUrl: prod.imageUrl,
          unit: prod.unit,
        }
      : undefined,
    supplier: batch.supplier
      ? { id: batch.supplier.id, name: batch.supplier.name }
      : null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export function serializeMovement(
  movement: PharmacyStockMovement & {
    product?: Pick<PharmacyProduct, "id" | "name">;
    batch?: Pick<PharmacyBatch, "id" | "batchNumber">;
    actor?: Pick<User, "id" | "name"> | null;
  },
) {
  return {
    id: movement.id,
    clinicId: movement.clinicId,
    productId: movement.productId,
    batchId: movement.batchId,
    type: movement.type,
    quantity: movement.quantity,
    balanceAfter: movement.balanceAfter,
    reason: movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    actorUserId: movement.actorUserId,
    actorName: movement.actor?.name ?? null,
    productName: movement.product?.name,
    batchNumber: movement.batch?.batchNumber,
    createdAt: movement.createdAt.toISOString(),
  };
}

export function serializeSupplier(supplier: PharmacySupplier & { _count?: { purchaseOrders?: number; batches?: number } }) {
  return {
    id: supplier.id,
    clinicId: supplier.clinicId,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    gstNumber: supplier.gstNumber,
    licenseInfo: supplier.licenseInfo,
    notes: supplier.notes,
    status: supplier.status,
    purchaseOrderCount: supplier._count?.purchaseOrders ?? 0,
    batchCount: supplier._count?.batches ?? 0,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

export function serializePurchaseOrder(
  order: PharmacyPurchaseOrder & {
    supplier?: PharmacySupplier;
    items?: Array<
      PharmacyPurchaseOrderItem & {
        product?: Pick<PharmacyProduct, "id" | "name" | "unit">;
      }
    >;
  },
) {
  return {
    id: order.id,
    clinicId: order.clinicId,
    supplierId: order.supplierId,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate.toISOString(),
    expectedDelivery: order.expectedDelivery?.toISOString() ?? null,
    status: order.status,
    taxAmount: dec(order.taxAmount),
    totalAmount: dec(order.totalAmount),
    notes: order.notes,
    supplier: order.supplier
      ? { id: order.supplier.id, name: order.supplier.name, phone: order.supplier.phone }
      : undefined,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      batchId: item.batchId,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      purchasePrice: dec(item.purchasePrice),
      mrp: dec(item.mrp),
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate?.toISOString() ?? null,
      product: item.product
        ? { id: item.product.id, name: item.product.name, unit: item.product.unit }
        : undefined,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function serializeSale(
  sale: PharmacySale & {
    patient?: Pick<Patient, "id" | "firstName" | "lastName"> | null;
    items?: Array<
      PharmacySaleItem & {
        product?: Pick<PharmacyProduct, "id" | "name" | "unit">;
        batch?: Pick<PharmacyBatch, "id" | "batchNumber">;
      }
    >;
    createdBy?: Pick<User, "id" | "name"> | null;
  },
) {
  const patientName = sale.patient
    ? `${sale.patient.firstName} ${sale.patient.lastName}`.trim()
    : null;
  return {
    id: sale.id,
    clinicId: sale.clinicId,
    invoiceNumber: sale.invoiceNumber,
    patientId: sale.patientId,
    coupleId: sale.coupleId,
    patientName,
    doctorName: sale.doctorName,
    subtotal: dec(sale.subtotal),
    discountAmount: dec(sale.discountAmount),
    taxAmount: dec(sale.taxAmount),
    totalAmount: dec(sale.totalAmount),
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    notes: sale.notes,
    createdById: sale.createdById,
    createdByName: sale.createdBy?.name ?? null,
    itemCount: sale.items?.length ?? 0,
    items: (sale.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      batchId: item.batchId,
      quantity: item.quantity,
      unitPrice: dec(item.unitPrice),
      taxAmount: dec(item.taxAmount),
      discountAmount: dec(item.discountAmount),
      lineTotal: dec(item.lineTotal),
      productName: item.product?.name,
      batchNumber: item.batch?.batchNumber,
      unit: item.product?.unit,
    })),
    soldAt: sale.soldAt.toISOString(),
    createdAt: sale.createdAt.toISOString(),
  };
}

export function serializePrescription(
  rx: PharmacyPrescription & {
    patient?: Pick<Patient, "id" | "firstName" | "lastName">;
    doctor?: Pick<User, "id" | "name"> | null;
    items?: Array<
      PharmacyPrescriptionItem & {
        product?: Pick<PharmacyProduct, "id" | "name" | "unit">;
        batch?: Pick<PharmacyBatch, "id" | "batchNumber"> | null;
      }
    >;
  },
) {
  return {
    id: rx.id,
    clinicId: rx.clinicId,
    patientId: rx.patientId,
    coupleId: rx.coupleId,
    patientName: rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}`.trim() : null,
    doctorId: rx.doctorId,
    doctorName: rx.doctorName ?? rx.doctor?.name ?? null,
    prescriptionDate: rx.prescriptionDate.toISOString(),
    status: rx.status,
    notes: rx.notes,
    dispensedById: rx.dispensedById,
    dispensedAt: rx.dispensedAt?.toISOString() ?? null,
    items: (rx.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      batchId: item.batchId,
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantityPrescribed: item.quantityPrescribed,
      quantityDispensed: item.quantityDispensed,
      productName: item.product?.name ?? item.medicineName,
      batchNumber: item.batch?.batchNumber ?? null,
      unit: item.product?.unit,
    })),
    createdAt: rx.createdAt.toISOString(),
    updatedAt: rx.updatedAt.toISOString(),
  };
}
