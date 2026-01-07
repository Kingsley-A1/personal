/**
 * Relationships Routes Tests
 * ============================================
 * Tests for Rainy Day People relationship management endpoints.
 * 
 * @group relationships
 */

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const relationshipsRoutes = require('../routes/relationships');

// Test utilities
const testUtils = {
    generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/relationships', relationshipsRoutes);

describe('Relationships Routes', () => {
    let authToken;
    let createdRelationshipId;

    beforeAll(async () => {
        // Create and login user
        const email = testUtils.generateTestEmail();
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Relationships Test User',
                email,
                password: 'RelTest123!'
            });
        authToken = registerRes.body.token;
    });

    // ==========================================
    // LIST TESTS
    // ==========================================

    describe('GET /api/relationships', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/relationships');

            expect(res.status).toBe(401);
        });

        test('should list relationships with valid token', async () => {
            const res = await request(app)
                .get('/api/relationships')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.relationships).toBeDefined();
            expect(Array.isArray(res.body.relationships)).toBe(true);
        });
    });

    // ==========================================
    // CREATE TESTS
    // ==========================================

    describe('POST /api/relationships', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .post('/api/relationships')
                .send({
                    name: 'Test Contact',
                    purpose: 'friend',
                    gender: 'male'
                });

            expect(res.status).toBe(401);
        });

        test('should create a relationship', async () => {
            const relationshipData = {
                name: 'John Doe',
                purpose: 'friend',
                gender: 'male',
                classification: 'burden_bearer',
                notes: 'A good friend who supports me'
            };

            const res = await request(app)
                .post('/api/relationships')
                .set('Authorization', `Bearer ${authToken}`)
                .send(relationshipData);

            expect(res.status).toBe(201);
            expect(res.body.relationship).toBeDefined();
            expect(res.body.relationship.name).toBe('John Doe');

            // Save ID for later tests
            createdRelationshipId = res.body.relationship.id;
        });

        test('should require name', async () => {
            const res = await request(app)
                .post('/api/relationships')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    purpose: 'friend',
                    gender: 'male'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Name');
        });

        test('should require gender', async () => {
            const res = await request(app)
                .post('/api/relationships')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test',
                    purpose: 'friend'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('gender');
        });
    });

    // ==========================================
    // READ SINGLE TESTS
    // ==========================================

    describe('GET /api/relationships/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/relationships/some-id');

            expect(res.status).toBe(401);
        });

        test('should get relationship by ID', async () => {
            if (!createdRelationshipId) {
                console.log('⏭️  Skipping: No relationship created');
                return;
            }

            const res = await request(app)
                .get(`/api/relationships/${createdRelationshipId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.relationship).toBeDefined();
        });

        test('should return 404 for non-existent ID', async () => {
            const res = await request(app)
                .get('/api/relationships/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ==========================================
    // UPDATE TESTS
    // ==========================================

    describe('PUT /api/relationships/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .put('/api/relationships/some-id')
                .send({ name: 'Updated' });

            expect(res.status).toBe(401);
        });

        test('should update relationship', async () => {
            if (!createdRelationshipId) {
                console.log('⏭️  Skipping: No relationship created');
                return;
            }

            const res = await request(app)
                .put(`/api/relationships/${createdRelationshipId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Jane Doe Updated' });

            expect(res.status).toBe(200);
            expect(res.body.relationship.name).toBe('Jane Doe Updated');
        });
    });

    // ==========================================
    // FAVORITE TOGGLE TESTS
    // ==========================================

    describe('PATCH /api/relationships/:id/favorite', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .patch('/api/relationships/some-id/favorite');

            expect(res.status).toBe(401);
        });

        test('should toggle favorite status', async () => {
            if (!createdRelationshipId) {
                console.log('⏭️  Skipping: No relationship created');
                return;
            }

            const res = await request(app)
                .patch(`/api/relationships/${createdRelationshipId}/favorite`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBeDefined();
            expect(res.body.isFavorite).toBeDefined();
        });
    });

    // ==========================================
    // FILTER TESTS (using query params)
    // ==========================================

    describe('GET /api/relationships with filters', () => {

        test('should filter by purpose', async () => {
            const res = await request(app)
                .get('/api/relationships?purpose=friend')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.relationships).toBeDefined();
        });

        test('should filter by classification', async () => {
            const res = await request(app)
                .get('/api/relationships?classification=burden_bearer')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.relationships).toBeDefined();
        });

        test('should filter by favorite', async () => {
            const res = await request(app)
                .get('/api/relationships?favorite=true')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.relationships).toBeDefined();
        });
    });

    // ==========================================
    // STATISTICS TESTS
    // ==========================================

    describe('GET /api/relationships/stats/summary', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .get('/api/relationships/stats/summary');

            expect(res.status).toBe(401);
        });

        test('should return statistics', async () => {
            const res = await request(app)
                .get('/api/relationships/stats/summary')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.stats).toBeDefined();
            expect(res.body.stats.total).toBeDefined();
        });
    });

    // ==========================================
    // DELETE TESTS
    // ==========================================

    describe('DELETE /api/relationships/:id', () => {

        test('should require authentication', async () => {
            const res = await request(app)
                .delete('/api/relationships/some-id');

            expect(res.status).toBe(401);
        });

        test('should delete relationship', async () => {
            if (!createdRelationshipId) {
                console.log('⏭️  Skipping: No relationship created');
                return;
            }

            const res = await request(app)
                .delete(`/api/relationships/${createdRelationshipId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('removed');
        });

        test('should return 404 after deletion', async () => {
            if (!createdRelationshipId) return;

            const res = await request(app)
                .get(`/api/relationships/${createdRelationshipId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });
    });
});
