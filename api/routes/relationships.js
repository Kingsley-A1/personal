/**
 * REIGN API - Relationships Routes
 * "People who hold your hand on rainy days"
 * Manage meaningful relationships in your life
 */

const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/database');

// Relationship purpose types (who they are to you)
const RELATIONSHIP_PURPOSES = [
    'partner',
    'child',
    'parent',
    'sibling',
    'colleague',
    'business_partner',
    'mentor',
    'friend',
    'other'
];

// Relationship classifications (what they do for you)
const RELATIONSHIP_CLASSIFICATIONS = [
    'burden_bearer',      // Carries your load when life gets heavy
    'divine_connector',   // Connects you to purpose, faith, or destiny
    'influential',        // Shapes your decisions and growth
    'talented'            // Brings unique gifts and abilities to your life
];

// ==========================================
// GET ALL RELATIONSHIPS
// ==========================================

/**
 * GET /api/relationships
 * Get all relationships for the current user
 */
router.get('/', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const { purpose, favorite, classification } = req.query;

        let query = `
            SELECT id, name, gender, purpose, classification, custom_purpose as "customPurpose",
                   what_they_did as "whatTheyDid", photo_url as "photoUrl",
                   contact_info as "contactInfo", birthday, notes, is_favorite as "isFavorite",
                   created_at as "createdAt", updated_at as "updatedAt"
            FROM relationships 
            WHERE user_id = $1
        `;
        const params = [req.user.id];

        // Filter by purpose if provided
        if (purpose && RELATIONSHIP_PURPOSES.includes(purpose)) {
            query += ` AND purpose = $${params.length + 1}`;
            params.push(purpose);
        }

        // Filter by classification if provided
        if (classification && RELATIONSHIP_CLASSIFICATIONS.includes(classification)) {
            query += ` AND classification = $${params.length + 1}`;
            params.push(classification);
        }

        // Filter favorites only
        if (favorite === 'true') {
            query += ` AND is_favorite = true`;
        }

        query += ` ORDER BY is_favorite DESC, name ASC`;

        const result = await db.query(query, params);

        // Group by classification for frontend
        const groupedByClassification = {};
        for (const rel of result.rows) {
            if (rel.classification) {
                if (!groupedByClassification[rel.classification]) {
                    groupedByClassification[rel.classification] = [];
                }
                groupedByClassification[rel.classification].push(rel);
            }
        }

        // Group by purpose for frontend
        const grouped = {};
        for (const rel of result.rows) {
            const purposeKey = rel.purpose;
            if (!grouped[purposeKey]) {
                grouped[purposeKey] = [];
            }
            grouped[purposeKey].push(rel);
        }

        res.json({
            relationships: result.rows,
            grouped,
            groupedByClassification,
            total: result.rows.length,
            purposes: RELATIONSHIP_PURPOSES,
            classifications: RELATIONSHIP_CLASSIFICATIONS
        });
    } catch (error) {
        console.error('Get relationships error:', error);
        res.status(500).json({ error: 'Failed to get relationships' });
    }
});

// ==========================================
// GET STATISTICS (must be before /:id route)
// ==========================================

/**
 * GET /api/relationships/stats/summary
 * Get relationship statistics
 */
router.get('/stats/summary', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_favorite = true) as favorites,
                COUNT(*) FILTER (WHERE purpose = 'partner') as partners,
                COUNT(*) FILTER (WHERE purpose = 'child') as children,
                COUNT(*) FILTER (WHERE purpose = 'parent') as parents,
                COUNT(*) FILTER (WHERE purpose = 'sibling') as siblings,
                COUNT(*) FILTER (WHERE purpose = 'colleague') as colleagues,
                COUNT(*) FILTER (WHERE purpose = 'business_partner') as "businessPartners",
                COUNT(*) FILTER (WHERE purpose = 'mentor') as mentors,
                COUNT(*) FILTER (WHERE purpose = 'friend') as friends,
                COUNT(*) FILTER (WHERE purpose = 'other') as others
             FROM relationships 
             WHERE user_id = $1`,
            [req.user.id]
        );

        res.json({ stats: result.rows[0] });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// ==========================================
// GET SINGLE RELATIONSHIP
// ==========================================

/**
 * GET /api/relationships/:id
 * Get a specific relationship
 */
router.get('/:id', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(
            `SELECT id, name, gender, purpose, classification, custom_purpose as "customPurpose",
                    what_they_did as "whatTheyDid", photo_url as "photoUrl",
                    contact_info as "contactInfo", birthday, notes, is_favorite as "isFavorite",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM relationships 
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relationship not found' });
        }

        res.json({ relationship: result.rows[0] });
    } catch (error) {
        console.error('Get relationship error:', error);
        res.status(500).json({ error: 'Failed to get relationship' });
    }
});

// ==========================================
// CREATE RELATIONSHIP
// ==========================================

/**
 * POST /api/relationships
 * Add a new relationship
 */
router.post('/', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const {
            name,
            gender,
            purpose,
            classification,
            customPurpose,
            whatTheyDid,
            photoUrl,
            contactInfo,
            birthday,
            notes,
            isFavorite
        } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({ error: 'Valid gender is required (male, female, other)' });
        }

        if (!purpose || !RELATIONSHIP_PURPOSES.includes(purpose)) {
            return res.status(400).json({
                error: 'Valid purpose is required',
                validPurposes: RELATIONSHIP_PURPOSES
            });
        }

        // Validate classification if provided
        if (classification && !RELATIONSHIP_CLASSIFICATIONS.includes(classification)) {
            return res.status(400).json({
                error: 'Invalid classification',
                validClassifications: RELATIONSHIP_CLASSIFICATIONS
            });
        }

        const result = await db.query(
            `INSERT INTO relationships (
                user_id, name, gender, purpose, classification, custom_purpose, what_they_did, 
                photo_url, contact_info, birthday, notes, is_favorite
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, name, gender, purpose, classification, custom_purpose as "customPurpose",
                       what_they_did as "whatTheyDid", photo_url as "photoUrl",
                       contact_info as "contactInfo", birthday, notes, is_favorite as "isFavorite",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [
                req.user.id,
                name.trim(),
                gender,
                purpose,
                classification || null,
                purpose === 'other' ? customPurpose : null,
                whatTheyDid || null,
                photoUrl || null,
                contactInfo || null,
                birthday || null,
                notes || null,
                isFavorite || false
            ]
        );

        // Log audit
        await auth.logAudit(req.user.id, 'RELATIONSHIP_CREATED', {
            relationshipId: result.rows[0].id,
            name: name.trim(),
            purpose
        });

        res.status(201).json({
            message: 'Relationship added successfully',
            relationship: result.rows[0]
        });
    } catch (error) {
        console.error('Create relationship error:', error);
        res.status(500).json({ error: 'Failed to add relationship' });
    }
});

// ==========================================
// UPDATE RELATIONSHIP
// ==========================================

/**
 * PUT /api/relationships/:id
 * Update a relationship
 */
router.put('/:id', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const {
            name,
            gender,
            purpose,
            classification,
            customPurpose,
            whatTheyDid,
            photoUrl,
            contactInfo,
            birthday,
            notes,
            isFavorite
        } = req.body;

        // Check if relationship exists and belongs to user
        const existing = await db.query(
            'SELECT id FROM relationships WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Relationship not found' });
        }

        const result = await db.query(
            `UPDATE relationships SET
                name = COALESCE($1, name),
                gender = COALESCE($2, gender),
                purpose = COALESCE($3, purpose),
                classification = $4,
                custom_purpose = $5,
                what_they_did = $6,
                photo_url = $7,
                contact_info = $8,
                birthday = $9,
                notes = $10,
                is_favorite = COALESCE($11, is_favorite),
                updated_at = now()
             WHERE id = $12 AND user_id = $13
             RETURNING id, name, gender, purpose, classification, custom_purpose as "customPurpose",
                       what_they_did as "whatTheyDid", photo_url as "photoUrl",
                       contact_info as "contactInfo", birthday, notes, is_favorite as "isFavorite",
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [
                name,
                gender,
                purpose,
                classification || null,
                purpose === 'other' ? customPurpose : null,
                whatTheyDid,
                photoUrl,
                contactInfo,
                birthday,
                notes,
                isFavorite,
                req.params.id,
                req.user.id
            ]
        );

        res.json({
            message: 'Relationship updated successfully',
            relationship: result.rows[0]
        });
    } catch (error) {
        console.error('Update relationship error:', error);
        res.status(500).json({ error: 'Failed to update relationship' });
    }
});

// ==========================================
// TOGGLE FAVORITE
// ==========================================

/**
 * PATCH /api/relationships/:id/favorite
 * Toggle favorite status
 */
router.patch('/:id/favorite', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(
            `UPDATE relationships 
             SET is_favorite = NOT is_favorite, updated_at = now()
             WHERE id = $1 AND user_id = $2
             RETURNING id, name, is_favorite as "isFavorite"`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relationship not found' });
        }

        res.json({
            message: result.rows[0].isFavorite ? 'Added to favorites' : 'Removed from favorites',
            ...result.rows[0]
        });
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// ==========================================
// DELETE RELATIONSHIP
// ==========================================

/**
 * DELETE /api/relationships/:id
 * Remove a relationship
 */
router.delete('/:id', auth.authMiddleware, async (req, res) => {
    try {
        if (!db.isConfigured()) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const result = await db.query(
            'DELETE FROM relationships WHERE id = $1 AND user_id = $2 RETURNING id, name',
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relationship not found' });
        }

        // Log audit
        await auth.logAudit(req.user.id, 'RELATIONSHIP_DELETED', {
            relationshipId: result.rows[0].id,
            name: result.rows[0].name
        });

        res.json({
            message: 'Relationship removed successfully',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Delete relationship error:', error);
        res.status(500).json({ error: 'Failed to delete relationship' });
    }
});

module.exports = router;
