-- Consultation summaries for voice notes (text only — never store audio)
CREATE TABLE IF NOT EXISTS "ConsultationNote" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "createdById" TEXT,
    "consultationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "reasonForVisit" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConsultationNote_clinicId_consultationDate_idx" ON "ConsultationNote"("clinicId", "consultationDate");
CREATE INDEX IF NOT EXISTS "ConsultationNote_coupleId_consultationDate_idx" ON "ConsultationNote"("coupleId", "consultationDate");

DO $$ BEGIN
  ALTER TABLE "ConsultationNote" ADD CONSTRAINT "ConsultationNote_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConsultationNote" ADD CONSTRAINT "ConsultationNote_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ConsultationNote" ADD CONSTRAINT "ConsultationNote_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
