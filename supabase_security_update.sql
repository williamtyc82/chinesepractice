-- Migration: Secure Vocabulary Table RLS
-- Run this in your Supabase SQL Editor (https://app.supabase.com/)

-- 1. Remove the old permissive policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vocabulary;

-- 2. Anyone can view the words (public read access)
-- This allows the app to fetch vocabulary even if not logged in
CREATE POLICY "Anyone can view vocabulary" ON vocabulary
  FOR SELECT USING (true);

-- 3. Only admins can modify (replace with your actual admin email if different)
-- This policy checks the email in the user's JWT token
CREATE POLICY "Admins can modify vocabulary" ON vocabulary
  FOR ALL 
  USING (auth.jwt() ->> 'email' = 'williamtyc82@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'williamtyc82@gmail.com');
