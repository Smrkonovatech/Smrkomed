-- WhatsApp Automation Center: Flows + Knowledge Base (additive)

CREATE TYPE "WhatsAppFlowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WhatsAppFlowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ESCALATED');
CREATE TYPE "WhatsAppFlowStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "WhatsAppKnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "WhatsAppFlow" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WhatsAppFlowStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerType" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "isLibrary" BOOLEAN NOT NULL DEFAULT false,
    "libraryKey" TEXT,
    "createdById" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppFlowExecution" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "status" "WhatsAppFlowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" TEXT NOT NULL,
    "triggerEventId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "patientId" TEXT,
    "coupleId" TEXT,
    "conversationId" TEXT,
    "currentNodeId" TEXT,
    "context" JSONB,
    "error" TEXT,
    "resumeAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppFlowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppFlowExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" "WhatsAppFlowStepStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppFlowExecutionStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppKnowledgeArticle" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "WhatsAppKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppKnowledgeArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppFlowExecution_clinicId_idempotencyKey_key" ON "WhatsAppFlowExecution"("clinicId", "idempotencyKey");
CREATE INDEX "WhatsAppFlow_clinicId_status_idx" ON "WhatsAppFlow"("clinicId", "status");
CREATE INDEX "WhatsAppFlow_clinicId_triggerType_idx" ON "WhatsAppFlow"("clinicId", "triggerType");
CREATE INDEX "WhatsAppFlow_clinicId_libraryKey_idx" ON "WhatsAppFlow"("clinicId", "libraryKey");
CREATE INDEX "WhatsAppFlowExecution_clinicId_status_idx" ON "WhatsAppFlowExecution"("clinicId", "status");
CREATE INDEX "WhatsAppFlowExecution_flowId_status_idx" ON "WhatsAppFlowExecution"("flowId", "status");
CREATE INDEX "WhatsAppFlowExecution_clinicId_resumeAt_idx" ON "WhatsAppFlowExecution"("clinicId", "resumeAt");
CREATE INDEX "WhatsAppFlowExecution_patientId_idx" ON "WhatsAppFlowExecution"("patientId");
CREATE INDEX "WhatsAppFlowExecution_conversationId_idx" ON "WhatsAppFlowExecution"("conversationId");
CREATE INDEX "WhatsAppFlowExecutionStep_executionId_idx" ON "WhatsAppFlowExecutionStep"("executionId");
CREATE INDEX "WhatsAppKnowledgeArticle_clinicId_status_idx" ON "WhatsAppKnowledgeArticle"("clinicId", "status");
CREATE INDEX "WhatsAppKnowledgeArticle_clinicId_category_idx" ON "WhatsAppKnowledgeArticle"("clinicId", "category");

ALTER TABLE "WhatsAppFlow" ADD CONSTRAINT "WhatsAppFlow_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppFlow" ADD CONSTRAINT "WhatsAppFlow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppFlowExecution" ADD CONSTRAINT "WhatsAppFlowExecution_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppFlowExecution" ADD CONSTRAINT "WhatsAppFlowExecution_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "WhatsAppFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppFlowExecutionStep" ADD CONSTRAINT "WhatsAppFlowExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WhatsAppFlowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppKnowledgeArticle" ADD CONSTRAINT "WhatsAppKnowledgeArticle_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppKnowledgeArticle" ADD CONSTRAINT "WhatsAppKnowledgeArticle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
