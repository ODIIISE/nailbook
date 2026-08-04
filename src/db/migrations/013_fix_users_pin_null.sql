-- ==========================================
-- Migration: 013_fix_users_pin_null.sql
-- Purpose: Make users.pin nullable with an empty-string default so existing
--          and new INSERT statements that don't provide a pin no longer fail.
--          The pin column is currently unused by the OTP/customer flow.
-- ==========================================

ALTER TABLE users ALTER COLUMN pin SET DEFAULT '';
ALTER TABLE users ALTER COLUMN pin DROP NOT NULL;
