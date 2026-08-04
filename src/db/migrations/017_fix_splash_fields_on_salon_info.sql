-- Migration 017: Put splash-screen fields on the active salon_info table.
-- Migration 011 accidentally added these columns to the multi-tenant `salons`
-- table, while the salon app reads and writes `salon_info`.
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS splash_title TEXT DEFAULT 'Forehand Nail';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS splash_slogan TEXT DEFAULT 'Nail Art Studio';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS splash_logo_url TEXT;
