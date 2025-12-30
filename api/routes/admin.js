/**
 * REIGN API - Admin Routes
 * ============================================
 * Administrative endpoints for user management, analytics, 
 * announcements, and audit logging.
 * 
 * All routes require authentication + admin role.
 * Some routes require superadmin role (e.g., promoting users).
 * 
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/database');

// ============================================
// MIDDLEWARE CHAIN
// ============================================
// All admin routes require: authentication + admin role
// Applied at the router level for all routes below

router.use(auth.authMiddleware);
router.use(auth.adminMiddleware);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * List all users with optional filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by status ('active', 'suspended')
 * - role: Filter by role ('user', 'admin', 'superadmin')
 * - search: Search by name or email
 * - sortBy: Sort field ('createdAt', 'name', 'email') 
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
router.get('/users', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        // Parse query parameters with sensible defaults
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const { status, role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build dynamic query
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (status && ['active', 'suspended'].includes(status)) {
            whereConditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (role && ['user', 'admin', 'superadmin'].includes(role)) {
            whereConditions.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        if (search) {
            whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Validate sort parameters to prevent SQL injection
        const validSortFields = ['created_at', 'name', 'email', 'role', 'status'];
        const sortField = validSortFields.includes(sortBy.replace('At', '_at'))
            ? sortBy.replace('At', '_at')
            : 'created_at';
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Get total count for pagination
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Get paginated users
        const usersResult = await db.query(
            `SELECT id, email, name, avatar_url as avatar, initials, role, status, streak, 
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users 
             ${whereClause}
             ORDER BY ${sortField} ${order}
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, limit, offset]
        );

        res.json({
            users: usersResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });

    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

/**
 * GET /api/admin/users/:id
 * Get detailed user information by ID
 * Includes user data and recent activity
 */
router.get('/users/:id', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;

        // Get user details
        const userResult = await db.query(
            `SELECT id, email, name, avatar_url as avatar, initials, role, status, streak, 
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get user's recent audit logs (last 10 actions)
        const activityResult = await db.query(
            `SELECT action, details, ip_address as "ipAddress", created_at as "createdAt"
             FROM audit_log 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userId]
        );

        // Get user's data sync info
        const syncResult = await db.query(
            `SELECT last_sync as "lastSync" 
             FROM user_data 
             WHERE user_id = $1`,
            [userId]
        );

        // Get user's relationships count
        const relationshipsResult = await db.query(
            `SELECT COUNT(*) as count FROM relationships WHERE user_id = $1`,
            [userId]
        );

        res.json({
            user,
            activity: activityResult.rows,
            syncInfo: syncResult.rows[0] || null,
            stats: {
                relationshipsCount: parseInt(relationshipsResult.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Admin get user error:', error);
        res.status(500).json({ error: 'Failed to get user details' });
    }
});

/**
 * PUT /api/admin/users/:id
 * Update user information (admin action)
 * 
 * Body:
 * - name: New name
 * - email: New email  
 * - role: New role (requires superadmin to change to admin/superadmin)
 * - status: 'active' or 'suspended'
 */
router.put('/users/:id', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;
        const { name, email, role, status } = req.body;

        // Prevent admins from modifying themselves to avoid lockouts
        if (userId === req.user.id && status === 'suspended') {
            return res.status(400).json({ error: 'Cannot suspend your own account' });
        }

        // Role changes to admin/superadmin require superadmin privileges
        if (role && ['admin', 'superadmin'].includes(role) && req.user.role !== 'superadmin') {
            return res.status(403).json({
                error: 'Only superadmins can promote users to admin roles'
            });
        }

        // Validate status
        if (status && !['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use: active, suspended' });
        }

        // Validate role
        const validRoles = ['user', 'admin', 'superadmin'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Use: user, admin, superadmin' });
        }

        // Calculate new initials if name changed
        let initials = null;
        if (name) {
            initials = name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
        }

        const result = await db.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 role = COALESCE($3, role),
                 status = COALESCE($4, status),
                 initials = COALESCE($5, initials),
                 updated_at = now()
             WHERE id = $6
             RETURNING id, email, name, avatar_url as avatar, initials, role, status, streak, 
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [name, email, role, status, initials, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log audit event with admin details
        await auth.logAudit(req.user.id, 'ADMIN_USER_UPDATE', {
            targetUserId: userId,
            changes: { name, email, role, status }
        }, req.ip);

        res.json({
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user account (admin action)
 * Cascades to delete user_data and relationships
 */
router.delete('/users/:id', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;

        // Prevent self-deletion
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account via admin panel' });
        }

        // Get user info before deletion for audit log
        const userResult = await db.query(
            `SELECT email, name, role FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const deletedUser = userResult.rows[0];

        // Prevent deletion of superadmins by non-superadmins
        if (deletedUser.role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                error: 'Only superadmins can delete other superadmins'
            });
        }

        // Delete user (cascades to user_data and relationships due to ON DELETE CASCADE)
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        // Log audit event
        await auth.logAudit(req.user.id, 'ADMIN_USER_DELETE', {
            deletedUserId: userId,
            deletedUserEmail: deletedUser.email,
            deletedUserName: deletedUser.name
        }, req.ip);

        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                id: userId,
                email: deletedUser.email,
                name: deletedUser.name
            }
        });

    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ============================================
// ANALYTICS
// ============================================

/**
 * GET /api/admin/analytics
 * Get platform-wide analytics and statistics
 */
router.get('/analytics', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        // User statistics
        const userStatsResult = await db.query(`
            SELECT 
                COUNT(*) as "totalUsers",
                COUNT(*) FILTER (WHERE status = 'active') as "activeUsers",
                COUNT(*) FILTER (WHERE status = 'suspended') as "suspendedUsers",
                COUNT(*) FILTER (WHERE role = 'admin' OR role = 'superadmin') as "adminUsers",
                COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as "newUsersWeek",
                COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') as "newUsersMonth"
            FROM users
        `);

        // Relationships statistics
        const relStatsResult = await db.query(`
            SELECT 
                COUNT(*) as "totalRelationships",
                COUNT(DISTINCT user_id) as "usersWithRelationships"
            FROM relationships
        `);

        // Sync statistics
        const syncStatsResult = await db.query(`
            SELECT 
                COUNT(*) as "usersWithSyncedData",
                MAX(last_sync) as "lastSyncTime"
            FROM user_data
        `);

        // Recent audit activity (last 24 hours)
        const auditStatsResult = await db.query(`
            SELECT 
                action,
                COUNT(*) as count
            FROM audit_log
            WHERE created_at > now() - interval '24 hours'
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        `);

        // Daily signups trend (last 30 days)
        const signupTrendResult = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as signups
            FROM users
            WHERE created_at > now() - interval '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            users: userStatsResult.rows[0],
            relationships: relStatsResult.rows[0],
            sync: syncStatsResult.rows[0],
            recentActivity: auditStatsResult.rows,
            signupTrend: signupTrendResult.rows,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// ============================================
// ANNOUNCEMENTS
// ============================================

/**
 * GET /api/admin/announcements
 * Get all announcements (active and inactive)
 */
router.get('/announcements', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(`
            SELECT a.id, a.title, a.message, a.target, a.is_active as "isActive",
                   a.created_at as "createdAt", u.name as "createdByName"
            FROM announcements a
            LEFT JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC
        `);

        res.json({ announcements: result.rows });

    } catch (error) {
        console.error('Admin get announcements error:', error);
        res.status(500).json({ error: 'Failed to get announcements' });
    }
});

/**
 * POST /api/admin/announce
 * Create a new announcement
 * 
 * Body:
 * - title: Announcement title (required)
 * - message: Announcement content (required)
 * - target: 'all', 'kings', 'queens' (default: 'all')
 */
router.post('/announce', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const { title, message, target = 'all' } = req.body;

        // Validation
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const validTargets = ['all', 'kings', 'queens'];
        if (!validTargets.includes(target)) {
            return res.status(400).json({
                error: 'Invalid target. Use: all, kings, queens'
            });
        }

        const result = await db.query(
            `INSERT INTO announcements (title, message, target, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, message, target, is_active as "isActive", created_at as "createdAt"`,
            [title.trim(), message.trim(), target, req.user.id]
        );

        // Log audit event
        await auth.logAudit(req.user.id, 'ANNOUNCEMENT_CREATED', {
            announcementId: result.rows[0].id,
            title: title.trim(),
            target
        }, req.ip);

        res.status(201).json({
            message: 'Announcement created successfully',
            announcement: result.rows[0]
        });

    } catch (error) {
        console.error('Admin create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * PUT /api/admin/announcements/:id
 * Update an announcement
 */
router.put('/announcements/:id', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const { title, message, target, isActive } = req.body;
        const announcementId = req.params.id;

        const result = await db.query(
            `UPDATE announcements
             SET title = COALESCE($1, title),
                 message = COALESCE($2, message),
                 target = COALESCE($3, target),
                 is_active = COALESCE($4, is_active)
             WHERE id = $5
             RETURNING id, title, message, target, is_active as "isActive", created_at as "createdAt"`,
            [title, message, target, isActive, announcementId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        res.json({
            message: 'Announcement updated',
            announcement: result.rows[0]
        });

    } catch (error) {
        console.error('Admin update announcement error:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement
 */
router.delete('/announcements/:id', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(
            `DELETE FROM announcements WHERE id = $1 RETURNING id, title`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await auth.logAudit(req.user.id, 'ANNOUNCEMENT_DELETED', {
            announcementId: result.rows[0].id,
            title: result.rows[0].title
        }, req.ip);

        res.json({
            message: 'Announcement deleted',
            id: result.rows[0].id
        });

    } catch (error) {
        console.error('Admin delete announcement error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// ============================================
// AUDIT LOG
// ============================================

/**
 * GET /api/admin/audit
 * Get audit logs with filtering and pagination
 * 
 * Query Parameters:
 * - page, limit: Pagination
 * - userId: Filter by specific user
 * - action: Filter by action type
 * - from, to: Date range (ISO format)
 */
router.get('/audit', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const { userId, action, from, to } = req.query;

        // Build dynamic query
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (userId) {
            whereConditions.push(`a.user_id = $${paramIndex++}`);
            params.push(userId);
        }

        if (action) {
            whereConditions.push(`a.action = $${paramIndex++}`);
            params.push(action);
        }

        if (from) {
            whereConditions.push(`a.created_at >= $${paramIndex++}`);
            params.push(from);
        }

        if (to) {
            whereConditions.push(`a.created_at <= $${paramIndex++}`);
            params.push(to);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM audit_log a ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Get audit logs with user info
        const logsResult = await db.query(
            `SELECT a.id, a.action, a.details, a.ip_address as "ipAddress", 
                    a.created_at as "createdAt",
                    u.id as "userId", u.name as "userName", u.email as "userEmail"
             FROM audit_log a
             LEFT JOIN users u ON a.user_id = u.id
             ${whereClause}
             ORDER BY a.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...params, limit, offset]
        );

        // Get available action types for filtering
        const actionsResult = await db.query(
            `SELECT DISTINCT action FROM audit_log ORDER BY action`
        );

        res.json({
            logs: logsResult.rows,
            availableActions: actionsResult.rows.map(r => r.action),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });

    } catch (error) {
        console.error('Admin get audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
    }
});

// ============================================
// USER ACTIONS (Quick Actions)
// ============================================

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user account
 */
router.post('/users/:id/suspend', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot suspend your own account' });
        }

        const result = await db.query(
            `UPDATE users SET status = 'suspended', updated_at = now()
             WHERE id = $1
             RETURNING id, email, name, status`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await auth.logAudit(req.user.id, 'ADMIN_USER_SUSPENDED', {
            targetUserId: userId,
            targetEmail: result.rows[0].email
        }, req.ip);

        res.json({
            message: 'User suspended',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Admin suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});

/**
 * POST /api/admin/users/:id/unsuspend
 * Unsuspend (reactivate) a user account
 */
router.post('/users/:id/unsuspend', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;

        const result = await db.query(
            `UPDATE users SET status = 'active', updated_at = now()
             WHERE id = $1
             RETURNING id, email, name, status`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await auth.logAudit(req.user.id, 'ADMIN_USER_UNSUSPENDED', {
            targetUserId: userId,
            targetEmail: result.rows[0].email
        }, req.ip);

        res.json({
            message: 'User reactivated',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Admin unsuspend user error:', error);
        res.status(500).json({ error: 'Failed to unsuspend user' });
    }
});

/**
 * POST /api/admin/users/:id/promote
 * Promote a user to admin role
 * Requires superadmin privileges
 */
router.post('/users/:id/promote', auth.superAdminMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;
        const { role = 'admin' } = req.body;

        // Validate role
        if (!['admin', 'superadmin'].includes(role)) {
            return res.status(400).json({ error: 'Can only promote to admin or superadmin' });
        }

        const result = await db.query(
            `UPDATE users SET role = $1, updated_at = now()
             WHERE id = $2
             RETURNING id, email, name, role`,
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await auth.logAudit(req.user.id, 'ADMIN_USER_PROMOTED', {
            targetUserId: userId,
            targetEmail: result.rows[0].email,
            newRole: role
        }, req.ip);

        res.json({
            message: `User promoted to ${role}`,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Admin promote user error:', error);
        res.status(500).json({ error: 'Failed to promote user' });
    }
});

/**
 * POST /api/admin/users/:id/demote
 * Demote a user to regular user role
 * Requires superadmin privileges
 */
router.post('/users/:id/demote', auth.superAdminMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;

        // Prevent self-demotion
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        const result = await db.query(
            `UPDATE users SET role = 'user', updated_at = now()
             WHERE id = $1
             RETURNING id, email, name, role`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        await auth.logAudit(req.user.id, 'ADMIN_USER_DEMOTED', {
            targetUserId: userId,
            targetEmail: result.rows[0].email
        }, req.ip);

        res.json({
            message: 'User demoted to regular user',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Admin demote user error:', error);
        res.status(500).json({ error: 'Failed to demote user' });
    }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset a user's password directly (no email required)
 * 
 * This is the V1 approach - admins can reset passwords directly.
 * The user will receive their new password and must change it on login.
 * 
 * Body:
 * - newPassword: New password to set (optional - generates random if not provided)
 */
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const userId = req.params.id;
        let { newPassword } = req.body;

        // Get user info
        const userResult = await db.query(
            `SELECT id, email, name, role FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = userResult.rows[0];

        // Only superadmins can reset other admin/superadmin passwords
        if (['admin', 'superadmin'].includes(targetUser.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({
                error: 'Only superadmins can reset admin passwords'
            });
        }

        // Generate random password if not provided
        if (!newPassword) {
            const crypto = require('crypto');
            newPassword = crypto.randomBytes(8).toString('hex'); // 16 char random password
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash and update password
        const hashedPassword = await auth.hashPassword(newPassword);
        await db.query(
            `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
            [hashedPassword, userId]
        );

        // Log audit event
        await auth.logAudit(req.user.id, 'ADMIN_PASSWORD_RESET', {
            targetUserId: userId,
            targetEmail: targetUser.email,
            passwordGenerated: !req.body.newPassword
        }, req.ip);

        res.json({
            message: 'Password reset successfully',
            user: {
                id: targetUser.id,
                email: targetUser.email,
                name: targetUser.name
            },
            // Only return the new password if it was auto-generated
            // This allows admin to communicate it to the user securely
            temporaryPassword: !req.body.newPassword ? newPassword : undefined,
            note: 'User should change password on next login'
        });

    } catch (error) {
        console.error('Admin reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
