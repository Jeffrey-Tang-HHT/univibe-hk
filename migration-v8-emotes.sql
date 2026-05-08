-- ╔══════════════════════════════════════════════════════════════╗
-- ║  UniGo HK — Migration V8: Networked Emotes                  ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Adds the two emote columns referenced by api/plaza.mjs (v7) so the
-- networked-emote feature actually persists between heartbeats.
--
-- The v7 CHANGELOG documented this SQL inline but no migration file
-- shipped — this catches it up. Idempotent, safe to re-run on Supabase.
-- Apply BEFORE deploying v7 client/api code (or alongside; the API
-- defaults missing values to null/0 so old rows keep working).

-- ─── 1. presence: emote columns ───
ALTER TABLE plaza_presence
  ADD COLUMN IF NOT EXISTS emote TEXT;

ALTER TABLE plaza_presence
  ADD COLUMN IF NOT EXISTS emote_start_ms BIGINT NOT NULL DEFAULT 0;

-- ─── 2. Allowed-emote check (defence in depth) ───
-- The API also validates against an allowlist, but a CHECK constraint
-- means a buggy or rogue client can't write garbage emote names.
-- Mirror VALID_EMOTES in api/plaza.mjs and EMOTES in Avatar3D.tsx.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'plaza_presence_emote_check'
  ) THEN
    ALTER TABLE plaza_presence
      ADD CONSTRAINT plaza_presence_emote_check
      CHECK (emote IS NULL OR emote IN (
        'wave', 'dance', 'clap', 'bow', 'cheer', 'sit', 'point'
      ));
  END IF;
END $$;

-- ─── 3. Index on (scene, emote) ───
-- Most reads filter by scene first; emote is mostly null. Partial
-- index on non-null rows keeps it tiny and only helps the actually-
-- emoting subset, which is the only case worth indexing.
CREATE INDEX IF NOT EXISTS idx_plaza_presence_scene_emoting
  ON plaza_presence(scene, updated_at DESC)
  WHERE emote IS NOT NULL;

-- Done.
