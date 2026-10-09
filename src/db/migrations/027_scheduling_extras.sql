-- Migration 027: scheduling policy extras.
-- v-2 reference: free-cancel window, minimum lead time, block reasons,
-- days-off reasons. Breaks need no migration: they live inside the
-- working_hours JSONB day objects ({open, close, breaks: [{start, end}]}),
-- accepted by the update-salon validator and the slot engine.
-- Days-off stay a plain date list (specific_days_off); reasons ride alongside
-- in days_off_reasons so existing readers never break.

ALTER TABLE salons ADD COLUMN IF NOT EXISTS cancel_hours INT NOT NULL DEFAULT 24;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS cancel_hours INT NOT NULL DEFAULT 24;

ALTER TABLE salons ADD COLUMN IF NOT EXISTS lead_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS lead_minutes INT NOT NULL DEFAULT 30;

ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';

ALTER TABLE salons ADD COLUMN IF NOT EXISTS days_off_reasons JSONB NOT NULL DEFAULT '{}';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS days_off_reasons JSONB NOT NULL DEFAULT '{}';
