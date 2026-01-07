/**
 * King Daily API - Authentication Routes
 * Register, Login, Profile management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../lib/auth');
const {
    registerValidation,
    loginValidation,
    passwordChangeValidation,
    profileUpdateValidation,
    passwordResetRequestValidation,
    passwordResetValidation,
    securityQuestionValidation
} = require('../middleware/validators');

// Configure multer for avatar uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 }, // 500KB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    }
});

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', registerValidation, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Create user (validation already done by middleware)
        const user = await auth.createUser({ name, email, password });

        // Generate token
        const token = auth.generateToken({ userId: user.id });


        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user,
            token
        });
    } catch (error) {
        if (error.message === 'Account already registered' || error.message === 'Email already registered') {
            return res.status(409).json({ success: false, error: error.message });
        }
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Failed to create account' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 * 
 * Body: { email: string, password: string, rememberMe?: boolean }
 */
router.post('/login', loginValidation, async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        // Find user (validation done by middleware)
        const user = await auth.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // Verify password
        const isValid = await auth.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // Generate token with conditional expiry (10d for rememberMe, 1d default)
        const token = auth.generateToken({ userId: user.id }, !!rememberMe);

        // Return user without password
        const { password: _, ...safeUser } = user;

        res.json({
            success: true,
            message: 'Login successful',
            user: safeUser,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});


/**
 * GET /api/auth/profile
 * Get current user profile (requires auth)
 */
router.get('/profile', auth.authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile
 * Update user profile (requires auth)
 */
router.put('/profile', auth.authMiddleware, profileUpdateValidation, async (req, res) => {
    try {
        const { name } = req.body;
        const updates = {};

        if (name) updates.name = name;

        // Await required - async database update
        const user = await auth.updateUser(req.user.id, updates);

        res.json({
            message: 'Profile updated',
            user
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * POST /api/auth/avatar
 * Upload user avatar (requires auth)
 */
router.post('/avatar', auth.authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        /**
         * Avatar Storage Strategy:
         * - If R2 is configured in the future, upload there
         * - For now, store as base64 data URL in database
         * - This is acceptable for small avatars (<500KB limit)
         */
        const avatarKey = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Update user profile (await required - async database update)
        const user = await auth.updateUser(req.user.id, { avatar: avatarKey });

        res.json({
            message: 'Avatar uploaded',
            user,
            avatarKey
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

/**
 * DELETE /api/auth/avatar
 * Remove user avatar (requires auth)
 */
router.delete('/avatar', auth.authMiddleware, async (req, res) => {
    try {
        // Await required - async database update
        const user = await auth.updateUser(req.user.id, { avatar: null });


        res.json({
            message: 'Avatar removed',
            user
        });
    } catch (error) {
        console.error('Avatar delete error:', error);
        res.status(500).json({ error: 'Failed to remove avatar' });
    }
});

/**
 * PUT /api/auth/password
 * Change user password (requires auth)
 */
router.put('/password', auth.authMiddleware, passwordChangeValidation, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get full user with password (validation done by middleware)
        const fullUser = await auth.findUserById(req.user.id, true);
        if (!fullUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        const isValid = await auth.verifyPassword(currentPassword, fullUser.password);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Update password (updateUser will hash it internally)
        await auth.updateUser(req.user.id, { password: newPassword });


        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});

/**
 * DELETE /api/auth/account
 * Delete user account (requires auth)
 */
router.delete('/account', auth.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Remove user from storage (await required - async database delete)
        // Note: If R2 storage is added later, delete avatar files here too
        await auth.deleteUser(userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Account delete error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ============================================
// PASSWORD RESET FLOW
// ============================================

const sessions = require('../lib/sessions');
const email = require('../lib/email');

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 * 
 * Body: { email: string }
 * 
 * Note: Always returns success to prevent email enumeration attacks
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email: userEmail } = req.body;

        if (!userEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const user = await auth.findUserByEmail(userEmail);

        // SECURITY: Always return success to prevent email enumeration
        // But only actually send email if user exists
        if (user) {
            // Create reset token
            const { token, expiresAt } = await sessions.createPasswordResetToken(
                user.id,
                userEmail
            );

            // Build reset URL (frontend must handle this route)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

            // Send email
            await email.sendPasswordResetEmail(
                userEmail,
                user.name || 'User',
                token,
                resetUrl
            );

            // Log audit event
            await auth.logAudit(user.id, 'PASSWORD_RESET_REQUESTED', {
                email: userEmail
            }, req.ip);
        }

        // Always return same response (security measure)
        res.json({
            message: 'If an account exists with that email, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        // Still return success message for security
        res.json({
            message: 'If an account exists with that email, a password reset link has been sent.'
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 * 
 * Body: { token: string, newPassword: string }
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Reset token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        // Validate the reset token
        const tokenData = await sessions.validatePasswordResetToken(token);

        if (!tokenData) {
            return res.status(400).json({
                error: 'Invalid or expired reset token. Please request a new one.'
            });
        }

        // Hash new password and update user
        const hashedPassword = await auth.hashPassword(newPassword);
        await auth.updateUser(tokenData.userId, { password: hashedPassword });

        // Mark token as used
        await sessions.markPasswordResetTokenUsed(token);

        // Revoke all existing sessions (logout from all devices)
        await sessions.revokeAllUserSessions(tokenData.userId);

        // Log audit event
        await auth.logAudit(tokenData.userId, 'PASSWORD_RESET_COMPLETED', {
            email: tokenData.email
        }, req.ip);

        res.json({
            message: 'Password reset successfully. Please login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ============================================
// REFRESH TOKEN FLOW
// ============================================

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 * 
 * Body: { refreshToken: string }
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Validate refresh token
        const userId = await sessions.validateRefreshToken(refreshToken);

        if (!userId) {
            return res.status(401).json({
                error: 'Invalid or expired refresh token. Please login again.'
            });
        }

        // Get user data
        const user = await auth.findUserById(userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new access token
        const newAccessToken = auth.generateToken({ userId: user.id });

        res.json({
            message: 'Token refreshed',
            token: newAccessToken,
            user
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token (logout from current device)
 * 
 * Body: { refreshToken: string }
 */
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await sessions.revokeRefreshToken(refreshToken);
        }

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        // Still return success - logout should always appear to work
        res.json({ message: 'Logged out successfully' });
    }
});

/**
 * POST /api/auth/logout-all
 * Invalidate all refresh tokens (logout from all devices)
 * Requires authentication
 */
router.post('/logout-all', auth.authMiddleware, async (req, res) => {
    try {
        const revokedCount = await sessions.revokeAllUserSessions(req.user.id);

        await auth.logAudit(req.user.id, 'LOGOUT_ALL_DEVICES', {
            sessionsRevoked: revokedCount
        }, req.ip);

        res.json({
            message: 'Logged out from all devices',
            sessionsRevoked: revokedCount
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ error: 'Failed to logout from all devices' });
    }
});

/**
 * PUT /api/auth/security-question
 * Set or update security question (requires auth)
 */
router.put('/security-question', auth.authMiddleware, async (req, res) => {
    try {
        const { question, answer, password } = req.body;
        const userId = req.user.id;

        if (!question || !answer || !password) {
            return res.status(400).json({ error: 'Question, answer, and current password are required' });
        }

        // Verify password
        const user = await auth.findUserById(userId, true);
        const isValid = await auth.verifyPassword(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Hash the answer for security
        // We use a simplified hash for answers to allow case-insensitive comparison if needed later
        // But strong hashing is best practice.
        const answerHash = await auth.hashPassword(answer.toLowerCase().trim());

        // Update user
        const db = require('../lib/database');
        await db.query(
            `UPDATE users 
             SET security_question = $1, 
                 security_answer_hash = $2,
                 updated_at = now()
             WHERE id = $3`,
            [question, answerHash, userId]
        );

        await auth.logAudit(userId, 'SECURITY_QUESTION_UPDATED', {}, req.ip);

        res.json({ message: 'Security question updated successfully' });

    } catch (error) {
        console.error('Update security question error:', error);
        res.status(500).json({ error: 'Failed to update security question' });
    }
});

/**
 * POST /api/auth/get-security-question
 * Get key security question by email (public endpoint)
 */
router.post('/get-security-question', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }

        const user = await auth.findUserByEmail(email);

        // Security: Don't reveal if user exists or not if they don't have a question set
        // But if they have a question, return it.
        // We add a random delay to prevent timing attacks
        await new Promise(r => setTimeout(r, Math.random() * 200 + 100));

        if (!user) {
            return res.status(404).json({ error: 'User not found or no security question set' });
        }

        // Fetch question directly
        const db = require('../lib/database');
        const result = await db.query(
            `SELECT security_question FROM users WHERE id = $1`,
            [user.id]
        );

        if (!result.rows[0] || !result.rows[0].security_question) {
            return res.status(404).json({ error: 'User not found or no security question set' });
        }

        res.json({ question: result.rows[0].security_question });

    } catch (error) {
        console.error('Get security question error:', error);
        res.status(500).json({ error: 'Failed to retrieve security question' });
    }
});

/**
 * POST /api/auth/reset-password-security
 * Reset password using security answer
 */
router.post('/reset-password-security', async (req, res) => {
    try {
        const { email, answer, newPassword } = req.body;

        if (!email || !answer || !newPassword) {
            return res.status(400).json({ error: 'Email, answer, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await auth.findUserByEmail(email);
        if (!user) {
            // Fake work to prevent timing enumeration
            await auth.hashPassword('dummy');
            return res.status(401).json({ error: 'Invalid security answer' });
        }

        // Get stored hash
        const db = require('../lib/database');
        const result = await db.query(
            `SELECT security_answer_hash FROM users WHERE id = $1`,
            [user.id]
        );

        const storedHash = result.rows[0]?.security_answer_hash;

        if (!storedHash) {
            return res.status(401).json({ error: 'Security question not set up for this account' });
        }

        // Validate answer
        const isValid = await auth.verifyPassword(answer.toLowerCase().trim(), storedHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid security answer' });
        }

        // Reset Password
        const hashedPassword = await auth.hashPassword(newPassword);
        await db.query(
            `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
            [hashedPassword, user.id]
        );

        // Revoke all sessions
        await sessions.revokeAllUserSessions(user.id);

        await auth.logAudit(user.id, 'PASSWORD_RESET_VIA_SECURITY_QUESTION', {}, req.ip);

        res.json({ message: 'Password reset successfully. Please login with your new password.' });

    } catch (error) {
        console.error('Security reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
