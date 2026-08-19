-- Phase 3: additive tenant foundation (roles + audit organizationId).
-- Clinic.organizationId remains the required tenant FK (already ON DELETE RESTRICT).

ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'COUNSELOR';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'READ_ONLY';

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_organizationId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
