-- Insurance & Claims module (manual / demo integration only)

CREATE TYPE "InsurancePolicyStatus" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'PENDING_VERIFICATION',
  'CANCELLED'
);

CREATE TYPE "InsuranceEligibilityStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'NOT_VERIFIED',
  'FAILED'
);

CREATE TYPE "InsuranceClaimStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'QUERY',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'REJECTED',
  'FINAL_BILL_PENDING',
  'PAYMENT_PENDING',
  'PAID',
  'CLOSED'
);

CREATE TYPE "InsuranceClaimType" AS ENUM (
  'CASHLESS',
  'REIMBURSEMENT',
  'PRE_AUTH'
);

CREATE TYPE "InsuranceQueryStatus" AS ENUM (
  'OPEN',
  'RESPONDED',
  'RESOLVED',
  'OVERDUE'
);

CREATE TYPE "InsuranceIntegrationMode" AS ENUM (
  'MANUAL_DEMO',
  'NHCX_NOT_CONNECTED'
);

CREATE TABLE "InsuranceProvider" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "supportContact" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "integrationMode" "InsuranceIntegrationMode" NOT NULL DEFAULT 'MANUAL_DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceTpa" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceTpa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "coupleId" TEXT,
    "providerId" TEXT NOT NULL,
    "tpaId" TEXT,
    "policyName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "memberId" TEXT,
    "policyHolderName" TEXT,
    "relationshipToHolder" TEXT,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "sumInsured" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "availableCoverage" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "networkStatus" TEXT,
    "cashlessStatus" TEXT,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "eligibilityStatus" "InsuranceEligibilityStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "cardDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "coupleId" TEXT,
    "policyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "tpaId" TEXT,
    "claimType" "InsuranceClaimType" NOT NULL DEFAULT 'PRE_AUTH',
    "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "treatmentLabel" TEXT,
    "procedureLabel" TEXT,
    "diagnosisCategory" TEXT,
    "expectedAdmissionDate" TIMESTAMP(3),
    "expectedDischargeDate" TIMESTAMP(3),
    "doctorName" TEXT,
    "assignedCoordinatorId" TEXT,
    "amountRequested" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountApproved" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountRejected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "patientResponsibility" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "preauthSubmittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaimDocument" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceClaimDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceQuery" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "careTaskId" TEXT,
    "message" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "InsuranceQueryStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceQuery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsurancePayment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurancePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaimEvent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT,
    "note" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceClaimEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InsurancePolicy_clinicId_policyNumber_key" ON "InsurancePolicy"("clinicId", "policyNumber");
CREATE UNIQUE INDEX "InsuranceClaim_clinicId_claimNumber_key" ON "InsuranceClaim"("clinicId", "claimNumber");
CREATE UNIQUE INDEX "InsuranceClaimDocument_claimId_documentId_key" ON "InsuranceClaimDocument"("claimId", "documentId");

CREATE INDEX "InsuranceProvider_clinicId_isActive_idx" ON "InsuranceProvider"("clinicId", "isActive");
CREATE INDEX "InsuranceProvider_clinicId_name_idx" ON "InsuranceProvider"("clinicId", "name");
CREATE INDEX "InsuranceTpa_clinicId_isActive_idx" ON "InsuranceTpa"("clinicId", "isActive");
CREATE INDEX "InsuranceTpa_clinicId_name_idx" ON "InsuranceTpa"("clinicId", "name");
CREATE INDEX "InsurancePolicy_clinicId_patientId_idx" ON "InsurancePolicy"("clinicId", "patientId");
CREATE INDEX "InsurancePolicy_clinicId_coupleId_idx" ON "InsurancePolicy"("clinicId", "coupleId");
CREATE INDEX "InsurancePolicy_clinicId_status_idx" ON "InsurancePolicy"("clinicId", "status");
CREATE INDEX "InsurancePolicy_providerId_idx" ON "InsurancePolicy"("providerId");
CREATE INDEX "InsurancePolicy_tpaId_idx" ON "InsurancePolicy"("tpaId");
CREATE INDEX "InsuranceClaim_clinicId_status_idx" ON "InsuranceClaim"("clinicId", "status");
CREATE INDEX "InsuranceClaim_clinicId_patientId_idx" ON "InsuranceClaim"("clinicId", "patientId");
CREATE INDEX "InsuranceClaim_clinicId_coupleId_idx" ON "InsuranceClaim"("clinicId", "coupleId");
CREATE INDEX "InsuranceClaim_clinicId_updatedAt_idx" ON "InsuranceClaim"("clinicId", "updatedAt");
CREATE INDEX "InsuranceClaim_policyId_idx" ON "InsuranceClaim"("policyId");
CREATE INDEX "InsuranceClaim_assignedCoordinatorId_idx" ON "InsuranceClaim"("assignedCoordinatorId");
CREATE INDEX "InsuranceClaimDocument_claimId_idx" ON "InsuranceClaimDocument"("claimId");
CREATE INDEX "InsuranceClaimDocument_documentId_idx" ON "InsuranceClaimDocument"("documentId");
CREATE INDEX "InsuranceQuery_clinicId_status_idx" ON "InsuranceQuery"("clinicId", "status");
CREATE INDEX "InsuranceQuery_claimId_idx" ON "InsuranceQuery"("claimId");
CREATE INDEX "InsuranceQuery_careTaskId_idx" ON "InsuranceQuery"("careTaskId");
CREATE INDEX "InsuranceQuery_assignedToId_idx" ON "InsuranceQuery"("assignedToId");
CREATE INDEX "InsurancePayment_clinicId_claimId_idx" ON "InsurancePayment"("clinicId", "claimId");
CREATE INDEX "InsurancePayment_claimId_idx" ON "InsurancePayment"("claimId");
CREATE INDEX "InsuranceClaimEvent_clinicId_claimId_createdAt_idx" ON "InsuranceClaimEvent"("clinicId", "claimId", "createdAt");
CREATE INDEX "InsuranceClaimEvent_claimId_idx" ON "InsuranceClaimEvent"("claimId");

ALTER TABLE "InsuranceProvider" ADD CONSTRAINT "InsuranceProvider_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceTpa" ADD CONSTRAINT "InsuranceTpa_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "InsuranceTpa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_cardDocumentId_fkey" FOREIGN KEY ("cardDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "InsuranceTpa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_assignedCoordinatorId_fkey" FOREIGN KEY ("assignedCoordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimDocument" ADD CONSTRAINT "InsuranceClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimDocument" ADD CONSTRAINT "InsuranceClaimDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceQuery" ADD CONSTRAINT "InsuranceQuery_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceQuery" ADD CONSTRAINT "InsuranceQuery_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceQuery" ADD CONSTRAINT "InsuranceQuery_careTaskId_fkey" FOREIGN KEY ("careTaskId") REFERENCES "CareTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceQuery" ADD CONSTRAINT "InsuranceQuery_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsurancePayment" ADD CONSTRAINT "InsurancePayment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsurancePayment" ADD CONSTRAINT "InsurancePayment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimEvent" ADD CONSTRAINT "InsuranceClaimEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimEvent" ADD CONSTRAINT "InsuranceClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
