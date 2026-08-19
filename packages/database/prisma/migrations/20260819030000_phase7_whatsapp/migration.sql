-- Phase 7: WhatsApp Business Platform (additive).
-- Reuses Integration, WhatsAppAccount, Conversation, Message.

DO $$ BEGIN
  CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Conversation" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "unmatched" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_channel_idx" ON "Conversation"("clinicId", "channel");
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_contactPhone_idx" ON "Conversation"("clinicId", "contactPhone");

DROP INDEX IF EXISTS "Message_providerMessageId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Message_providerMessageId_key" ON "Message"("providerMessageId");

ALTER TABLE "WhatsAppAccount" ADD COLUMN IF NOT EXISTS "integrationId" TEXT;
ALTER TABLE "WhatsAppAccount" ADD COLUMN IF NOT EXISTS "displayPhoneNumber" TEXT;
ALTER TABLE "WhatsAppAccount" ADD COLUMN IF NOT EXISTS "verifiedName" TEXT;
ALTER TABLE "WhatsAppAccount" ADD COLUMN IF NOT EXISTS "qualityRating" TEXT;
ALTER TABLE "WhatsAppAccount" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "WhatsAppAccount_phoneNumberId_idx" ON "WhatsAppAccount"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "WhatsAppAccount_businessAccountId_idx" ON "WhatsAppAccount"("businessAccountId");

DO $$ BEGIN
  ALTER TABLE "WhatsAppAccount"
    ADD CONSTRAINT "WhatsAppAccount_integrationId_fkey"
    FOREIGN KEY ("integrationId") REFERENCES "Integration"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppTemplate" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" "WhatsAppTemplateStatus" NOT NULL,
  "parameterCount" INTEGER NOT NULL DEFAULT 0,
  "rejectionReason" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppTemplate_integrationId_name_language_key"
  ON "WhatsAppTemplate"("integrationId", "name", "language");
CREATE INDEX IF NOT EXISTS "WhatsAppTemplate_clinicId_status_idx"
  ON "WhatsAppTemplate"("clinicId", "status");

DO $$ BEGIN
  ALTER TABLE "WhatsAppTemplate"
    ADD CONSTRAINT "WhatsAppTemplate_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WhatsAppTemplate"
    ADD CONSTRAINT "WhatsAppTemplate_integrationId_fkey"
    FOREIGN KEY ("integrationId") REFERENCES "Integration"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "IntegrationOauthState" (
  "id" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntegrationOauthState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IntegrationOauthState_expiresAt_idx" ON "IntegrationOauthState"("expiresAt");
CREATE INDEX IF NOT EXISTS "IntegrationOauthState_clinicId_provider_idx" ON "IntegrationOauthState"("clinicId", "provider");
