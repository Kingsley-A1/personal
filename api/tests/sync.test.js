/**
 * Sync Routes Tests
 * ============================================
 * Tests for cloud sync API endpoints.
 * 
 * @group sync
 */

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const syncRoutes = require('../routes/sync');

// Test utilities
const testUtils = {
    generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

describe('Sync Routes', () => {
    let authToken;

    beforeAll(async () => {
        // Create and login user
        const email = testUtils.generateTestEmail();
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Sync Test User',
                email,
                password: 'SyncTest123!'
            });
        authToken = registerRes.body.token;
    });

    // ==========================================
    // DOWNLOAD (GET) TESTS
    // ==========================================

    describe('GET /api/sync', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/sync');

            expect(res.status).toBe(401);
        });

        test('should download user data with valid token', async () => {
            const res = await request(app)
                .get('/api/sync')
                .set('Authorization', `Bearer ${authToken}`);

            // 200 or 404 (if no data yet) are both valid
            expect([200, 404]).toContain(res.status);
        });
    });

    // ==========================================
    // UPLOAD (POST) TESTS
    // ==========================================

    describe('POST /api/sync', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/sync')
                .send({ appData: { test: true } });

            expect(res.status).toBe(401);
        });

        test('should upload data with valid token', async () => {
            const testData = {
                appData: {
                    tasks: [{ id: 1, title: 'Test Task' }],
                    settings: { theme: 'dark' }
                },
                localTimestamp: new Date().toISOString()
            };

            const res = await request(app)
                .post('/api/sync')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testData);

            expect(res.status).toBe(200);
            expect(res.body.message).toBeDefined();
        });

        test('should require appData in body', async () => {
            const res = await request(app)
                .post('/api/sync')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('No data');
        });
    });

    // ==========================================
    // FORCE UPLOAD TESTS
    // ==========================================

    describe('POST /api/sync/force', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/sync/force')
                .send({ appData: { test: true } });

            expect(res.status).toBe(401);
        });

        test('should force upload data', async () => {
            const testData = {
                appData: {
                    tasks: [{ id: 2, title: 'Force Upload Task' }]
                }
            };

            const res = await request(app)
                .post('/api/sync/force')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testData);

            expect(res.status).toBe(200);
        });
    });

    // ==========================================
    // STATUS TESTS
    // ==========================================

    describe('GET /api/sync/status', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/sync/status');

            expect(res.status).toBe(401);
        });

        test('should return sync status', async () => {
            const res = await request(app)
                .get('/api/sync/status')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            // Check for actual response properties
            expect(res.body).toHaveProperty('database');
            expect(res.body).toHaveProperty('configured');
        });
    });
});
