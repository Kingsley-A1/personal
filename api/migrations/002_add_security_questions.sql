-- Migration: Add security questions for self-service password reset
-- Run this in CockroachDB console

-- Add security question columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question STRING(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash STRING(255);

-- Index for faster lookups during password reset
CREATE INDEX IF NOT EXISTS idx_users_security ON users(email) WHERE security_question IS NOT NULL;
