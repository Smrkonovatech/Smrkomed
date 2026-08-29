-- Stage 5: Inbox ops + preferences + controlled campaigns (additive)

-- ConversationStatus enum extensions
DO $$ BEGIN
  ALTER TYPE "ConversationStatus" ADD VALUE IF NOT EXISTS 'HUMAN_HANDOFF';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ConversationStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ConversationStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "assignedStaffId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "handoffAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "handoffReason" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "automationPausedAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastStaffReadAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Conversation_clinicId_assignedStaffId_idx" ON "Conversation"("clinicId", "assignedStaffId");
CREATE INDEX IF NOT EXISTS "Conversation_clinicId_status_idx" ON "Conversation"("clinicId", "status");

DO $$ BEGIN
  ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_assignedStaffId_fkey"
    FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CommunicationPreference" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "careReminders" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "pharmacyReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationPreference_patientId_key" ON "CommunicationPreference"("patientId");
CREATE INDEX IF NOT EXISTS "CommunicationPreference_clinicId_idx" ON "CommunicationPreference"("clinicId");

DO $$ BEGIN
  ALTER TABLE "CommunicationPreference"
    ADD CONSTRAINT "CommunicationPreference_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CommunicationPreference"
    ADD CONSTRAINT "CommunicationPreference_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppCampaignStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppCampaign" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL DEFAULT 'en',
    "templateId" TEXT,
    "audienceFilter" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "excludedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppCampaign_clinicId_status_idx" ON "WhatsAppCampaign"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "WhatsAppCampaign_clinicId_scheduledAt_idx" ON "WhatsAppCampaign"("clinicId", "scheduledAt");

DO $$ BEGIN
  ALTER TABLE "WhatsAppCampaign"
    ADD CONSTRAINT "WhatsAppCampaign_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WhatsAppCampaign"
    ADD CONSTRAINT "WhatsAppCampaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WhatsAppCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppCampaignRecipient_campaignId_patientId_key"
  ON "WhatsAppCampaignRecipient"("campaignId", "patientId");
CREATE INDEX IF NOT EXISTS "WhatsAppCampaignRecipient_campaignId_status_idx"
  ON "WhatsAppCampaignRecipient"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "WhatsAppCampaignRecipient_clinicId_idx"
  ON "WhatsAppCampaignRecipient"("clinicId");

DO $$ BEGIN
  ALTER TABLE "WhatsAppCampaignRecipient"
    ADD CONSTRAINT "WhatsAppCampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WhatsAppCampaignRecipient"
    ADD CONSTRAINT "WhatsAppCampaignRecipient_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
