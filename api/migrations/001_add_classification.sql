-- REIGN Database Migration: Add Classification to Relationships
-- Run this if you already have the relationships table

-- Add classification column
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS classification STRING(50);

-- Add index for classification queries
CREATE INDEX IF NOT EXISTS idx_relationships_classification ON relationships(user_id, classification);

-- Verify the column was added
-- Run: SELECT column_name FROM information_schema.columns WHERE table_name = 'relationships';
