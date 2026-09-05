-- Enable Smrko AI auto-reply for clinics that still have the old default (off).
-- Clinics that intentionally turn it off after this deploy can disable in WhatsApp Settings.
UPDATE "WhatsAppClinicSettings" SET "aiAutoReplyEnabled" = true WHERE "aiAutoReplyEnabled" = false;
