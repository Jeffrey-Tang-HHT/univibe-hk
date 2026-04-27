-- ============================================
-- UniGo HK - V3 Migration: Multi-Photo Support
-- Run in Supabase SQL Editor
-- ============================================

-- Add photos JSONB column (array of URLs, max 5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Migrate existing avatar_url to photos array
UPDATE users SET photos = jsonb_build_array(avatar_url) WHERE avatar_url IS NOT NULL AND avatar_url != '' AND (photos IS NULL OR photos = '[]'::jsonb);

SELECT 'V3 photos migration complete!' AS status;
