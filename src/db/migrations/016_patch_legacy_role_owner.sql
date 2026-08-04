-- Migration 016: Sync legacy role column owner flag into roles[] array.
-- Symptom that motivated this: a fresh install can produce the rows pattern
-- | phone  | role       | roles             |
-- | 093xx  | customer   | {customer}        |   (verify-otp created this as a customer)
-- | 093yy  | owner      | {customer,owner}  |   (manual /api/owner/users POST)
-- Where migration 014's specific upsert only fires for phones it explicitly
-- names (09357149901); any other phone that gets role='owner' set later has
-- role='owner' but roles[] = {customer} because no code path keeps them in
-- sync after the initial insert.
--
-- Fix: idempotent UPDATE that appends 'owner' to roles[] when legacy role is
-- 'owner' but 'owner' isn't already in the array. Also: enforce every user
-- has 'customer' in roles[] for the invariant the rest of the code assumes.

UPDATE users
SET roles = ARRAY(SELECT DISTINCT unnest(roles || ARRAY['owner']::TEXT[]))
WHERE "role" = 'owner' AND NOT ('owner' = ANY(roles));

UPDATE users
SET roles = ARRAY(SELECT DISTINCT unnest(roles || ARRAY['customer']::TEXT[]))
WHERE NOT ('customer' = ANY(roles));

-- Sanity log so the operator can see what changed (run separately if you
-- want audit; comment out for hot prod path).
-- SELECT phone, name, "role", roles FROM users WHERE "role" = 'owner' OR 'owner' = ANY(roles);
