-- Supabase SQL Schema for Promptify Game Sessions
-- Run this in your Supabase SQL Editor to create the table

-- Create the game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Player Information
  player_name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(64), -- Store a hash of API key for security (optional)
  
  -- Timing Information (in milliseconds)
  round1_time INTEGER,
  round2_time INTEGER,
  round3_time INTEGER,
  total_time INTEGER,
  
  -- Round 1 Data (4 sub-rounds)
  round1_prompts JSONB DEFAULT '[]'::jsonb,
  round1_outputs JSONB DEFAULT '[]'::jsonb,
  round1_scores JSONB DEFAULT '[]'::jsonb,
  
  -- Round 2 Data
  round2_prompts JSONB DEFAULT '[]'::jsonb,
  round2_outputs JSONB DEFAULT '[]'::jsonb,
  round2_score INTEGER DEFAULT 0,
  
  -- Round 3 Data
  round3_prompts JSONB DEFAULT '[]'::jsonb,
  round3_outputs JSONB DEFAULT '[]'::jsonb,
  round3_score INTEGER DEFAULT 0,
  
  -- Final Results
  total_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on player_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_name ON game_sessions(player_name);

-- Create an index on total_score for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_total_score ON game_sessions(total_score DESC);

-- Create an index on created_at for recent games
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts from anonymous users
CREATE POLICY "Allow anonymous inserts" ON game_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a policy to allow reads from anonymous users (for leaderboard)
CREATE POLICY "Allow anonymous reads" ON game_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Create a policy to allow updates from anonymous users (for updating their own session)
CREATE POLICY "Allow anonymous updates" ON game_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER update_game_sessions_updated_at
  BEFORE UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample query to get leaderboard (top 10 completed games)
-- SELECT player_name, total_score, total_time, created_at 
-- FROM game_sessions 
-- WHERE completed = true 
-- ORDER BY total_score DESC, total_time ASC 
-- LIMIT 10;
