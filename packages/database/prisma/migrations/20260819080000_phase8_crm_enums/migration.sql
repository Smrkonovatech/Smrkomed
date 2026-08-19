-- Phase 8: create CRM enums (they were never in earlier migrations), then add
-- extra values in this dedicated migration so they can be used after commit
-- (PostgreSQL restriction on ADD VALUE).

DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM (
    'META',
    'GOOGLE',
    'WEBSITE',
    'WHATSAPP',
    'PHONE',
    'REFERRAL',
    'WALK_IN',
    'INSTAGRAM',
    'FACEBOOK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'CONSULTATION_BOOKED',
    'CONSULTATION_COMPLETED',
    'TREATMENT_DISCUSSION',
    'TREATMENT_STARTED',
    'ACTIVE_PATIENT',
    'LOST'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'META_ADS';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'GOOGLE_ADS';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'ORGANIC';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'CAMPAIGN';

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
