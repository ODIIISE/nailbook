-- Run this in Supabase SQL Editor

-- 1. Add priority_score column
ALTER TABLE services ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 5;

-- 2. Set priority scores
UPDATE services SET priority_score = 7 WHERE name = 'ژلیش ناخن';
UPDATE services SET priority_score = 8 WHERE name = 'فرنچ ناخن';
UPDATE services SET priority_score = 10 WHERE name = 'طراحی ناخن';
UPDATE services SET priority_score = 6 WHERE name = 'پدیکور';
UPDATE services SET priority_score = 5 WHERE name = 'ترمیم ناخن';
