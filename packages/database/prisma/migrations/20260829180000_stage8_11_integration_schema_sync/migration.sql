-- Stage 8.11: sync Integration / IntegrationProvider / IntegrationStatus drift.
-- Additive only. Does not drop patient data.

-- IntegrationProvider values used by CRM / payments / ABDM / messaging adapters
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'META_ADS';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_ADS';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'RAZORPAY';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'SMS';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'EMAIL';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'EMR';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'ABDM';

-- IntegrationStatus values used by WhatsApp / connect flows
ALTER TYPE "IntegrationStatus" ADD VALUE IF NOT EXISTS 'ACTION_REQUIRED';
ALTER TYPE "IntegrationStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Columns expected by Prisma schema + integration framework but missing from applied DB
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "externalAccountId" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "encryptedCredentials" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);

-- Align Conversation.patient FK with schema (optional patient; allow null on patient delete)
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_patientId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Redundant single-column index (composite clinic indexes already cover clinicId)
DROP INDEX IF EXISTS "Conversation_clinicId_idx";
