-- ============================================
-- UniGo HK - V4 Migration: Chat Image Messages
-- Run in Supabase SQL Editor
-- ============================================

-- Add image_url column for image messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update type constraint to allow 'image'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'voice', 'emoji', 'image'));

-- Create storage bucket for chat images (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Public chat image access" ON storage.objects FOR ALL USING (bucket_id = 'chat-images') WITH CHECK (bucket_id = 'chat-images');

SELECT 'V4 chat image migration complete!' AS status;
