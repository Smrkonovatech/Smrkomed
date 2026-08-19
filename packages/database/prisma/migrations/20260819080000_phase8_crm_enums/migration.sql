-- Phase 8: add enum values in a dedicated migration so they can be used
-- after this transaction commits (PostgreSQL restriction on ADD VALUE).

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'META_ADS';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'GOOGLE_ADS';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'ORGANIC';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'CAMPAIGN';

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
