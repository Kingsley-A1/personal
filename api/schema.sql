-- REIGN Database Schema for CockroachDB
-- This schema includes all migrations and is the canonical source of truth
-- Last synced: January 2025

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING(255) UNIQUE,  -- Can be NULL if phone is provided
    phone STRING(50),          -- Added in migration 003
    password_hash STRING(255) NOT NULL,
    name STRING(255) NOT NULL,
    avatar_url STRING,
    initials STRING(2),
    role STRING(50) DEFAULT 'user',
    status STRING(50) DEFAULT 'active',
    streak INT DEFAULT 0,
    -- Security questions (migration 002)
    security_question STRING(255),
    security_answer_hash STRING(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- USER DATA TABLE (for app data sync)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    last_sync TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ==========================================
-- SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token STRING(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (refresh_token)
);

-- ==========================================
-- PASSWORD RESET TOKENS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash STRING(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_reset_tokens_user (user_id),
    INDEX idx_reset_tokens_hash (token_hash)
);

-- ==========================================
-- GOALS TABLE (migration 005)
-- ==========================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title STRING(255) NOT NULL,
    description STRING,
    category STRING(50) NOT NULL,
    type STRING(20) NOT NULL CHECK (type IN ('yearly', 'monthly', 'weekly')),
    parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    target_date DATE,
    status STRING(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    notes STRING,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_goals_user (user_id),
    INDEX idx_goals_type (user_id, type),
    INDEX idx_goals_status (user_id, status),
    INDEX idx_goals_parent (parent_goal_id)
);

-- ==========================================
-- GOAL REVIEWS TABLE (migration 005)
-- ==========================================
CREATE TABLE IF NOT EXISTS goal_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_type STRING(20) NOT NULL CHECK (review_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    goals_completed INT DEFAULT 0,
    goals_total INT DEFAULT 0,
    wins STRING,
    challenges STRING,
    lessons STRING,
    next_focus STRING,
    mood INT CHECK (mood >= 1 AND mood <= 5),
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_reviews_user (user_id, review_type),
    INDEX idx_reviews_period (user_id, period_start DESC)
);

-- ==========================================
-- FEEDBACK TABLE (migration 004)
-- ==========================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name STRING(255) NOT NULL,
    email STRING(255) NOT NULL,
    message STRING NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    persona STRING(20),
    page_context STRING(100),
    status STRING(50) DEFAULT 'pending',
    admin_notes STRING,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_feedback_status (status, created_at DESC),
    INDEX idx_feedback_user (user_id)
);

-- ==========================================
-- AUDIT LOG TABLE
-- ==========================================
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

-- ==========================================
-- ANNOUNCEMENTS TABLE
-- ==========================================
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

-- ==========================================
-- RELATIONSHIPS TABLE (Rainy Day People)
-- ==========================================
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

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_security ON users(email) WHERE security_question IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_category ON goals(user_id, category);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON user_data(user_id, last_sync);
