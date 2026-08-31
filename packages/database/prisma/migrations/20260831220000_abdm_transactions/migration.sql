-- AbdmTransaction audit table for ABDM journey operations
CREATE TABLE IF NOT EXISTS "AbdmTransaction" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "coupleId" TEXT,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "referenceId" TEXT,
    "abhaMasked" TEXT,
    "consentReference" TEXT,
    "errorCode" TEXT,
    "userMessage" TEXT,
    "technicalDetail" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "initiatedById" TEXT,
    "initiatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AbdmTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AbdmTransaction_clinicId_createdAt_idx" ON "AbdmTransaction"("clinicId", "createdAt");
CREATE INDEX IF NOT EXISTS "AbdmTransaction_patientId_createdAt_idx" ON "AbdmTransaction"("patientId", "createdAt");
CREATE INDEX IF NOT EXISTS "AbdmTransaction_clinicId_operation_status_idx" ON "AbdmTransaction"("clinicId", "operation", "status");

DO $$ BEGIN
  ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
