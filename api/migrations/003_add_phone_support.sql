-- Migration: Add phone number support and make email optional
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone STRING(50);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
