-- ╔══════════════════════════════════════════════════════════════╗
-- ║  UniGo HK — Migration V7: Plaza Interiors (scene field)     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Adds a `scene` field to plaza_presence and plaza_bubbles so that the
-- plaza supports walk-in interiors (library / café / social / dating).
-- Players in different scenes are filtered out of each other's lists.
--
-- Idempotent — safe to re-run on Supabase.
-- Apply BEFORE deploying the new client/api code; the API defaults
-- missing `scene` to 'plaza' so existing rows keep working.

-- ─── 1. presence: scene column ───
ALTER TABLE plaza_presence
  ADD COLUMN IF NOT EXISTS scene TEXT NOT NULL DEFAULT 'plaza';

-- Backfill any pre-existing rows (NOT NULL DEFAULT handles new rows;
-- this catches anything that may have skipped the default).
UPDATE plaza_presence SET scene = 'plaza' WHERE scene IS NULL;

-- ─── 2. bubbles: scene column ───
ALTER TABLE plaza_bubbles
  ADD COLUMN IF NOT EXISTS scene TEXT NOT NULL DEFAULT 'plaza';

UPDATE plaza_bubbles SET scene = 'plaza' WHERE scene IS NULL;

-- ─── 3. Indexes for the per-scene get-players / get-bubbles queries ───
-- The hot path is "give me everyone in scene X updated in the last 15s",
-- so we index on (scene, updated_at) and (scene, created_at) respectively.
CREATE INDEX IF NOT EXISTS idx_plaza_presence_scene_updated
  ON plaza_presence(scene, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plaza_bubbles_scene_created
  ON plaza_bubbles(scene, created_at DESC);

-- ─── 4. Allowed-scene check (defence in depth) ───
-- The API also validates against an allowlist, but a CHECK constraint
-- means a buggy client (or a future endpoint we forget to update) can't
-- write garbage scene names.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'plaza_presence_scene_check'
  ) THEN
    ALTER TABLE plaza_presence
      ADD CONSTRAINT plaza_presence_scene_check
      CHECK (scene IN ('plaza', 'library', 'cafe', 'social', 'dating'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'plaza_bubbles_scene_check'
  ) THEN
    ALTER TABLE plaza_bubbles
      ADD CONSTRAINT plaza_bubbles_scene_check
      CHECK (scene IN ('plaza', 'library', 'cafe', 'social', 'dating'));
  END IF;
END $$;

-- ─── 5. (Optional) realtime publication is already on these tables
-- from migration-v6-plaza.sql; new columns are picked up automatically. ───

-- Done.
