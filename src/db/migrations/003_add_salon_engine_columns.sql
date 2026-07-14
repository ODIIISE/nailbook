-- ==========================================
-- Migration: 003_add_salon_engine_columns.sql
-- Purpose: Add booking engine configuration columns to salon_info
-- ==========================================

-- These columns were previously auto-migrated in /api/read/salon
-- Now tracked properly via migration system

ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS early_extra_hours INT DEFAULT 0;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS late_extra_hours INT DEFAULT 0;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS expand_threshold INT DEFAULT 80;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS proximity_window_hours INT DEFAULT 2;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS allow_overflow BOOLEAN DEFAULT false;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS overflow_minutes INT DEFAULT 0;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_interval_minutes INT DEFAULT 15;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_buffer_minutes INT DEFAULT 0;
