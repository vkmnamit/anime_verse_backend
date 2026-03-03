-- ============================================================
-- SEED BATTLES — Paste this into your Supabase SQL Editor
-- ============================================================

-- Step 1: Add round + status + winner columns to battles (safe, won't break existing data)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS round   INTEGER NOT NULL DEFAULT 1;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS status  TEXT    NOT NULL DEFAULT 'active';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS winner  TEXT    CHECK (winner IN ('A', 'B'));

-- Step 2: Upsert 16 anime into the anime table
INSERT INTO anime (id, title, cover_image, popularity, average_score, genres, status)
VALUES
  ('battle-anime-01','Attack on Titan',      'https://media.kitsu.app/anime/poster_images/7442/large.jpg',  100, 9.0, ARRAY['Action','Drama'],       'finished'),
  ('battle-anime-02','Demon Slayer',          'https://media.kitsu.app/anime/poster_images/41370/large.jpg', 99,  8.7, ARRAY['Action','Fantasy'],      'finished'),
  ('battle-anime-03','Jujutsu Kaisen',        'https://media.kitsu.app/anime/poster_images/44081/large.jpg', 98,  8.6, ARRAY['Action','Supernatural'], 'current'),
  ('battle-anime-04','One Piece',             'https://media.kitsu.app/anime/poster_images/11/large.jpg',    97,  8.9, ARRAY['Action','Adventure'],    'current'),
  ('battle-anime-05','Naruto',                'https://media.kitsu.app/anime/poster_images/12/large.jpg',    96,  8.3, ARRAY['Action','Adventure'],    'finished'),
  ('battle-anime-06','Dragon Ball Z',         'https://media.kitsu.app/anime/poster_images/1254/large.jpg',  95,  8.2, ARRAY['Action','Adventure'],    'finished'),
  ('battle-anime-07','Hunter x Hunter',       'https://media.kitsu.app/anime/poster_images/6448/large.jpg',  94,  9.1, ARRAY['Action','Adventure'],    'finished'),
  ('battle-anime-08','Fullmetal Alchemist',   'https://media.kitsu.app/anime/poster_images/6/large.jpg',     93,  9.2, ARRAY['Action','Drama'],        'finished'),
  ('battle-anime-09','Death Note',            'https://media.kitsu.app/anime/poster_images/1376/large.jpg',  92,  9.0, ARRAY['Mystery','Thriller'],    'finished'),
  ('battle-anime-10','Bleach',                'https://media.kitsu.app/anime/poster_images/13/large.jpg',    91,  8.1, ARRAY['Action','Supernatural'], 'current'),
  ('battle-anime-11','Sword Art Online',      'https://media.kitsu.app/anime/poster_images/7472/large.jpg',  90,  7.9, ARRAY['Action','Fantasy'],      'current'),
  ('battle-anime-12','One Punch Man',         'https://media.kitsu.app/anime/poster_images/11469/large.jpg', 89,  8.7, ARRAY['Action','Comedy'],       'finished'),
  ('battle-anime-13','My Hero Academia',      'https://media.kitsu.app/anime/poster_images/13881/large.jpg', 88,  8.3, ARRAY['Action','Superhero'],    'current'),
  ('battle-anime-14','Tokyo Ghoul',           'https://media.kitsu.app/anime/poster_images/7711/large.jpg',  87,  7.8, ARRAY['Action','Horror'],       'finished'),
  ('battle-anime-15','Steins;Gate',           'https://media.kitsu.app/anime/poster_images/5646/large.jpg',  86,  9.3, ARRAY['Sci-Fi','Thriller'],     'finished'),
  ('battle-anime-16','Code Geass',            'https://media.kitsu.app/anime/poster_images/2186/large.jpg',  85,  9.0, ARRAY['Action','Mecha'],        'finished')
ON CONFLICT (id) DO UPDATE
  SET title         = EXCLUDED.title,
      cover_image   = EXCLUDED.cover_image,
      popularity    = EXCLUDED.popularity,
      average_score = EXCLUDED.average_score,
      genres        = EXCLUDED.genres,
      status        = EXCLUDED.status;

-- Step 3: Remove any stale tournament battles + their votes, then re-insert fresh R1
DELETE FROM battle_votes
WHERE battle_id IN (
  SELECT id FROM battles WHERE anime_a LIKE 'battle-anime-%'
);
DELETE FROM battles WHERE anime_a LIKE 'battle-anime-%';

INSERT INTO battles (anime_a, anime_b, round, status) VALUES
  ('battle-anime-01', 'battle-anime-02', 1, 'active'),   -- Attack on Titan  vs Demon Slayer
  ('battle-anime-03', 'battle-anime-04', 1, 'active'),   -- Jujutsu Kaisen   vs One Piece
  ('battle-anime-05', 'battle-anime-06', 1, 'active'),   -- Naruto           vs Dragon Ball Z
  ('battle-anime-07', 'battle-anime-08', 1, 'active'),   -- Hunter x Hunter  vs Fullmetal Alchemist
  ('battle-anime-09', 'battle-anime-10', 1, 'active'),   -- Death Note       vs Bleach
  ('battle-anime-11', 'battle-anime-12', 1, 'active'),   -- Sword Art Online vs One Punch Man
  ('battle-anime-13', 'battle-anime-14', 1, 'active'),   -- My Hero Academia vs Tokyo Ghoul
  ('battle-anime-15', 'battle-anime-16', 1, 'active');   -- Steins;Gate      vs Code Geass

-- Step 4: Verify — should show 8 rows
SELECT b.id, b.round, b.status,
       a.title AS side_a, c.title AS side_b
FROM   battles b
JOIN   anime a ON a.id = b.anime_a
JOIN   anime c ON c.id = b.anime_b
ORDER  BY b.round, b.created_at;
