-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WhatsAppMediaType" AS ENUM ('AUDIO', 'IMAGE', 'VIDEO', 'DOCUMENT', 'STICKER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WhatsAppMediaStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'READY', 'FAILED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsAppMedia" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'WHATSAPP_CLOUD',
    "providerMediaId" TEXT NOT NULL,
    "type" "WhatsAppMediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filename" TEXT,
    "caption" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageKey" TEXT,
    "status" "WhatsAppMediaStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "durationSeconds" INTEGER,
    "isVoice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMedia_messageId_key" ON "WhatsAppMedia"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMedia_clinicId_providerMediaId_key" ON "WhatsAppMedia"("clinicId", "providerMediaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMedia_clinicId_status_idx" ON "WhatsAppMedia"("clinicId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMedia_conversationId_idx" ON "WhatsAppMedia"("conversationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppMedia_providerMediaId_idx" ON "WhatsAppMedia"("providerMediaId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WhatsAppMedia" ADD CONSTRAINT "WhatsAppMedia_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WhatsAppMedia" ADD CONSTRAINT "WhatsAppMedia_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "WhatsAppMedia" ADD CONSTRAINT "WhatsAppMedia_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
