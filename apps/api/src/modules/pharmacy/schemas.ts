import { z } from "zod";

export const idParam = z.object({ id: z.string().min(1) });

const moneyField = z.number().min(0).max(1_000_000_000);
const qtyField = z.number().int().min(0).max(1_000_000);

export const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  supplierId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  status: z.string().trim().max(40).optional(),
  prescriptionRequired: z.enum(["true", "false"]).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "OTHER"]).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  warningDays: z.coerce.number().int().min(1).max(365).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().trim().max(40).optional(),
});

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    genericName: z.string().trim().max(160).optional().nullable(),
    brandName: z.string().trim().max(160).optional().nullable(),
    category: z.string().trim().max(80).optional().nullable(),
    subCategory: z.string().trim().max(80).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    manufacturer: z.string().trim().max(160).optional().nullable(),
    unit: z.string().trim().min(1).max(40).optional(),
    packSize: z.string().trim().max(80).optional().nullable(),
    medicineType: z.string().trim().max(80).optional().nullable(),
    imageUrl: z.string().trim().max(500).optional().nullable(),
    prescriptionRequired: z.boolean().optional(),
    minimumStock: qtyField.optional(),
    reorderLevel: qtyField.optional(),
    defaultPurchasePrice: moneyField.optional(),
    defaultSellingPrice: moneyField.optional(),
    defaultMrp: moneyField.optional(),
    gstPercent: z.number().min(0).max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  })
  .strict();

export const updateProductSchema = createProductSchema.partial();

export const createBatchSchema = z
  .object({
    productId: z.string().min(1),
    supplierId: z.string().min(1).optional().nullable(),
    batchNumber: z.string().trim().min(1).max(80),
    quantity: z.number().int().positive().max(1_000_000),
    purchasePrice: moneyField.optional(),
    sellingPrice: moneyField.optional(),
    mrp: moneyField.optional(),
    gstPercent: z.number().min(0).max(100).optional(),
    manufacturingDate: z.string().trim().optional().nullable(),
    expiryDate: z.string().trim().optional().nullable(),
    purchaseDate: z.string().trim().optional().nullable(),
    storageLocation: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export const adjustStockSchema = z
  .object({
    productId: z.string().min(1),
    batchId: z.string().min(1),
    quantity: z.number().int().positive().max(1_000_000),
    type: z.enum(["ADJUSTMENT", "DAMAGED", "EXPIRED", "RETURNED", "TRANSFER_IN", "TRANSFER_OUT"]),
    reason: z.string().trim().min(1).max(500),
    direction: z.enum(["increase", "decrease"]).optional(),
  })
  .strict();

export const createSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    contactPerson: z.string().trim().max(120).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
    address: z.string().trim().max(500).optional().nullable(),
    gstNumber: z.string().trim().max(40).optional().nullable(),
    licenseInfo: z.string().trim().max(200).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export const updateSupplierSchema = createSupplierSchema.partial();

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantityOrdered: z.number().int().positive().max(1_000_000),
  purchasePrice: moneyField,
  mrp: moneyField.optional(),
});

export const createPurchaseOrderSchema = z
  .object({
    supplierId: z.string().min(1),
    orderDate: z.string().trim().optional(),
    expectedDelivery: z.string().trim().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    taxAmount: moneyField.optional(),
    items: z.array(purchaseOrderItemSchema).min(1).max(200),
    status: z.enum(["DRAFT", "ORDERED"]).optional(),
  })
  .strict();

export const receivePurchaseItemSchema = z.object({
  itemId: z.string().min(1),
  quantityReceived: z.number().int().positive().max(1_000_000),
  batchNumber: z.string().trim().min(1).max(80),
  expiryDate: z.string().trim().min(1),
  purchasePrice: moneyField.optional(),
  mrp: moneyField.optional(),
  manufacturingDate: z.string().trim().optional().nullable(),
  storageLocation: z.string().trim().max(120).optional().nullable(),
});

export const receivePurchaseOrderSchema = z
  .object({
    items: z.array(receivePurchaseItemSchema).min(1).max(200),
  })
  .strict();

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  unitPrice: moneyField.optional(),
  discountAmount: moneyField.optional(),
});

export const createSaleSchema = z
  .object({
    patientId: z.string().min(1).optional().nullable(),
    coupleId: z.string().min(1).optional().nullable(),
    doctorName: z.string().trim().max(120).optional().nullable(),
    discountAmount: moneyField.optional(),
    paymentMethod: z.enum(["CASH", "UPI", "CARD", "OTHER"]).optional(),
    paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL", "REFUNDED"]).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(saleItemSchema).min(1).max(200),
  })
  .strict();

export const prescriptionItemSchema = z.object({
  productId: z.string().min(1),
  medicineName: z.string().trim().min(1).max(160).optional(),
  dosage: z.string().trim().max(120).optional().nullable(),
  frequency: z.string().trim().max(120).optional().nullable(),
  duration: z.string().trim().max(120).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
  quantityPrescribed: z.number().int().positive().max(1_000_000),
});

export const createPrescriptionSchema = z
  .object({
    patientId: z.string().min(1),
    coupleId: z.string().min(1).optional().nullable(),
    doctorId: z.string().min(1).optional().nullable(),
    doctorName: z.string().trim().max(120).optional().nullable(),
    prescriptionDate: z.string().trim().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(prescriptionItemSchema).min(1).max(100),
  })
  .strict();

export const dispenseItemSchema = z.object({
  itemId: z.string().min(1),
  batchId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
});

export const dispensePrescriptionSchema = z
  .object({
    items: z.array(dispenseItemSchema).min(1).max(100),
  })
  .strict();

export const updateSettingsSchema = z
  .object({
    expiryWarningDays: z.number().int().min(1).max(365).optional(),
    lowStockEnabled: z.boolean().optional(),
  })
  .strict();

export const reportQuery = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  productId: z.string().min(1).optional(),
  category: z.string().trim().max(80).optional(),
  supplierId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "OTHER"]).optional(),
  type: z
    .enum(["sales", "inventory", "low-stock", "expiry", "purchase", "movement", "supplier"])
    .default("sales"),
  warningDays: z.coerce.number().int().min(1).max(365).optional(),
});
