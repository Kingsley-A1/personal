-- Migration: Add feedback table for user feedback collection
-- Run this in CockroachDB console

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
