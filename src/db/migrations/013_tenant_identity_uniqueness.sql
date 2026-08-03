-- Tenant-aware customer and OTP identity uniqueness.
-- Existing NULL salon_id rows remain available to legacy single-salon mode.

ALTER TABLE otps ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE otps DROP CONSTRAINT IF EXISTS otps_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_phone
ON users (salon_id, phone)
WHERE salon_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_legacy_phone
ON users (phone)
WHERE salon_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_otps_tenant_phone
ON otps (salon_id, phone)
WHERE salon_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_otps_legacy_phone
ON otps (phone)
WHERE salon_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_otps_salon_phone ON otps(salon_id, phone);
