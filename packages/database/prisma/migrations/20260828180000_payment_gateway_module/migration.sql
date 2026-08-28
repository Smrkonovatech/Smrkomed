-- Payment gateway + billing invoices (additive)

CREATE TYPE "PaymentGatewayProvider" AS ENUM ('RAZORPAY', 'CASHFREE', 'PAYU');
CREATE TYPE "PaymentGatewayMode" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "PaymentGatewayConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');
CREATE TYPE "BillingInvoiceSource" AS ENUM ('TREATMENT', 'PHARMACY', 'MANUAL', 'OTHER');
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "BillingPaymentProvider" AS ENUM ('RAZORPAY', 'CASHFREE', 'PAYU', 'MANUAL', 'CASH');
CREATE TYPE "BillingRefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

CREATE TABLE "PaymentGatewayConnection" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "displayName" TEXT,
    "encryptedCredentials" TEXT,
    "mode" "PaymentGatewayMode" NOT NULL DEFAULT 'TEST',
    "status" "PaymentGatewayConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "webhookSecretEncrypted" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentGatewayConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "coupleId" TEXT,
    "pharmacySaleId" TEXT,
    "source" "BillingInvoiceSource" NOT NULL DEFAULT 'MANUAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmount" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "patientId" TEXT,
    "coupleId" TEXT,
    "pharmacySaleId" TEXT,
    "gatewayConnectionId" TEXT,
    "provider" "BillingPaymentProvider" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewayReference" TEXT,
    "paymentLinkUrl" TEXT,
    "paymentLinkId" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingRefund" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "BillingRefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "gatewayRefundId" TEXT,
    "failureReason" TEXT,
    "createdById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "payloadHash" TEXT,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentGatewayConnection_clinicId_provider_key" ON "PaymentGatewayConnection"("clinicId", "provider");
CREATE UNIQUE INDEX "BillingInvoice_clinicId_invoiceNumber_key" ON "BillingInvoice"("clinicId", "invoiceNumber");
CREATE UNIQUE INDEX "BillingInvoice_pharmacySaleId_key" ON "BillingInvoice"("pharmacySaleId");
CREATE UNIQUE INDEX "BillingPayment_clinicId_gatewayPaymentId_key" ON "BillingPayment"("clinicId", "gatewayPaymentId");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_externalEventId_key" ON "PaymentWebhookEvent"("provider", "externalEventId");

CREATE INDEX "PaymentGatewayConnection_clinicId_isActive_idx" ON "PaymentGatewayConnection"("clinicId", "isActive");
CREATE INDEX "PaymentGatewayConnection_clinicId_isDefault_idx" ON "PaymentGatewayConnection"("clinicId", "isDefault");
CREATE INDEX "BillingInvoice_clinicId_status_idx" ON "BillingInvoice"("clinicId", "status");
CREATE INDEX "BillingInvoice_clinicId_patientId_idx" ON "BillingInvoice"("clinicId", "patientId");
CREATE INDEX "BillingInvoice_clinicId_coupleId_idx" ON "BillingInvoice"("clinicId", "coupleId");
CREATE INDEX "BillingInvoice_clinicId_dueDate_idx" ON "BillingInvoice"("clinicId", "dueDate");
CREATE INDEX "BillingInvoice_clinicId_issuedAt_idx" ON "BillingInvoice"("clinicId", "issuedAt");
CREATE INDEX "BillingInvoiceLine_invoiceId_idx" ON "BillingInvoiceLine"("invoiceId");
CREATE INDEX "BillingPayment_clinicId_status_idx" ON "BillingPayment"("clinicId", "status");
CREATE INDEX "BillingPayment_clinicId_createdAt_idx" ON "BillingPayment"("clinicId", "createdAt");
CREATE INDEX "BillingPayment_invoiceId_idx" ON "BillingPayment"("invoiceId");
CREATE INDEX "BillingPayment_patientId_idx" ON "BillingPayment"("patientId");
CREATE INDEX "BillingPayment_coupleId_idx" ON "BillingPayment"("coupleId");
CREATE INDEX "BillingPayment_pharmacySaleId_idx" ON "BillingPayment"("pharmacySaleId");
CREATE INDEX "BillingPayment_gatewayOrderId_idx" ON "BillingPayment"("gatewayOrderId");
CREATE INDEX "BillingPayment_gatewayPaymentId_idx" ON "BillingPayment"("gatewayPaymentId");
CREATE INDEX "BillingPayment_paymentLinkId_idx" ON "BillingPayment"("paymentLinkId");
CREATE INDEX "BillingRefund_clinicId_paymentId_idx" ON "BillingRefund"("clinicId", "paymentId");
CREATE INDEX "BillingRefund_paymentId_idx" ON "BillingRefund"("paymentId");
CREATE INDEX "BillingRefund_gatewayRefundId_idx" ON "BillingRefund"("gatewayRefundId");
CREATE INDEX "PaymentWebhookEvent_clinicId_receivedAt_idx" ON "PaymentWebhookEvent"("clinicId", "receivedAt");
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");

ALTER TABLE "PaymentGatewayConnection" ADD CONSTRAINT "PaymentGatewayConnection_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_pharmacySaleId_fkey" FOREIGN KEY ("pharmacySaleId") REFERENCES "PharmacySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoiceLine" ADD CONSTRAINT "BillingInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_pharmacySaleId_fkey" FOREIGN KEY ("pharmacySaleId") REFERENCES "PharmacySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_gatewayConnectionId_fkey" FOREIGN KEY ("gatewayConnectionId") REFERENCES "PaymentGatewayConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingRefund" ADD CONSTRAINT "BillingRefund_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingRefund" ADD CONSTRAINT "BillingRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BillingPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingRefund" ADD CONSTRAINT "BillingRefund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
