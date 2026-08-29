-- Stage 4: KB metadata + WhatsApp communication settings (additive)

ALTER TABLE "WhatsAppKnowledgeArticle" ADD COLUMN IF NOT EXISTS "keywords" TEXT;
ALTER TABLE "WhatsAppKnowledgeArticle" ADD COLUMN IF NOT EXISTS "specialty" TEXT;

CREATE INDEX IF NOT EXISTS "WhatsAppKnowledgeArticle_clinicId_specialty_idx"
  ON "WhatsAppKnowledgeArticle"("clinicId", "specialty");

CREATE TABLE IF NOT EXISTS "WhatsAppClinicSettings" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "workingHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "maxMessagesPerDay" INTEGER NOT NULL DEFAULT 5,
    "minDelayMinutes" INTEGER NOT NULL DEFAULT 30,
    "requireConsentGranted" BOOLEAN NOT NULL DEFAULT false,
    "urgentBypassHours" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppClinicSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppClinicSettings_clinicId_key" ON "WhatsAppClinicSettings"("clinicId");

ALTER TABLE "WhatsAppClinicSettings"
  DROP CONSTRAINT IF EXISTS "WhatsAppClinicSettings_clinicId_fkey";

ALTER TABLE "WhatsAppClinicSettings"
  ADD CONSTRAINT "WhatsAppClinicSettings_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
