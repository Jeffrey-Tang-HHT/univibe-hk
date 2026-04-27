-- ╔══════════════════════════════════════════════════════════════╗
-- ║  UniGo HK — Migration V6: 3D Plaza & Avatar System        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Avatar customization config on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT '{}';

-- Plaza presence — tracks user positions in real-time
CREATE TABLE IF NOT EXISTS plaza_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  z FLOAT DEFAULT 0,
  rotation FLOAT DEFAULT 0,
  zone TEXT DEFAULT 'center',
  is_moving BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat bubbles in 3D space
CREATE TABLE IF NOT EXISTS plaza_bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  x FLOAT DEFAULT 0,
  y FLOAT DEFAULT 0,
  z FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plaza_presence_updated ON plaza_presence(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plaza_bubbles_created ON plaza_bubbles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plaza_bubbles_user ON plaza_bubbles(user_id);

-- Auto-delete old bubbles (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_bubbles() RETURNS trigger AS $$
BEGIN
  DELETE FROM plaza_bubbles WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_bubbles ON plaza_bubbles;
CREATE TRIGGER trigger_cleanup_bubbles
  AFTER INSERT ON plaza_bubbles
  EXECUTE FUNCTION cleanup_old_bubbles();

-- Auto-remove stale presence (offline > 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_presence() RETURNS trigger AS $$
BEGIN
  DELETE FROM plaza_presence WHERE updated_at < now() - interval '30 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_presence ON plaza_presence;
CREATE TRIGGER trigger_cleanup_presence
  AFTER INSERT OR UPDATE ON plaza_presence
  EXECUTE FUNCTION cleanup_stale_presence();

-- Enable realtime for plaza tables
ALTER PUBLICATION supabase_realtime ADD TABLE plaza_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE plaza_bubbles;

-- Add plaza tables to allowed tables (update RLS)
ALTER TABLE plaza_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaza_bubbles ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON plaza_presence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON plaza_bubbles FOR ALL USING (true) WITH CHECK (true);
