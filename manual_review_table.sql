-- Create submissions table for manual review of Round 2 and Round 3
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS manual_review_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to game session
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  
  -- Round information
  round_number INTEGER NOT NULL, -- 2 or 3
  sub_round_id VARCHAR(50), -- e.g., "2a", "2b", "3a"
  
  -- Submission data
  user_prompt TEXT NOT NULL,
  gemini_output TEXT NOT NULL,
  
  -- For Round 3 HTML uploads
  html_file_url TEXT, -- URL to uploaded HTML file in storage
  
  -- Manual scoring (to be filled by judges)
  manual_score INTEGER DEFAULT NULL, -- Score assigned by judge
  judge_comments TEXT, -- Optional feedback from judge
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by VARCHAR(255), -- Judge username
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  attempt_number INTEGER DEFAULT 1,
  target_reference TEXT -- Store what they were trying to achieve
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_session ON manual_review_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round ON manual_review_submissions(round_number);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed ON manual_review_submissions(reviewed);
CREATE INDEX IF NOT EXISTS idx_submissions_player ON manual_review_submissions(player_name);

-- Enable Row Level Security
ALTER TABLE manual_review_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for leaderboard/review dashboard)
DROP POLICY IF EXISTS "Allow public read submissions" ON manual_review_submissions;
CREATE POLICY "Allow public read submissions" ON manual_review_submissions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow anyone to insert (submit entries)
DROP POLICY IF EXISTS "Allow public insert submissions" ON manual_review_submissions;
CREATE POLICY "Allow public insert submissions" ON manual_review_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to update (for judges to add scores)
DROP POLICY IF EXISTS "Allow public update submissions" ON manual_review_submissions;
CREATE POLICY "Allow public update submissions" ON manual_review_submissions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE manual_review_submissions;

COMMENT ON TABLE manual_review_submissions IS 'Stores Round 2 and Round 3 submissions for manual judging';
COMMENT ON COLUMN manual_review_submissions.manual_score IS 'Score from 0-30 (or 0-15 for single sub-round)';
