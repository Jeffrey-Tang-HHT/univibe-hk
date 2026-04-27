-- ============================================
-- UniGo HK - Chat System Setup
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ============================================

-- Matches table: who matched with whom
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'unmatched')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  last_message_at TIMESTAMPTZ,
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- Messages table: chat messages between matched users
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'emoji')),
  voice_duration INTEGER,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: service role can do everything
CREATE POLICY "Service role full access matches" ON matches
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Anon key policies (for client-side realtime subscriptions)
-- Users can only see their own matches
CREATE POLICY "Users see own matches" ON matches
  FOR SELECT USING (
    auth.uid()::text = user1_id::text OR auth.uid()::text = user2_id::text
  );

-- Users can only see messages from their matches
CREATE POLICY "Users see own messages" ON messages
  FOR SELECT USING (
    match_id IN (
      SELECT id FROM matches
      WHERE user1_id::text = auth.uid()::text OR user2_id::text = auth.uid()::text
    )
  );

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Auto-update last_message_at on matches when a new message is sent
CREATE OR REPLACE FUNCTION update_match_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE matches SET last_message_at = NEW.created_at WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_match_last_message ON messages;
CREATE TRIGGER trigger_update_match_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_match_last_message();

-- Auto-expire matches after 48 hours with no messages
CREATE OR REPLACE FUNCTION expire_stale_matches()
RETURNS void AS $$
BEGIN
  UPDATE matches
  SET status = 'expired'
  WHERE status = 'active'
    AND last_message_at IS NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

SELECT 'UniGo HK chat system setup complete!' AS status;
