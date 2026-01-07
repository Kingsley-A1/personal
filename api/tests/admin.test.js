/**
 * Admin Routes Tests
 * ============================================
 * Tests for admin API endpoints including user management,
 * analytics, announcements, and audit logs.
 * 
 * @group admin
 */

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const adminRoutes = require('../routes/admin');
const db = require('../lib/database');

// Test utilities
const testUtils = {
    generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
    let adminToken;
    let regularUserToken;
    let testUserId;

    beforeAll(async () => {
        if (!db.isConfigured()) {
            console.log('⏭️  Admin tests require database connection');
            return;
        }

        // Create a regular user
        const userEmail = testUtils.generateTestEmail();
        const userRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Regular User',
                email: userEmail,
                password: 'RegularUser123!'
            });
        regularUserToken = userRes.body.token;
        testUserId = userRes.body.user.id;

        // For admin tests, we need to manually set up an admin user
        // In production, this would be done via database seeding
        // For tests, we'll verify the 403 responses for regular users
    });

    // ==========================================
    // ACCESS CONTROL TESTS
    // ==========================================

    describe('Access Control', () => {

        test('should reject unauthenticated requests', async () => {
            const res = await request(app)
                .get('/api/admin/users');

            expect(res.status).toBe(401);
        });

        test('should reject non-admin users', async () => {
            if (!regularUserToken) {
                console.log('⏭️  Skipping: No test user token');
                return;
            }

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('Admin access required');
        });
    });

    // ==========================================
    // USER MANAGEMENT TESTS
    // ==========================================

    describe('GET /api/admin/users', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/users');

            expect(res.status).toBe(401);
        });

        test('should require admin role', async () => {
            if (!regularUserToken) return;

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/admin/users/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/users/some-id');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/admin/users/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .put('/api/admin/users/some-id')
                .send({ name: 'Updated' });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/admin/users/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/admin/users/some-id');

            expect(res.status).toBe(401);
        });
    });

    // ==========================================
    // USER ACTION TESTS
    // ==========================================

    describe('POST /api/admin/users/:id/suspend', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/admin/users/some-id/suspend');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/admin/users/:id/unsuspend', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/admin/users/some-id/unsuspend');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/admin/users/:id/promote', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/admin/users/some-id/promote');

            expect(res.status).toBe(401);
        });

        test('should require admin role', async () => {
            if (!regularUserToken) return;

            const res = await request(app)
                .post('/api/admin/users/some-id/promote')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // ANALYTICS TESTS
    // ==========================================

    describe('GET /api/admin/analytics', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/analytics');

            expect(res.status).toBe(401);
        });

        test('should require admin role', async () => {
            if (!regularUserToken) return;

            const res = await request(app)
                .get('/api/admin/analytics')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // ANNOUNCEMENTS TESTS
    // ==========================================

    describe('GET /api/admin/announcements', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/announcements');

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/admin/announce', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/admin/announce')
                .send({ title: 'Test', message: 'Test message' });

            expect(res.status).toBe(401);
        });

        test('should require admin role', async () => {
            if (!regularUserToken) return;

            const res = await request(app)
                .post('/api/admin/announce')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .send({ title: 'Test', message: 'Test message' });

            expect(res.status).toBe(403);
        });
    });

    // ==========================================
    // AUDIT LOG TESTS
    // ==========================================

    describe('GET /api/admin/audit', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/admin/audit');

            expect(res.status).toBe(401);
        });

        test('should require admin role', async () => {
            if (!regularUserToken) return;

            const res = await request(app)
                .get('/api/admin/audit')
                .set('Authorization', `Bearer ${regularUserToken}`);

            expect(res.status).toBe(403);
        });
    });
});
