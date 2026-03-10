-- Fix for the "record 'new' has no field 'updated_at'" error
-- This adds the missing updated_at column to the vocabulary table

ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
