-- 0. Drop the old mismatched table
DROP TABLE IF EXISTS user_progress CASCADE;

-- 1. Create perfect table schema
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  character TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  total_mistakes INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  UNIQUE(user_id, character)
);

-- 2. Explicitly enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 3. Safely drop existing policies if they were misconfigured
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;

-- 4. Re-create perfect policies
CREATE POLICY "Users can view their own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Add performance index
CREATE INDEX IF NOT EXISTS idx_user_progress_user_char 
  ON user_progress(user_id, character);
