-- ============================================
-- UniGo HK - V5 Migration: Likes, Super Like, Feed, Comments, Polls
-- Run in Supabase SQL Editor
-- ============================================

-- ========== DATING: LIKES + SUPER LIKE ==========

-- Likes table (who liked/super-liked whom)
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_super BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(liker_id, liked_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_liker ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked ON likes(liked_id);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access likes" ON likes;
CREATE POLICY "Service role full access likes" ON likes FOR ALL USING (true) WITH CHECK (true);

-- Super likes daily allowance
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_likes_remaining INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_super_like_reset DATE DEFAULT CURRENT_DATE;

-- ========== FEED: POSTS ==========

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'trending',
  privacy_mode TEXT DEFAULT 'ghost' CHECK (privacy_mode IN ('ghost', 'campus', 'major')),
  image_url TEXT,
  -- Poll fields (null if not a poll)
  poll_question TEXT,
  poll_options JSONB DEFAULT NULL,
  poll_votes JSONB DEFAULT '{}',
  poll_voters JSONB DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access posts" ON posts;
CREATE POLICY "Service role full access posts" ON posts FOR ALL USING (true) WITH CHECK (true);

-- ========== FEED: POST LIKES ==========

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access post_likes" ON post_likes;
CREATE POLICY "Service role full access post_likes" ON post_likes FOR ALL USING (true) WITH CHECK (true);

-- ========== FEED: COMMENTS ==========

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  privacy_mode TEXT DEFAULT 'ghost' CHECK (privacy_mode IN ('ghost', 'campus', 'major')),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access comments" ON comments;
CREATE POLICY "Service role full access comments" ON comments FOR ALL USING (true) WITH CHECK (true);

-- ========== SEED: Insert mock posts so feed works immediately ==========

-- (Only inserts if posts table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM posts LIMIT 1) THEN
    INSERT INTO posts (content, category, privacy_mode, likes_count, comments_count, created_at) VALUES
    ('有冇人覺得今個sem嘅 workload 比上年重好多？我已經連續三日通宵做 assignment 😭', 'trending', 'ghost', 142, 38, now() - interval '2 hours'),
    ('Non-JUPAS 入到 HKU BBA！GPA 3.7，面試準備咗兩個月。有咩想問都可以留言 🎉', 'non-jupas', 'campus', 287, 94, now() - interval '5 hours'),
    ('INFJ 同 ENTP 真係天生一對？我同我 project partner 成日嗌交但又做到好嘢出嚟 😂', 'mbti', 'major', 203, 67, now() - interval '8 hours'),
    ('今日下午3點喺 HKCC 圖書館 2/F 戴黑色 cap 嘅男仔，你跌咗張學生證，我幫你放咗喺 counter 🫣', 'missed', 'ghost', 89, 23, now() - interval '1 hour'),
    ('Big 4 summer intern 月薪 HK$18,000，OT 冇補水但學到好多嘢。值唔值得去？', 'salary', 'campus', 356, 112, now() - interval '12 hours'),
    ('學校飯堂又加價 😤 一碟燒味飯要 $48 係咪搶錢', 'trending', 'ghost', 521, 156, now() - interval '3 hours'),
    ('副學士轉 CUHK CS 嘅經驗分享：Portfolio 比 GPA 更重要，面試問咗好多 project 嘅嘢', 'non-jupas', 'major', 178, 45, now() - interval '1 day'),
    ('MBTI 測試話我係 ENFJ 但我覺得自己好 introverted 🤔 有冇人都係咁？', 'mbti', 'campus', 134, 78, now() - interval '6 hours'),
    ('我偷偷鍾意咗同組嘅 project partner 成個sem，但佢有女朋友... 每次做 group project 都好掙扎 😔', 'confessions', 'ghost', 412, 89, now() - interval '45 minutes'),
    ('考試作弊被抓到但教授冇report，只係同我講「下次唔好再咁」。我到而家都覺得好內疚 😞', 'confessions', 'ghost', 267, 134, now() - interval '4 hours'),
    ('其實我轉咗系三次，爸媽以為我一直讀緊 Business，但我偷偷轉咗去讀 Fine Arts 🎨', 'confessions', 'ghost', 589, 201, now() - interval '10 hours'),
    ('每日都喺圖書館扮溫書，其實係因為唔想返宿舍面對 roommate。好想申請轉房但唔知點開口 🥲', 'confessions', 'ghost', 345, 67, now() - interval '2.5 hours'),
    ('我係全班唯一一個仲未搵到 intern 嘅人，LinkedIn 上面見到同學個個都好叻，自信心跌到谷底 💔', 'confessions', 'ghost', 623, 178, now() - interval '7 hours');
  END IF;
END $$;

SELECT 'V5 migration complete — likes, posts, comments, polls!' AS status;
