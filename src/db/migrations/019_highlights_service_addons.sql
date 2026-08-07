-- ==========================================
-- Migration: 019_highlights_service_addons.sql
-- Purpose: Complete the bookable lookbook — highlights now attach a
-- service (added in 012) AND a set of addons, so the customer sheet can
-- show the combined price + duration and book it in one tap.
-- ==========================================

-- Mirrors services.addon_ids (jsonb array of addon UUIDs); written via
-- JSON.stringify and read back as a plain string array.
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS addon_ids JSONB NOT NULL DEFAULT '[]';
