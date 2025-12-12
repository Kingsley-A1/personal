/**
 * King Daily API - Authentication Routes
 * Register, Login, Profile management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../lib/auth');
const r2 = require('../lib/r2');

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
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Create user
        const user = await auth.createUser({ name, email, password });

        // Generate token
        const token = auth.generateToken({ userId: user.id });

        // Save users to R2 if configured
        await auth.saveUsersToR2(r2);

        res.status(201).json({
            message: 'Account created successfully',
            user,
            token
        });
    } catch (error) {
        if (error.message === 'Email already registered') {
            return res.status(409).json({ error: error.message });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = auth.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValid = await auth.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = auth.generateToken({ userId: user.id });

        // Return user without password
        const { password: _, ...safeUser } = user;

        res.json({
            message: 'Login successful',
            user: safeUser,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
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
router.put('/profile', auth.authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const updates = {};

        if (name) updates.name = name;

        const user = auth.updateUser(req.user.id, updates);

        // Save to R2
        await auth.saveUsersToR2(r2);

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

        // Upload to R2
        let avatarKey = null;
        if (r2.isConfigured()) {
            avatarKey = await r2.uploadAvatar(req.user.id, req.file.buffer, req.file.mimetype);
        } else {
            // Store as base64 if R2 not configured
            avatarKey = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        // Update user profile
        const user = auth.updateUser(req.user.id, { avatar: avatarKey });

        // Save to R2
        await auth.saveUsersToR2(r2);

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
        const user = auth.updateUser(req.user.id, { avatar: null });

        await auth.saveUsersToR2(r2);

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
router.put('/password', auth.authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get full user with password
        const fullUser = auth.findUserById(req.user.id, true);
        if (!fullUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await auth.verifyPassword(currentPassword, fullUser.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password and update
        const hashedPassword = await auth.hashPassword(newPassword);
        auth.updateUser(req.user.id, { password: hashedPassword });

        // Save to R2
        await auth.saveUsersToR2(r2);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * DELETE /api/auth/account
 * Delete user account (requires auth)
 */
router.delete('/account', auth.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete user data from R2
        if (r2.isConfigured()) {
            await r2.deleteUserData(userId);
        }

        // Remove user from storage
        auth.deleteUser(userId);

        // Save updated users to R2
        await auth.saveUsersToR2(r2);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Account delete error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;
