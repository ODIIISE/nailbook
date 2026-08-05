-- Homepage presentation fields.
-- Keep these separate from the salon logo/gallery and let each salon configure them.
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS instagram_handle TEXT DEFAULT '';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS portrait_image_url TEXT;

ALTER TABLE salons ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS instagram_handle TEXT DEFAULT '';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS portrait_image_url TEXT;

ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_key TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Seed the current salon's known Instagram handle without imposing it on other salons.
UPDATE salon_info
SET instagram_handle = 'forehand.nail'
WHERE (instagram_handle IS NULL OR instagram_handle = '')
  AND lower(name) LIKE '%forehand%';

UPDATE salons
SET instagram_handle = 'forehand.nail'
WHERE (instagram_handle IS NULL OR instagram_handle = '')
  AND lower(name) LIKE '%forehand%';

-- Services named «ترمیم» are treated as popular by the homepage until an owner
-- explicitly configures the service toggle. We intentionally do not update every
-- tenant's rows in this migration.
