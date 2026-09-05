-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "pendingAction" JSONB;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "pendingActionExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsAppBookingIdempotency" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppBookingIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppBookingIdempotency_clinicId_key_key" ON "WhatsAppBookingIdempotency"("clinicId", "key");
CREATE INDEX IF NOT EXISTS "WhatsAppBookingIdempotency_appointmentId_idx" ON "WhatsAppBookingIdempotency"("appointmentId");
CREATE INDEX IF NOT EXISTS "WhatsAppBookingIdempotency_clinicId_createdAt_idx" ON "WhatsAppBookingIdempotency"("clinicId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "WhatsAppBookingIdempotency" ADD CONSTRAINT "WhatsAppBookingIdempotency_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
