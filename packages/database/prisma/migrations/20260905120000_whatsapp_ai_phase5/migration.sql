-- Phase 5: WhatsApp AI settings, pause flag, richer AIInteraction audit
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "aiPausedAt" TIMESTAMP(3);

ALTER TABLE "WhatsAppClinicSettings" ADD COLUMN IF NOT EXISTS "aiAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "trigger" TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "handoffReason" TEXT;
ALTER TABLE "AIInteraction" ADD COLUMN IF NOT EXISTS "knowledgeSources" JSONB;

CREATE INDEX IF NOT EXISTS "AIInteraction_clinicId_createdAt_idx" ON "AIInteraction"("clinicId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIInteraction_conversationId_idx" ON "AIInteraction"("conversationId");
