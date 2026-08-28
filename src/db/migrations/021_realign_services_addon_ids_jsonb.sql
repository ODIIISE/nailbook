-- Migration 021: realign services.addon_ids to JSONB
--
-- Production (imported from the original schema) has this column as JSONB,
-- while migration 001 declared TEXT[]. All writers send JSON.stringify(...)
-- strings, which are valid JSONB but NOT valid Postgres array literals — on a
-- fresh TEXT[] database every services save fails with 22P02 (malformed array
-- literal). Convert TEXT[] installations to JSONB so the migration lineage
-- matches production. On a database that is already JSONB this rewrite is a
-- value-preserving no-op.
ALTER TABLE services
  ALTER COLUMN addon_ids DROP DEFAULT,
  ALTER COLUMN addon_ids TYPE JSONB USING to_jsonb(addon_ids),
  ALTER COLUMN addon_ids SET DEFAULT '[]'::jsonb;
