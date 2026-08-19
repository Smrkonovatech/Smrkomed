-- Additive columns/tables the Prisma client already maps, but earlier migrations
-- never created. Required for demo login and onboarding (Prisma SELECTs all scalars).

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");

ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "website" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

DO $$ BEGIN
  CREATE TYPE "ModuleKey" AS ENUM (
    'CARE_LOOP',
    'CRM',
    'APPOINTMENTS',
    'ANALYTICS',
    'BILLING',
    'MARKETING',
    'VOICE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlanKey" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plan" "SubscriptionPlanKey" NOT NULL DEFAULT 'STARTER',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId");

DO $$ BEGIN
  ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrganizationModule" (
  "organizationId" TEXT NOT NULL,
  "module" "ModuleKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationModule_pkey" PRIMARY KEY ("organizationId", "module")
);

DO $$ BEGIN
  ALTER TABLE "OrganizationModule"
    ADD CONSTRAINT "OrganizationModule_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StaffInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clinicId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffInvite_organizationId_idx" ON "StaffInvite"("organizationId");
CREATE INDEX IF NOT EXISTS "StaffInvite_email_idx" ON "StaffInvite"("email");

DO $$ BEGIN
  ALTER TABLE "StaffInvite"
    ADD CONSTRAINT "StaffInvite_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
