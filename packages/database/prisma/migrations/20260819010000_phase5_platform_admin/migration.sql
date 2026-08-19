-- Phase 5: distinguish SmrkoMed platform admin from customer organization admin.
-- Additive only. Does not rewrite history or drop data.

ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'ORGANIZATION_ADMIN';

DO $$ BEGIN
  CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE';
