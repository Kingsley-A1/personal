/**
 * King Daily API - Sync Routes
 * Cloud sync for user data across devices
 */

const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const r2 = require('../lib/r2');

/**
 * GET /api/sync
 * Download user data from cloud (requires auth)
 */
router.get('/', auth.authMiddleware, async (req, res) => {
    try {
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
                lastSync: null
            });
        }

        res.json({
            message: 'Data downloaded',
            data: data.appData,
            lastSync: data.lastSync
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
        if (!r2.isConfigured()) {
            return res.status(503).json({
                error: 'Cloud sync not configured',
                configured: false
            });
        }

        const { appData, localTimestamp } = req.body;

        if (!appData) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Check for conflicts
        const existingData = await r2.downloadUserData(req.user.id);

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

        // Upload data
        const dataToUpload = {
            appData,
            lastSync: new Date().toISOString(),
            userId: req.user.id
        };

        await r2.uploadUserData(req.user.id, dataToUpload);

        res.json({
            message: 'Data synced to cloud',
            lastSync: dataToUpload.lastSync
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
        if (!r2.isConfigured()) {
            return res.status(503).json({
                error: 'Cloud sync not configured',
                configured: false
            });
        }

        const { appData } = req.body;

        if (!appData) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const dataToUpload = {
            appData,
            lastSync: new Date().toISOString(),
            userId: req.user.id
        };

        await r2.uploadUserData(req.user.id, dataToUpload);

        res.json({
            message: 'Data force synced to cloud',
            lastSync: dataToUpload.lastSync
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
        const configured = r2.isConfigured();
        let lastSync = null;

        if (configured) {
            const data = await r2.downloadUserData(req.user.id);
            if (data) {
                lastSync = data.lastSync;
            }
        }

        res.json({
            configured,
            lastSync,
            user: req.user.id
        });
    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

module.exports = router;
