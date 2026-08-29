-- Stage 6: medication adherence statuses (additive enum values)

DO $$ BEGIN
  ALTER TYPE "MedicationReminderStatus" ADD VALUE IF NOT EXISTS 'DUE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "MedicationReminderStatus" ADD VALUE IF NOT EXISTS 'TAKEN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "MedicationReminderStatus" ADD VALUE IF NOT EXISTS 'MISSED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "MedicationReminderStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "MedicationReminderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PharmacyPrescriptionItem" ADD COLUMN IF NOT EXISTS "route" TEXT;
