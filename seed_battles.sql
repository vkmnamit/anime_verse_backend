-- ============================================================
-- SEED BATTLES — Paste this into your Supabase SQL Editor
-- ============================================================
-- Battles store ONLY anime names (text). Images are fetched
-- live from Kitsu API by the backend at request time.
-- No FK to the anime table is needed.
-- ============================================================

-- Step 1: Add new name columns + round/status/winner (safe, idempotent)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS anime_a_name  TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS anime_b_name  TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS round         INTEGER NOT NULL DEFAULT 1;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'active';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS winner        TEXT    CHECK (winner IN ('A', 'B'));

-- Step 2: Remove any existing name-based battles + their votes
DELETE FROM battle_votes
WHERE battle_id IN (
  SELECT id FROM battles
  WHERE anime_a_name IS NOT NULL
);
DELETE FROM battles
WHERE anime_a_name IS NOT NULL;

-- Step 3: Insert 8 Round 1 battles (name only — backend fetches images from Kitsu)
INSERT INTO battles (anime_a_name, anime_b_name, round, status) VALUES
  ('Attack on Titan',    'Demon Slayer',          1, 'active'),
  ('Jujutsu Kaisen',     'One Piece',             1, 'active'),
  ('Naruto',             'Dragon Ball Z',          1, 'active'),
  ('Hunter x Hunter',    'Fullmetal Alchemist',    1, 'active'),
  ('Death Note',         'Bleach',                1, 'active'),
  ('Sword Art Online',   'One Punch Man',          1, 'active'),
  ('My Hero Academia',   'Tokyo Ghoul',            1, 'active'),
  ('Steins;Gate',        'Code Geass',            1, 'active');

-- Step 4: Verify — should show 8 rows
SELECT id, round, status,
       anime_a_name AS side_a,
       anime_b_name AS side_b
FROM   battles
WHERE  anime_a_name IS NOT NULL
ORDER  BY round, created_at;
