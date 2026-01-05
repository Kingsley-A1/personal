/**
 * REIGN API - Feedback Routes
 * Handles user feedback submission and admin management
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const auth = require('../lib/auth');

// ============================================
// PUBLIC ENDPOINTS
// ============================================

/**
 * POST /api/feedback
 * Submit user feedback (works for logged in and anonymous users)
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, message, rating, persona, pageContext } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Get user ID from token if logged in
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = auth.verifyToken(token);
                userId = decoded.userId;
            } catch (e) {
                // Token invalid, proceed as anonymous
            }
        }

        // Insert feedback
        const result = await db.query(`
            INSERT INTO feedback (user_id, name, email, message, rating, persona, page_context)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, created_at
        `, [userId, name, email, message, rating || null, persona || null, pageContext || null]);

        res.status(201).json({
            message: 'Thank you for your feedback! We appreciate you taking the time to help us improve.',
            feedbackId: result.rows[0].id,
            createdAt: result.rows[0].created_at
        });

    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// ============================================
// ADMIN ENDPOINTS (require admin auth)
// ============================================

/**
 * GET /api/feedback
 * List all feedback (admin only)
 */
router.get('/', auth.requireAdmin, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                f.*,
                u.name as user_account_name,
                r.name as reviewer_name
            FROM feedback f
            LEFT JOIN users u ON f.user_id = u.id
            LEFT JOIN users r ON f.reviewed_by = r.id
        `;

        const params = [];

        if (status) {
            query += ` WHERE f.status = $1`;
            params.push(status);
        }

        query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM feedback';
        if (status) {
            countQuery += ' WHERE status = $1';
        }
        const countResult = await db.query(countQuery, status ? [status] : []);

        res.json({
            feedback: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Fetch feedback error:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (admin only)
 */
router.get('/stats', auth.requireAdmin, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                ROUND(AVG(rating)::numeric, 1) as avg_rating
            FROM feedback
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Fetch feedback stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * PUT /api/feedback/:id/status
 * Update feedback status (admin only)
 */
router.put('/:id/status', auth.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const validStatuses = ['pending', 'reviewed', 'resolved', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await db.query(`
            UPDATE feedback 
            SET status = $1, 
                admin_notes = COALESCE($2, admin_notes),
                reviewed_by = $3,
                reviewed_at = now()
            WHERE id = $4
            RETURNING *
        `, [status, adminNotes, req.user.id, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ message: 'Status updated', feedback: result.rows[0] });

    } catch (error) {
        console.error('Update feedback status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * DELETE /api/feedback/:id
 * Delete feedback (admin only)
 */
router.delete('/:id', auth.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query('DELETE FROM feedback WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ message: 'Feedback deleted' });

    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

module.exports = router;
