-- Pharmacy demo readiness: medication schedules + WhatsApp reminders

CREATE TYPE "MedicationReminderStatus" AS ENUM (
  'PENDING',
  'SCHEDULED',
  'SENT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'SKIPPED_NO_CONSENT'
);

ALTER TABLE "PharmacyPrescription" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
ALTER TABLE "PharmacyPrescription" ADD COLUMN IF NOT EXISTS "treatmentId" TEXT;

ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "timeOfDay" TEXT;
ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "beforeAfterFood" TEXT;
ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "careTaskId" TEXT;

CREATE TABLE IF NOT EXISTS "MedicationReminder" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "careTaskId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "MedicationReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "channel" "ConversationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "demoMode" BOOLEAN NOT NULL DEFAULT true,
    "demoMessageBody" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PharmacyPrescription_appointmentId_idx" ON "PharmacyPrescription"("appointmentId");
CREATE INDEX IF NOT EXISTS "PharmacyPrescription_treatmentId_idx" ON "PharmacyPrescription"("treatmentId");
CREATE INDEX IF NOT EXISTS "PharmacyPrescriptionItem_careTaskId_idx" ON "PharmacyPrescriptionItem"("careTaskId");
CREATE INDEX IF NOT EXISTS "MedicationReminder_clinicId_scheduledAt_status_idx" ON "MedicationReminder"("clinicId", "scheduledAt", "status");
CREATE INDEX IF NOT EXISTS "MedicationReminder_prescriptionItemId_idx" ON "MedicationReminder"("prescriptionItemId");
CREATE INDEX IF NOT EXISTS "MedicationReminder_patientId_scheduledAt_idx" ON "MedicationReminder"("patientId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "MedicationReminder_careTaskId_idx" ON "MedicationReminder"("careTaskId");

DO $$ BEGIN
  ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_treatmentId_fkey"
    FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PharmacyPrescriptionItem" ADD CONSTRAINT "PharmacyPrescriptionItem_careTaskId_fkey"
    FOREIGN KEY ("careTaskId") REFERENCES "CareTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_prescriptionItemId_fkey"
    FOREIGN KEY ("prescriptionItemId") REFERENCES "PharmacyPrescriptionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_careTaskId_fkey"
    FOREIGN KEY ("careTaskId") REFERENCES "CareTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
