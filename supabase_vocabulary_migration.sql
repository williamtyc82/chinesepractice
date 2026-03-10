-- ============================================================
-- Vocabulary table for P4 Chinese words
-- ============================================================

CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  meaning TEXT NOT NULL,
  chapter TEXT,
  image_url TEXT,
  image_status TEXT DEFAULT 'pending' CHECK (image_status IN ('pending', 'generating', 'done', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups by word
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);

-- Index for chapter filtering
CREATE INDEX IF NOT EXISTS idx_vocabulary_chapter ON vocabulary(chapter);

-- Enable RLS
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin use)
CREATE POLICY "Allow all for authenticated users" ON vocabulary
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vocabulary_updated_at
  BEFORE UPDATE ON vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
