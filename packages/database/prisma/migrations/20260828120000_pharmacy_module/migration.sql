-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'PHARMACY_MANAGER';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'PHARMACIST';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'PHARMACY_STAFF';

-- CreateEnum
CREATE TYPE "PharmacyProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "PharmacySupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PharmacyStockMovementType" AS ENUM ('PURCHASE', 'SALE', 'DISPENSE', 'ADJUSTMENT', 'DAMAGED', 'EXPIRED', 'RETURNED', 'TRANSFER_IN', 'TRANSFER_OUT');
CREATE TYPE "PharmacyPurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "PharmacySalePaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'OTHER');
CREATE TYPE "PharmacySalePaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'REFUNDED');
CREATE TYPE "PharmacyPrescriptionStatus" AS ENUM ('PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PharmacySetting" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 30,
    "lowStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacySetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyProduct" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brandName" TEXT,
    "category" TEXT,
    "subCategory" TEXT,
    "description" TEXT,
    "manufacturer" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "packSize" TEXT,
    "medicineType" TEXT,
    "imageUrl" TEXT,
    "prescriptionRequired" BOOLEAN NOT NULL DEFAULT false,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "defaultPurchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "defaultSellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "defaultMrp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "PharmacyProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacySupplier" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "licenseInfo" TEXT,
    "notes" TEXT,
    "status" "PharmacySupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacySupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyBatch" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mrp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "storageLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyStockMovement" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "PharmacyStockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyPurchaseOrder" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "status" "PharmacyPurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyPurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mrp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacySale" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "coupleId" TEXT,
    "doctorName" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PharmacySalePaymentMethod" NOT NULL DEFAULT 'CASH',
    "paymentStatus" "PharmacySalePaymentStatus" NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "createdById" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacySale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacySaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacySaleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyPrescription" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "coupleId" TEXT,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "prescriptionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PharmacyPrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyPrescription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PharmacyPrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    "quantityPrescribed" INTEGER NOT NULL,
    "quantityDispensed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyPrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySetting_clinicId_key" ON "PharmacySetting"("clinicId");
CREATE INDEX "PharmacyProduct_clinicId_idx" ON "PharmacyProduct"("clinicId");
CREATE INDEX "PharmacyProduct_clinicId_status_idx" ON "PharmacyProduct"("clinicId", "status");
CREATE INDEX "PharmacyProduct_clinicId_category_idx" ON "PharmacyProduct"("clinicId", "category");
CREATE INDEX "PharmacyProduct_clinicId_manufacturer_idx" ON "PharmacyProduct"("clinicId", "manufacturer");
CREATE INDEX "PharmacyProduct_clinicId_name_idx" ON "PharmacyProduct"("clinicId", "name");
CREATE INDEX "PharmacySupplier_clinicId_idx" ON "PharmacySupplier"("clinicId");
CREATE INDEX "PharmacySupplier_clinicId_status_idx" ON "PharmacySupplier"("clinicId", "status");
CREATE INDEX "PharmacySupplier_clinicId_name_idx" ON "PharmacySupplier"("clinicId", "name");
CREATE UNIQUE INDEX "PharmacyBatch_clinicId_productId_batchNumber_key" ON "PharmacyBatch"("clinicId", "productId", "batchNumber");
CREATE INDEX "PharmacyBatch_clinicId_idx" ON "PharmacyBatch"("clinicId");
CREATE INDEX "PharmacyBatch_clinicId_productId_idx" ON "PharmacyBatch"("clinicId", "productId");
CREATE INDEX "PharmacyBatch_clinicId_expiryDate_idx" ON "PharmacyBatch"("clinicId", "expiryDate");
CREATE INDEX "PharmacyBatch_supplierId_idx" ON "PharmacyBatch"("supplierId");
CREATE INDEX "PharmacyStockMovement_clinicId_createdAt_idx" ON "PharmacyStockMovement"("clinicId", "createdAt");
CREATE INDEX "PharmacyStockMovement_clinicId_productId_idx" ON "PharmacyStockMovement"("clinicId", "productId");
CREATE INDEX "PharmacyStockMovement_clinicId_batchId_idx" ON "PharmacyStockMovement"("clinicId", "batchId");
CREATE INDEX "PharmacyStockMovement_referenceType_referenceId_idx" ON "PharmacyStockMovement"("referenceType", "referenceId");
CREATE UNIQUE INDEX "PharmacyPurchaseOrder_clinicId_orderNumber_key" ON "PharmacyPurchaseOrder"("clinicId", "orderNumber");
CREATE INDEX "PharmacyPurchaseOrder_clinicId_status_idx" ON "PharmacyPurchaseOrder"("clinicId", "status");
CREATE INDEX "PharmacyPurchaseOrder_clinicId_supplierId_idx" ON "PharmacyPurchaseOrder"("clinicId", "supplierId");
CREATE INDEX "PharmacyPurchaseOrderItem_purchaseOrderId_idx" ON "PharmacyPurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PharmacyPurchaseOrderItem_productId_idx" ON "PharmacyPurchaseOrderItem"("productId");
CREATE UNIQUE INDEX "PharmacySale_clinicId_invoiceNumber_key" ON "PharmacySale"("clinicId", "invoiceNumber");
CREATE INDEX "PharmacySale_clinicId_soldAt_idx" ON "PharmacySale"("clinicId", "soldAt");
CREATE INDEX "PharmacySale_clinicId_patientId_idx" ON "PharmacySale"("clinicId", "patientId");
CREATE INDEX "PharmacySale_clinicId_coupleId_idx" ON "PharmacySale"("clinicId", "coupleId");
CREATE INDEX "PharmacySaleItem_saleId_idx" ON "PharmacySaleItem"("saleId");
CREATE INDEX "PharmacySaleItem_productId_idx" ON "PharmacySaleItem"("productId");
CREATE INDEX "PharmacySaleItem_batchId_idx" ON "PharmacySaleItem"("batchId");
CREATE INDEX "PharmacyPrescription_clinicId_status_idx" ON "PharmacyPrescription"("clinicId", "status");
CREATE INDEX "PharmacyPrescription_clinicId_patientId_idx" ON "PharmacyPrescription"("clinicId", "patientId");
CREATE INDEX "PharmacyPrescription_clinicId_coupleId_idx" ON "PharmacyPrescription"("clinicId", "coupleId");
CREATE INDEX "PharmacyPrescription_clinicId_prescriptionDate_idx" ON "PharmacyPrescription"("clinicId", "prescriptionDate");
CREATE INDEX "PharmacyPrescriptionItem_prescriptionId_idx" ON "PharmacyPrescriptionItem"("prescriptionId");
CREATE INDEX "PharmacyPrescriptionItem_productId_idx" ON "PharmacyPrescriptionItem"("productId");

-- AddForeignKey
ALTER TABLE "PharmacySetting" ADD CONSTRAINT "PharmacySetting_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyProduct" ADD CONSTRAINT "PharmacyProduct_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacySupplier" ADD CONSTRAINT "PharmacySupplier_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PharmacySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PharmacyBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyStockMovement" ADD CONSTRAINT "PharmacyStockMovement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyPurchaseOrder" ADD CONSTRAINT "PharmacyPurchaseOrder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyPurchaseOrder" ADD CONSTRAINT "PharmacyPurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PharmacySupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyPurchaseOrderItem" ADD CONSTRAINT "PharmacyPurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PharmacyPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyPurchaseOrderItem" ADD CONSTRAINT "PharmacyPurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyPurchaseOrderItem" ADD CONSTRAINT "PharmacyPurchaseOrderItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PharmacyBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacySale" ADD CONSTRAINT "PharmacySale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PharmacySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacySaleItem" ADD CONSTRAINT "PharmacySaleItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PharmacyBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescriptionItem" ADD CONSTRAINT "PharmacyPrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "PharmacyPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescriptionItem" ADD CONSTRAINT "PharmacyPrescriptionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescriptionItem" ADD CONSTRAINT "PharmacyPrescriptionItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PharmacyBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
