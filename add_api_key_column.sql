-- Add gemini_api_key column to game_sessions table
-- Run this in your Supabase SQL Editor

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN game_sessions.gemini_api_key IS 'Stores user Gemini API key (should be encrypted in production)';
