-- Migration 014: Multi-role users + add meerzad/mehrdad as owner
-- Goal: a single user record can be both customer and owner simultaneously.
-- Backwards-compatible: the legacy `role TEXT` column is preserved this round.
-- A later cleanup migration can drop `role` once code reads only from `roles`.

ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY['customer']::TEXT[];

-- Backfill: copy legacy role into roles. Owners are granted BOTH customer + owner.
UPDATE users
SET roles = ARRAY['customer']
WHERE roles = ARRAY['customer']::TEXT[] AND role = 'customer';

UPDATE users
SET roles = ARRAY['customer', 'owner']
WHERE role = 'owner';

-- Sanity: every user must always have at least 'customer'.
UPDATE users
SET roles = ARRAY(SELECT DISTINCT unnest(roles || ARRAY['customer']::TEXT[]))
WHERE NOT ('customer' = ANY(roles));

-- Specific row: upsert owner=mehrdad for phone 09357149901.
INSERT INTO users (id, phone, pin, name, roles)
VALUES (
  COALESCE(
    (SELECT id FROM users WHERE phone = '09357149901' LIMIT 1),
    gen_random_uuid()::text
  ),
  '09357149901',
  '',
  'mehrdad',
  ARRAY['customer','owner']::TEXT[]
)
ON CONFLICT (phone) DO UPDATE
SET roles = ARRAY['customer','owner']::TEXT[],
    name = 'mehrdad';

-- Helpful index for owner lookups.
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);
