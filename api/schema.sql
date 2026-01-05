-- REIGN Database Schema for CockroachDB

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING(255) UNIQUE NOT NULL,
    password_hash STRING(255) NOT NULL,
    name STRING(255) NOT NULL,
    avatar_url STRING,
    initials STRING(2),
    role STRING(50) DEFAULT 'user',
    status STRING(50) DEFAULT 'active',
    streak INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER DATA TABLE (for app data sync)
CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    last_sync TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token STRING(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (refresh_token)
);

-- AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action STRING(100) NOT NULL,
    details JSONB,
    ip_address STRING(45),
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at DESC)
);

-- ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title STRING(255) NOT NULL,
    message STRING NOT NULL,
    target STRING(50) DEFAULT 'all',
    is_active BOOL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_announcements_active (is_active, created_at DESC)
);

-- RELATIONSHIPS TABLE (Rainy Day People)
-- Classification types:
--   burden_bearer: Carries your load when life gets heavy
--   divine_connector: Connects you to purpose, faith, or destiny
--   influential: Shapes your decisions and growth
--   talented: Brings unique gifts and abilities to your life
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name STRING(255) NOT NULL,
    gender STRING(20) NOT NULL,
    purpose STRING(50) NOT NULL,
    classification STRING(50),
    custom_purpose STRING(100),
    what_they_did STRING,
    photo_url STRING,
    contact_info STRING,
    birthday DATE,
    notes STRING,
    is_favorite BOOL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_relationships_user (user_id),
    INDEX idx_relationships_purpose (user_id, purpose),
    INDEX idx_relationships_classification (user_id, classification)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);
