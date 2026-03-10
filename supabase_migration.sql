-- Migration: Create user_progress table
-- Run this in your Supabase SQL Editor or via CLI

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  character TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  total_mistakes INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  UNIQUE(user_id, character)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own progress
CREATE POLICY "Users can view their own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_user_progress_user_char 
  ON user_progress(user_id, character);
