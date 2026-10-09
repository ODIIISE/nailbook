-- Migration 026: customer notification prefs + internal notes.
-- v-2 reference: SMS/offer toggles on the profile, internal customer notes,
-- per-booking notes. All additive with safe defaults.

ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_reminders BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS offers BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
