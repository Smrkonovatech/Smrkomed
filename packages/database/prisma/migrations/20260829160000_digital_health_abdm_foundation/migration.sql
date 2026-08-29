-- Stage 7: Digital Health / ABHA / ABDM foundation (additive)

CREATE TYPE "AbhaLinkStatus" AS ENUM (
  'NOT_LINKED',
  'PENDING',
  'LINKED',
  'VERIFICATION_REQUIRED',
  'ERROR'
);

CREATE TYPE "DigitalHealthConsentStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'REJECTED'
);

CREATE TYPE "HealthRecordExchangeStatus" AS ENUM (
  'DRAFT',
  'CONSENT_REQUIRED',
  'CONSENT_GRANTED',
  'PREPARING',
  'PREPARED',
  'SHARING',
  'SHARED',
  'FAILED',
  'EXPIRED',
  'REVOKED'
);

CREATE TABLE "DigitalHealthIdentity" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "abhaNumberHash" TEXT,
  "abhaMasked" TEXT,
  "abhaAddress" TEXT,
  "status" "AbhaLinkStatus" NOT NULL DEFAULT 'NOT_LINKED',
  "verificationStatus" TEXT,
  "linkedAt" TIMESTAMP(3),
  "lastVerifiedAt" TIMESTAMP(3),
  "source" TEXT,
  "sandboxMode" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DigitalHealthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DigitalHealthIdentity_patientId_key" ON "DigitalHealthIdentity"("patientId");
CREATE UNIQUE INDEX "DigitalHealthIdentity_clinicId_abhaNumberHash_key" ON "DigitalHealthIdentity"("clinicId", "abhaNumberHash");
CREATE INDEX "DigitalHealthIdentity_clinicId_status_idx" ON "DigitalHealthIdentity"("clinicId", "status");

ALTER TABLE "DigitalHealthIdentity"
  ADD CONSTRAINT "DigitalHealthIdentity_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DigitalHealthIdentity"
  ADD CONSTRAINT "DigitalHealthIdentity_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DigitalHealthConsent" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "requestedById" TEXT,
  "requestedByName" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "dataCategories" JSONB NOT NULL,
  "status" "DigitalHealthConsentStatus" NOT NULL DEFAULT 'PENDING',
  "externalConsentId" TEXT,
  "careTaskId" TEXT,
  "notes" TEXT,
  "decidedAt" TIMESTAMP(3),
  "sandboxMode" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DigitalHealthConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DigitalHealthConsent_clinicId_status_idx" ON "DigitalHealthConsent"("clinicId", "status");
CREATE INDEX "DigitalHealthConsent_patientId_status_idx" ON "DigitalHealthConsent"("patientId", "status");
CREATE INDEX "DigitalHealthConsent_clinicId_expiresAt_idx" ON "DigitalHealthConsent"("clinicId", "expiresAt");

ALTER TABLE "DigitalHealthConsent"
  ADD CONSTRAINT "DigitalHealthConsent_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DigitalHealthConsent"
  ADD CONSTRAINT "DigitalHealthConsent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DigitalHealthConsent"
  ADD CONSTRAINT "DigitalHealthConsent_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "HealthRecordExchange" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "consentId" TEXT,
  "status" "HealthRecordExchangeStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT NOT NULL,
  "recordTypes" JSONB NOT NULL,
  "dateFrom" TIMESTAMP(3),
  "dateTo" TIMESTAMP(3),
  "receivingEntity" TEXT,
  "preparedPayload" JSONB,
  "idempotencyKey" TEXT NOT NULL,
  "externalReferenceId" TEXT,
  "failureReason" TEXT,
  "sandboxMode" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "preparedAt" TIMESTAMP(3),
  "sharedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HealthRecordExchange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HealthRecordExchange_clinicId_idempotencyKey_key" ON "HealthRecordExchange"("clinicId", "idempotencyKey");
CREATE INDEX "HealthRecordExchange_clinicId_status_idx" ON "HealthRecordExchange"("clinicId", "status");
CREATE INDEX "HealthRecordExchange_patientId_status_idx" ON "HealthRecordExchange"("patientId", "status");

ALTER TABLE "HealthRecordExchange"
  ADD CONSTRAINT "HealthRecordExchange_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthRecordExchange"
  ADD CONSTRAINT "HealthRecordExchange_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HealthRecordExchange"
  ADD CONSTRAINT "HealthRecordExchange_consentId_fkey"
  FOREIGN KEY ("consentId") REFERENCES "DigitalHealthConsent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HealthRecordExchange"
  ADD CONSTRAINT "HealthRecordExchange_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
