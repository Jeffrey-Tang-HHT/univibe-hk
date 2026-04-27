-- Add deleted_by column to messages table (tracks which users deleted a message "for me")
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by jsonb DEFAULT '[]'::jsonb;

-- Done! Now messages can track per-user deletion.
