-- Add session_version column for session revocation support
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 0;
