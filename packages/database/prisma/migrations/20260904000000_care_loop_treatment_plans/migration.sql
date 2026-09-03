-- AlterEnum
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'NOT_STARTED';
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'UPCOMING';
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
ALTER TYPE "CareTaskStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- AlterTable CarePlanTemplate
ALTER TABLE "CarePlanTemplate" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "CarePlanTemplate" ADD COLUMN IF NOT EXISTS "specialty" TEXT NOT NULL DEFAULT 'FERTILITY';
ALTER TABLE "CarePlanTemplate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CarePlanTemplate" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CarePlanTemplate" ADD COLUMN IF NOT EXISTS "config" JSONB;

-- AlterTable CarePlanTemplateStep
ALTER TABLE "CarePlanTemplateStep" ADD COLUMN IF NOT EXISTS "stageType" TEXT;
ALTER TABLE "CarePlanTemplateStep" ADD COLUMN IF NOT EXISTS "completionStrategy" TEXT NOT NULL DEFAULT 'ALL_REQUIRED_TASKS_COMPLETE';
ALTER TABLE "CarePlanTemplateStep" ADD COLUMN IF NOT EXISTS "config" JSONB;

-- CreateTable CarePlanTemplateTask
CREATE TABLE IF NOT EXISTS "CarePlanTemplateTask" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" TEXT NOT NULL DEFAULT 'PATIENT_TASK',
    "ownerRole" TEXT NOT NULL DEFAULT 'PATIENT',
    "priority" "CareTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "triggerEvent" TEXT,
    "dueTimingDays" INTEGER NOT NULL DEFAULT 0,
    "dueTimingHours" INTEGER,
    "communicationConfig" JSONB,
    "reminderConfig" JSONB,
    "escalationConfig" JSONB,
    "completionCondition" JSONB,
    "requiredAction" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanTemplateTask_pkey" PRIMARY KEY ("id")
);

-- AlterTable CarePlan
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "snapshotData" JSONB;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "pauseReason" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP(3);
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "currentStageIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "currentStageName" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "assignedDoctorId" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "assignedCoordinatorId" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "selectedBranch" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "outcomeNotes" TEXT;
ALTER TABLE "CarePlan" ADD COLUMN IF NOT EXISTS "outcomeRecordedAt" TIMESTAMP(3);

-- AlterTable CarePlanStep
ALTER TABLE "CarePlanStep" ADD COLUMN IF NOT EXISTS "stageType" TEXT;
ALTER TABLE "CarePlanStep" ADD COLUMN IF NOT EXISTS "completionStrategy" TEXT NOT NULL DEFAULT 'ALL_REQUIRED_TASKS_COMPLETE';
ALTER TABLE "CarePlanStep" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "CarePlanStep" ADD COLUMN IF NOT EXISTS "completedById" TEXT;
ALTER TABLE "CarePlanStep" ADD COLUMN IF NOT EXISTS "stageConfig" JSONB;

-- AlterTable CareTask
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "taskType" TEXT NOT NULL DEFAULT 'PATIENT_TASK';
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "ownerRole" TEXT NOT NULL DEFAULT 'PATIENT';
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'TEMPLATE';
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "triggerEvent" TEXT;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "completionCondition" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "completionEvidence" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "escalationState" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "escalationConfig" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "reminderConfig" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "communicationConfig" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "completedBy" TEXT;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "skippedAt" TIMESTAMP(3);
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "skippedReason" TEXT;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3);
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "rescheduledReason" TEXT;
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "originalDueDate" TIMESTAMP(3);
ALTER TABLE "CareTask" ADD COLUMN IF NOT EXISTS "exceptionId" TEXT;

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "CarePlanTemplateTask_templateId_idx" ON "CarePlanTemplateTask"("templateId");
CREATE INDEX IF NOT EXISTS "CarePlanTemplateTask_stepId_idx" ON "CarePlanTemplateTask"("stepId");
CREATE INDEX IF NOT EXISTS "CarePlan_assignedDoctorId_idx" ON "CarePlan"("assignedDoctorId");
CREATE INDEX IF NOT EXISTS "CarePlan_assignedCoordinatorId_idx" ON "CarePlan"("assignedCoordinatorId");
CREATE INDEX IF NOT EXISTS "CareTask_carePlanId_idx" ON "CareTask"("carePlanId");
CREATE INDEX IF NOT EXISTS "CareTask_carePlanStepId_idx" ON "CareTask"("carePlanStepId");

-- AddForeignKeys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanTemplateTask_templateId_fkey') THEN
    ALTER TABLE "CarePlanTemplateTask" ADD CONSTRAINT "CarePlanTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CarePlanTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlanTemplateTask_stepId_fkey') THEN
    ALTER TABLE "CarePlanTemplateTask" ADD CONSTRAINT "CarePlanTemplateTask_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CarePlanTemplateStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_approvedById_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_assignedDoctorId_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CarePlan_assignedCoordinatorId_fkey') THEN
    ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_assignedCoordinatorId_fkey" FOREIGN KEY ("assignedCoordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
