-- Migration 015: Service images + best_for tags
-- Goal: every service gets an Unsplash stock image as a starting placeholder,
-- and an owner-editable "best for" tag list. Both can be replaced later
-- via the existing /owner/service-manager UI.

-- `image_url` was introduced by the service manager after the initial schema.
-- Add it here before the backfill so a fresh database can run this migration.
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS best_for TEXT[] NOT NULL DEFAULT '{}';

-- Per-category default images (Unsplash CDN; size-adjusted: ?w=800&q=80).
-- Note: the WHERE clause is wrapped to force AND precedence. Without parens,
-- `image_url IS NULL OR image_url = '' AND name ILIKE ...` would treat NULL
-- rows as always-true regardless of name.
DO $$
DECLARE
  img_manicure   TEXT := 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop';
  img_pedicure   TEXT := 'https://images.unsplash.com/photo-1610992015732-2449b76311bc?w=800&q=80&auto=format&fit=crop';
  img_gel        TEXT := 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80&auto=format&fit=crop';
  img_design     TEXT := 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80&auto=format&fit=crop';
  img_extension TEXT := 'https://images.unsplash.com/photo-1571290277304-66a1eea3a8ac?w=800&q=80&auto=format&fit=crop';
  img_polish     TEXT := 'https://images.unsplash.com/photo-1599948128020-9a44505b58b3?w=800&q=80&auto=format&fit=crop';
  img_default    TEXT := 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop';
BEGIN
  UPDATE services SET image_url = img_manicure
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%مانیکور%' OR name ILIKE '%manicure%');
  UPDATE services SET image_url = img_pedicure
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%پدیکور%' OR name ILIKE '%pedicure%');
  UPDATE services SET image_url = img_gel
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%ژل%' OR name ILIKE '%gel%');
  UPDATE services SET image_url = img_design
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%طراح%' OR name ILIKE '%design%' OR name ILIKE '%هنر%' OR name ILIKE '%art%');
  UPDATE services SET image_url = img_extension
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%کاشت%' OR name ILIKE '%اکریل%' OR name ILIKE '%acrylic%' OR name ILIKE '%لمینت%');
  UPDATE services SET image_url = img_polish
    WHERE (image_url IS NULL OR image_url = '')
      AND (name ILIKE '%رنگ%' OR name ILIKE '%لاک%' OR name ILIKE '%polish%');
  UPDATE services SET image_url = img_default
    WHERE image_url IS NULL OR image_url = '';
END $$;
