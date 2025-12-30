/**
 * REIGN API - Session Management Module
 * ============================================
 * Handles refresh tokens, password reset tokens, and session management.
 * Uses the sessions table in CockroachDB for persistent storage.
 * 
 * @module lib/sessions
 */

const crypto = require('crypto');
const db = require('./database');

// ============================================
// CONSTANTS
// ============================================

/** Refresh token expiry (30 days) */
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/** Password reset token expiry (1 hour) */
const RESET_TOKEN_EXPIRY_HOURS = 1;

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a cryptographically secure random token
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
function generateSecureToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for secure storage
 * We store hashed tokens to prevent token theft if DB is compromised
 * @param {string} token - Plain token
 * @returns {string} SHA256 hash of token
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// REFRESH TOKEN MANAGEMENT
// ============================================

/**
 * Create a new refresh token session
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { token, expiresAt }
 */
async function createRefreshToken(userId) {
    if (!db.isConfigured()) {
        throw new Error('Database not configured');
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db.query(
        `INSERT INTO sessions (user_id, refresh_token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );

    return {
        token,
        expiresAt
    };
}

/**
 * Validate a refresh token and get the associated user ID
 * @param {string} token - Refresh token to validate
 * @returns {Promise<string|null>} User ID if valid, null otherwise
 */
async function validateRefreshToken(token) {
    if (!db.isConfigured()) return null;

    const tokenHash = hashToken(token);

    const result = await db.query(
        `SELECT user_id, expires_at 
         FROM sessions 
         WHERE refresh_token = $1 AND expires_at > now()`,
        [tokenHash]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0].user_id;
}

/**
 * Revoke a specific refresh token
 * @param {string} token - Token to revoke
 * @returns {Promise<boolean>} Success status
 */
async function revokeRefreshToken(token) {
    if (!db.isConfigured()) return false;

    const tokenHash = hashToken(token);

    const result = await db.query(
        `DELETE FROM sessions WHERE refresh_token = $1 RETURNING id`,
        [tokenHash]
    );

    return result.rowCount > 0;
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of revoked sessions
 */
async function revokeAllUserSessions(userId) {
    if (!db.isConfigured()) return 0;

    const result = await db.query(
        `DELETE FROM sessions WHERE user_id = $1 RETURNING id`,
        [userId]
    );

    return result.rowCount;
}

/**
 * Clean up expired sessions (maintenance task)
 * @returns {Promise<number>} Number of cleaned sessions
 */
async function cleanExpiredSessions() {
    if (!db.isConfigured()) return 0;

    const result = await db.query(
        `DELETE FROM sessions WHERE expires_at < now() RETURNING id`
    );

    if (result.rowCount > 0) {
        console.log(`🧹 Cleaned ${result.rowCount} expired sessions`);
    }

    return result.rowCount;
}

// ============================================
// PASSWORD RESET TOKEN MANAGEMENT
// ============================================

/**
 * Password reset tokens table (stored in audit_log with special action)
 * We use audit_log to avoid creating another table, with action = 'PASSWORD_RESET_TOKEN'
 * The token hash is stored in details.tokenHash
 */

/**
 * Create a password reset token for a user
 * @param {string} userId - User ID
 * @param {string} email - User email (for reference)
 * @returns {Promise<Object>} { token, expiresAt }
 */
async function createPasswordResetToken(userId, email) {
    if (!db.isConfigured()) {
        throw new Error('Database not configured');
    }

    // Invalidate any existing reset tokens for this user
    await invalidatePasswordResetTokens(userId);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

    // Store in audit_log with special action
    await db.query(
        `INSERT INTO audit_log (user_id, action, details)
         VALUES ($1, 'PASSWORD_RESET_TOKEN', $2)`,
        [userId, JSON.stringify({
            tokenHash,
            email,
            expiresAt: expiresAt.toISOString(),
            used: false
        })]
    );

    return {
        token,
        expiresAt
    };
}

/**
 * Validate a password reset token
 * @param {string} token - Reset token to validate
 * @returns {Promise<Object|null>} { userId, email } if valid, null otherwise
 */
async function validatePasswordResetToken(token) {
    if (!db.isConfigured()) return null;

    const tokenHash = hashToken(token);

    const result = await db.query(
        `SELECT user_id, details 
         FROM audit_log 
         WHERE action = 'PASSWORD_RESET_TOKEN'
         ORDER BY created_at DESC`
    );

    for (const row of result.rows) {
        const details = row.details;

        // Check if token matches, not expired, and not used
        if (details.tokenHash === tokenHash &&
            !details.used &&
            new Date(details.expiresAt) > new Date()) {
            return {
                userId: row.user_id,
                email: details.email
            };
        }
    }

    return null;
}

/**
 * Mark a password reset token as used
 * @param {string} token - Token to mark as used
 * @returns {Promise<boolean>} Success status
 */
async function markPasswordResetTokenUsed(token) {
    if (!db.isConfigured()) return false;

    const tokenHash = hashToken(token);

    // Find the matching token and update it
    const result = await db.query(
        `SELECT id, details 
         FROM audit_log 
         WHERE action = 'PASSWORD_RESET_TOKEN'
         ORDER BY created_at DESC`
    );

    for (const row of result.rows) {
        if (row.details.tokenHash === tokenHash) {
            const updatedDetails = { ...row.details, used: true };
            await db.query(
                `UPDATE audit_log SET details = $1 WHERE id = $2`,
                [JSON.stringify(updatedDetails), row.id]
            );
            return true;
        }
    }

    return false;
}

/**
 * Invalidate all password reset tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function invalidatePasswordResetTokens(userId) {
    if (!db.isConfigured()) return;

    const result = await db.query(
        `SELECT id, details 
         FROM audit_log 
         WHERE user_id = $1 AND action = 'PASSWORD_RESET_TOKEN'`,
        [userId]
    );

    for (const row of result.rows) {
        if (!row.details.used) {
            const updatedDetails = { ...row.details, used: true, invalidated: true };
            await db.query(
                `UPDATE audit_log SET details = $1 WHERE id = $2`,
                [JSON.stringify(updatedDetails), row.id]
            );
        }
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Token generation
    generateSecureToken,
    hashToken,

    // Refresh tokens
    createRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllUserSessions,
    cleanExpiredSessions,

    // Password reset
    createPasswordResetToken,
    validatePasswordResetToken,
    markPasswordResetTokenUsed,
    invalidatePasswordResetTokens
};
