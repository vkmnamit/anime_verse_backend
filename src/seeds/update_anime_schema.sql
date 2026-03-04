-- Add missing columns to anime table
ALTER TABLE anime ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS popularity_rank INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS rating_rank INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS user_count INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS age_rating TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS poster_image TEXT;

-- Use API ID as a constraint if needed, but for now we have title
ALTER TABLE anime DROP CONSTRAINT IF EXISTS anime_title_key;
ALTER TABLE anime ADD CONSTRAINT anime_title_key UNIQUE (title);
