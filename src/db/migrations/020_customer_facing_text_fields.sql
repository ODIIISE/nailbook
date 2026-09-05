-- Editable customer-facing copy. Every piece of brand text shown to customers
-- (homepage hero, primary CTA, trust micro-line, lookbook heading, booking
-- success title) becomes owner-editable via /owner/settings. Defaults mirror
-- the values that were previously hardcoded, so existing rows render unchanged.
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS homepage_kicker TEXT DEFAULT 'Welcome to';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS homepage_cta_label TEXT DEFAULT 'شروع رزرو';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS homepage_micro TEXT DEFAULT 'بدون تماس تلفنی · زمان‌های آزاد همین‌جا';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS lookbook_title TEXT DEFAULT 'نمونه‌کارها';
ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS booking_success_title TEXT DEFAULT 'به‌زودی می‌بینیمت!';

ALTER TABLE salons ADD COLUMN IF NOT EXISTS homepage_kicker TEXT DEFAULT 'Welcome to';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS homepage_cta_label TEXT DEFAULT 'شروع رزرو';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS homepage_micro TEXT DEFAULT 'بدون تماس تلفنی · زمان‌های آزاد همین‌جا';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS lookbook_title TEXT DEFAULT 'نمونه‌کارها';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS booking_success_title TEXT DEFAULT 'به‌زودی می‌بینیمت!';
