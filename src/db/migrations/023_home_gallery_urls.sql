-- Homepage gallery: up to 3 customer-facing slideshow slots.
-- JSONB array of URLs; null entries keep the slot position. Owner-managed
-- from settings; the Lux homepage falls back to demo images while empty.
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS home_gallery_urls JSONB DEFAULT NULL;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS home_gallery_urls JSONB DEFAULT NULL;
