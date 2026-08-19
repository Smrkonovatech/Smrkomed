-- Phase 6: Integration Framework (additive).
-- Reuses Integration + WhatsAppAccount. Does not drop data or rewrite history.

ALTER TYPE "IntegrationStatus" ADD VALUE IF NOT EXISTS 'DISCONNECTED';

DO $$ BEGIN
  CREATE TYPE "IntegrationEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Integration" ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT;

UPDATE "Integration" AS i
SET "organizationId" = c."organizationId"
FROM "Clinic" AS c
WHERE c."id" = i."clinicId"
  AND (i."organizationId" IS NULL OR i."organizationId" = '');

ALTER TABLE "Integration" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Integration"
    ADD CONSTRAINT "Integration_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Integration_organizationId_provider_idx"
  ON "Integration"("organizationId", "provider");

CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" "IntegrationEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  "metadata" JSONB,
  "encryptedPayload" TEXT,
  "payloadExpiresAt" TIMESTAMP(3),

  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationEvent_provider_externalEventId_key"
  ON "IntegrationEvent"("provider", "externalEventId");

CREATE INDEX IF NOT EXISTS "IntegrationEvent_organizationId_receivedAt_idx"
  ON "IntegrationEvent"("organizationId", "receivedAt");

CREATE INDEX IF NOT EXISTS "IntegrationEvent_clinicId_receivedAt_idx"
  ON "IntegrationEvent"("clinicId", "receivedAt");

CREATE INDEX IF NOT EXISTS "IntegrationEvent_status_receivedAt_idx"
  ON "IntegrationEvent"("status", "receivedAt");

CREATE INDEX IF NOT EXISTS "IntegrationEvent_integrationId_idx"
  ON "IntegrationEvent"("integrationId");

DO $$ BEGIN
  ALTER TABLE "IntegrationEvent"
    ADD CONSTRAINT "IntegrationEvent_integrationId_fkey"
    FOREIGN KEY ("integrationId") REFERENCES "Integration"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IntegrationEvent"
    ADD CONSTRAINT "IntegrationEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IntegrationEvent"
    ADD CONSTRAINT "IntegrationEvent_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
