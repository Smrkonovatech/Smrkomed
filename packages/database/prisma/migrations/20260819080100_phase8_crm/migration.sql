-- Phase 8 Fertility CRM + Lead Engine (additive).

DO $$ BEGIN
  CREATE TYPE "LeadStage" AS ENUM (
    'NEW_LEAD',
    'CONTACTED',
    'QUALIFIED',
    'CONSULTATION_BOOKED',
    'CONSULTATION_COMPLETED',
    'INVESTIGATION',
    'TREATMENT_DISCUSSION',
    'TREATMENT_STARTED',
    'ACTIVE_PATIENT',
    'LOST'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadActivityType" AS ENUM (
    'LEAD_CREATED',
    'LEAD_ASSIGNED',
    'LEAD_REASSIGNED',
    'CALL_ATTEMPTED',
    'CALL_CONNECTED',
    'WHATSAPP_SENT',
    'WHATSAPP_RECEIVED',
    'COUNSELLING_COMPLETED',
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CANCELLED',
    'STAGE_CHANGED',
    'NOTE_ADDED',
    'FOLLOW_UP_SCHEDULED',
    'LEAD_CONVERTED',
    'LEAD_LOST',
    'LEAD_REOPENED',
    'SCORE_UPDATED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Lead was never created in earlier migrations (local DBs used db push).
CREATE TABLE IF NOT EXISTS "Lead" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "source" "LeadSource" NOT NULL,
  "campaign" TEXT,
  "ad" TEXT,
  "location" TEXT,
  "treatmentInterest" TEXT,
  "assignedToId" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT,
  "name" TEXT NOT NULL,
  "source" "LeadSource" NOT NULL,
  "medium" TEXT,
  "campaignExternalId" TEXT,
  "treatmentFocus" TEXT,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "budget" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT,
  "userId" TEXT,
  "type" "LeadActivityType" NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "preferredLanguage" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "campaignId" TEXT,
  ADD COLUMN IF NOT EXISTS "medium" TEXT,
  ADD COLUMN IF NOT EXISTS "externalLeadId" TEXT,
  ADD COLUMN IF NOT EXISTS "landingPage" TEXT,
  ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utmTerm" TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
  ADD COLUMN IF NOT EXISTS "stage" "LeadStage" NOT NULL DEFAULT 'NEW_LEAD',
  ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lostReason" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "patientId" TEXT,
  ADD COLUMN IF NOT EXISTS "coupleId" TEXT,
  ADD COLUMN IF NOT EXISTS "conversationId" TEXT;

ALTER TABLE "CareTask" ALTER COLUMN "coupleId" DROP NOT NULL;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

ALTER TABLE "Appointment" ALTER COLUMN "coupleId" DROP NOT NULL;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- Backfill pipeline stage from the previous mixed LeadStatus values.
UPDATE "Lead" SET "stage" = 'NEW_LEAD' WHERE "status" = 'NEW';
UPDATE "Lead" SET "stage" = 'CONTACTED' WHERE "status" = 'CONTACTED';
UPDATE "Lead" SET "stage" = 'QUALIFIED' WHERE "status" = 'QUALIFIED';
UPDATE "Lead" SET "stage" = 'CONSULTATION_BOOKED' WHERE "status" = 'CONSULTATION_BOOKED';
UPDATE "Lead" SET "stage" = 'CONSULTATION_COMPLETED' WHERE "status" = 'CONSULTATION_COMPLETED';
UPDATE "Lead" SET "stage" = 'TREATMENT_DISCUSSION' WHERE "status" = 'TREATMENT_DISCUSSION';
UPDATE "Lead" SET "stage" = 'TREATMENT_STARTED' WHERE "status" = 'TREATMENT_STARTED';
UPDATE "Lead" SET "stage" = 'ACTIVE_PATIENT' WHERE "status" = 'ACTIVE_PATIENT';
UPDATE "Lead" SET "stage" = 'LOST' WHERE "status" = 'LOST';

-- Split lifecycle status from pipeline stage.
UPDATE "Lead" SET "status" = 'OPEN' WHERE "status" IN (
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION_BOOKED',
  'CONSULTATION_COMPLETED',
  'TREATMENT_DISCUSSION',
  'TREATMENT_STARTED'
);
UPDATE "Lead" SET "status" = 'CONVERTED' WHERE "status" = 'ACTIVE_PATIENT';

DO $$ BEGIN
  ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeadActivity"
    ADD CONSTRAINT "LeadActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CareTask"
    ADD CONSTRAINT "CareTask_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Campaign_clinicId_idx" ON "Campaign"("clinicId");
CREATE INDEX IF NOT EXISTS "Campaign_source_idx" ON "Campaign"("source");

CREATE INDEX IF NOT EXISTS "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadActivity_organizationId_createdAt_idx" ON "LeadActivity"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadActivity_clinicId_createdAt_idx" ON "LeadActivity"("clinicId", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_organizationId_stage_idx" ON "Lead"("organizationId", "stage");
CREATE INDEX IF NOT EXISTS "Lead_clinicId_stage_idx" ON "Lead"("clinicId", "stage");
CREATE INDEX IF NOT EXISTS "Lead_clinicId_source_idx" ON "Lead"("clinicId", "source");
CREATE INDEX IF NOT EXISTS "Lead_assignedToId_idx" ON "Lead"("assignedToId");
CREATE INDEX IF NOT EXISTS "Lead_campaignId_idx" ON "Lead"("campaignId");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX IF NOT EXISTS "Lead_clinicId_phone_idx" ON "Lead"("clinicId", "phone");
CREATE INDEX IF NOT EXISTS "Lead_clinicId_email_idx" ON "Lead"("clinicId", "email");
CREATE INDEX IF NOT EXISTS "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

CREATE INDEX IF NOT EXISTS "CareTask_leadId_idx" ON "CareTask"("leadId");
CREATE INDEX IF NOT EXISTS "Appointment_leadId_idx" ON "Appointment"("leadId");
CREATE INDEX IF NOT EXISTS "Conversation_leadId_idx" ON "Conversation"("leadId");
