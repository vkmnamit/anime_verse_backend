-- ============================================================
-- SEED BATTLES — Paste this into your Supabase SQL Editor
-- ============================================================
-- Tournament Structure (Tennis-style bracket):
--   Day 1 (Mon): R16 Match 1 + 2
--   Day 2 (Tue): R16 Match 3 + 4
--   Day 3 (Wed): R16 Match 5 + 6
--   Day 4 (Thu): R16 Match 7 + 8
--   Day 5 (Fri): QF Match 1 + 2  ← auto-created from Day 1+2 winners
--   Day 6 (Sat): QF Match 3 + 4  ← auto-created from Day 3+4 winners
--   Day 7 (Sun): SF + FINAL       ← auto-created from QF winners
-- ============================================================

-- Step 1: Add/ensure all required columns (safe, idempotent)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS anime_a_name  TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS anime_b_name  TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS round         INTEGER NOT NULL DEFAULT 1;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS day_number    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'active';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS winner        TEXT    CHECK (winner IN ('A', 'B'));

-- Step 2: Remove any existing name-based battles + their votes (clean slate)
DELETE FROM battle_votes
WHERE battle_id IN (
  SELECT id FROM battles WHERE anime_a_name IS NOT NULL
);
DELETE FROM battles WHERE anime_a_name IS NOT NULL;

-- Step 3: Insert 8 Round-of-16 battles — 2 per day, Days 1–4
--   round=1 = Round of 16
--   Images are fetched live from Kitsu API by the backend
INSERT INTO battles (anime_a_name, anime_b_name, round, day_number, status) VALUES
  -- Day 1 (Monday)
  ('Attack on Titan',   'Demon Slayer',         1, 1, 'active'),
  ('Jujutsu Kaisen',    'One Piece',             1, 1, 'active'),
  -- Day 2 (Tuesday)
  ('Naruto',            'Dragon Ball Z',         1, 2, 'active'),
  ('Hunter x Hunter',   'Fullmetal Alchemist',   1, 2, 'active'),
  -- Day 3 (Wednesday)
  ('Death Note',        'Bleach',                1, 3, 'active'),
  ('Sword Art Online',  'One Punch Man',         1, 3, 'active'),
  -- Day 4 (Thursday)
  ('My Hero Academia',  'Tokyo Ghoul',           1, 4, 'active'),
  ('Steins;Gate',       'Code Geass',            1, 4, 'active');

-- Step 4: Verify — should show 8 rows ordered by day
SELECT id, round, day_number, status,
       anime_a_name AS side_a,
       anime_b_name AS side_b
FROM   battles
WHERE  anime_a_name IS NOT NULL
ORDER  BY day_number, created_at;
