/**
 * REIGN API - Sync Routes
 * Cloud sync for user data across devices using CockroachDB
 */

const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/database');
const r2 = require('../lib/r2');

// ==========================================
// DATABASE SYNC HELPERS
// ==========================================

/**
 * Get user data from CockroachDB
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null
 */
async function getUserDataFromDB(userId) {
    if (!db.isConfigured()) return null;

    const result = await db.query(
        `SELECT data, last_sync as "lastSync" FROM user_data WHERE user_id = $1`,
        [userId]
    );

    if (result.rows.length === 0) return null;

    return {
        appData: result.rows[0].data,
        lastSync: result.rows[0].lastSync
    };
}

/**
 * Save user data to CockroachDB
 * @param {string} userId - User ID
 * @param {Object} appData - Application data
 * @returns {Promise<string>} Last sync timestamp
 */
async function saveUserDataToDB(userId, appData) {
    const result = await db.query(
        `INSERT INTO user_data (user_id, data, last_sync) 
         VALUES ($1, $2, now())
         ON CONFLICT (user_id) 
         DO UPDATE SET data = $2, last_sync = now()
         RETURNING last_sync as "lastSync"`,
        [userId, JSON.stringify(appData)]
    );

    return result.rows[0].lastSync;
}

// ==========================================
// SYNC ROUTES
// ==========================================

/**
 * GET /api/sync
 * Download user data from cloud (requires auth)
 */
router.get('/', auth.authMiddleware, async (req, res) => {
    try {
        // Try CockroachDB first
        if (db.isConfigured()) {
            const data = await getUserDataFromDB(req.user.id);

            if (!data) {
                return res.json({
                    message: 'No cloud data found',
                    data: null,
                    lastSync: null,
                    source: 'database'
                });
            }

            return res.json({
                message: 'Data downloaded',
                data: data.appData,
                lastSync: data.lastSync,
                source: 'database'
            });
        }

        // Fallback to R2 if database not configured
        if (!r2.isConfigured()) {
            return res.status(503).json({
                error: 'Cloud sync not configured',
                configured: false
            });
        }

        const data = await r2.downloadUserData(req.user.id);

        if (!data) {
            return res.json({
                message: 'No cloud data found',
                data: null,
                lastSync: null,
                source: 'r2'
            });
        }

        res.json({
            message: 'Data downloaded',
            data: data.appData,
            lastSync: data.lastSync,
            source: 'r2'
        });
    } catch (error) {
        console.error('Sync download error:', error);
        res.status(500).json({ error: 'Failed to download data' });
    }
});

/**
 * POST /api/sync
 * Upload user data to cloud (requires auth)
 */
router.post('/', auth.authMiddleware, async (req, res) => {
    try {
        const { appData, localTimestamp } = req.body;

        if (!appData) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Use CockroachDB if configured
        if (db.isConfigured()) {
            // Check for conflicts
            const existingData = await getUserDataFromDB(req.user.id);

            if (existingData && existingData.lastSync) {
                const cloudTime = new Date(existingData.lastSync).getTime();
                const localTime = new Date(localTimestamp).getTime();

                // If cloud is newer, return conflict
                if (cloudTime > localTime) {
                    return res.status(409).json({
                        error: 'Conflict detected',
                        conflict: true,
                        cloudData: existingData.appData,
                        cloudTimestamp: existingData.lastSync
                    });
                }
            }

            // Save to database
            const lastSync = await saveUserDataToDB(req.user.id, appData);

            // Log audit event
            await auth.logAudit(req.user.id, 'SYNC_UPLOAD', {
                dataSize: JSON.stringify(appData).length
            });

            return res.json({
                message: 'Data synced to cloud',
                lastSync,
                source: 'database'
            });
        }

        // Fallback to R2
        if (!r2.isConfigured()) {
            return res.status(503).json({
                error: 'Cloud sync not configured',
                configured: false
            });
        }

        // Check for conflicts with R2
        const existingData = await r2.downloadUserData(req.user.id);

        if (existingData && existingData.lastSync) {
            const cloudTime = new Date(existingData.lastSync).getTime();
            const localTime = new Date(localTimestamp).getTime();

            if (cloudTime > localTime) {
                return res.status(409).json({
                    error: 'Conflict detected',
                    conflict: true,
                    cloudData: existingData.appData,
                    cloudTimestamp: existingData.lastSync
                });
            }
        }

        const dataToUpload = {
            appData,
            lastSync: new Date().toISOString(),
            userId: req.user.id
        };

        await r2.uploadUserData(req.user.id, dataToUpload);

        res.json({
            message: 'Data synced to cloud',
            lastSync: dataToUpload.lastSync,
            source: 'r2'
        });
    } catch (error) {
        console.error('Sync upload error:', error);
        res.status(500).json({ error: 'Failed to sync data' });
    }
});

/**
 * POST /api/sync/force
 * Force upload, overwriting cloud data (requires auth)
 */
router.post('/force', auth.authMiddleware, async (req, res) => {
    try {
        const { appData } = req.body;

        if (!appData) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Use CockroachDB if configured
        if (db.isConfigured()) {
            const lastSync = await saveUserDataToDB(req.user.id, appData);

            await auth.logAudit(req.user.id, 'SYNC_FORCE_UPLOAD', {
                dataSize: JSON.stringify(appData).length
            });

            return res.json({
                message: 'Data force synced to cloud',
                lastSync,
                source: 'database'
            });
        }

        // Fallback to R2
        if (!r2.isConfigured()) {
            return res.status(503).json({
                error: 'Cloud sync not configured',
                configured: false
            });
        }

        const dataToUpload = {
            appData,
            lastSync: new Date().toISOString(),
            userId: req.user.id
        };

        await r2.uploadUserData(req.user.id, dataToUpload);

        res.json({
            message: 'Data force synced to cloud',
            lastSync: dataToUpload.lastSync,
            source: 'r2'
        });
    } catch (error) {
        console.error('Force sync error:', error);
        res.status(500).json({ error: 'Failed to force sync' });
    }
});

/**
 * GET /api/sync/status
 * Check sync status and configuration (requires auth)
 */
router.get('/status', auth.authMiddleware, async (req, res) => {
    try {
        const dbConfigured = db.isConfigured();
        const r2Configured = r2.isConfigured();
        let lastSync = null;
        let source = null;

        if (dbConfigured) {
            const data = await getUserDataFromDB(req.user.id);
            if (data) {
                lastSync = data.lastSync;
                source = 'database';
            }
        } else if (r2Configured) {
            const data = await r2.downloadUserData(req.user.id);
            if (data) {
                lastSync = data.lastSync;
                source = 'r2';
            }
        }

        res.json({
            configured: dbConfigured || r2Configured,
            database: dbConfigured,
            r2: r2Configured,
            lastSync,
            source,
            user: req.user.id
        });
    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

module.exports = router;
