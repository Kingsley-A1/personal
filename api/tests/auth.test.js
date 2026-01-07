/**
 * Authentication Routes Tests
 * ============================================
 * Comprehensive tests for all auth endpoints.
 * Tests are designed to run independently and in isolation.
 * 
 * @group auth
 */

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const auth = require('../lib/auth');
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

// Test data
const testUser = {
    name: 'Test User',
    email: null, // Generated per test
    password: 'TestPassword123!'
};

describe('Auth Routes', () => {

    // ==========================================
    // REGISTRATION TESTS
    // ==========================================

    describe('POST /api/auth/register', () => {

        test('should register a new user successfully', async () => {
            testUser.email = testUtils.generateTestEmail();

            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Account created successfully');
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testUser.email);
            expect(res.body.token).toBeDefined();

            // Password should not be returned
            expect(res.body.user.password).toBeUndefined();
        });

        test('should reject registration without name', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testUtils.generateTestEmail(),
                    password: 'TestPass123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details).toBeDefined();
        });

        test('should reject registration without email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test',
                    password: 'TestPass123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details).toBeDefined();
        });

        test('should reject registration with short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test',
                    email: testUtils.generateTestEmail(),
                    password: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details).toBeDefined();
            // Validator requires 8 characters minimum
            expect(res.body.details.some(d => d.field === 'password')).toBe(true);
        });

        test('should reject registration with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test',
                    email: 'invalid-email',
                    password: 'TestPass123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details.some(d => d.field === 'email')).toBe(true);
        });

        test('should reject duplicate email registration', async () => {
            const email = testUtils.generateTestEmail();

            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({ name: 'User 1', email, password: 'TestPass123!' });

            // Duplicate registration
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'User 2', email, password: 'TestPass456!' });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('already registered');
        });
    });

    // ==========================================
    // LOGIN TESTS
    // ==========================================

    describe('POST /api/auth/login', () => {
        let registeredEmail;

        beforeAll(async () => {
            // Create a user to login with
            registeredEmail = testUtils.generateTestEmail();
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test User',
                    email: registeredEmail,
                    password: 'LoginTest123!'
                });
        });

        test('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: registeredEmail,
                    password: 'LoginTest123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.user).toBeDefined();
            expect(res.body.token).toBeDefined();
        });

        test('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: registeredEmail,
                    password: 'WrongPassword!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid');
        });

        test('should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'Test123!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid');
        });

        test('should reject login without email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    password: 'Test123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details).toBeDefined();
        });
    });

    // ==========================================
    // PROFILE TESTS
    // ==========================================

    describe('GET /api/auth/profile', () => {
        let authToken;

        beforeAll(async () => {
            // Create and login user
            const email = testUtils.generateTestEmail();
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Profile Test User',
                    email,
                    password: 'ProfileTest123!'
                });
            authToken = registerRes.body.token;
        });

        test('should get profile with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.name).toBe('Profile Test User');
        });

        test('should reject without token', async () => {
            const res = await request(app)
                .get('/api/auth/profile');

            expect(res.status).toBe(401);
        });

        test('should reject with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.status).toBe(401);
        });
    });

    // ==========================================
    // PROFILE UPDATE TESTS
    // ==========================================

    describe('PUT /api/auth/profile', () => {
        let authToken;

        beforeAll(async () => {
            const email = testUtils.generateTestEmail();
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Update Test User',
                    email,
                    password: 'UpdateTest123!'
                });
            authToken = registerRes.body.token;
        });

        test('should update name successfully', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.user.name).toBe('Updated Name');
        });
    });

    // ==========================================
    // PASSWORD CHANGE TESTS
    // ==========================================

    describe('PUT /api/auth/password', () => {
        let authToken;
        const email = testUtils.generateTestEmail();

        beforeAll(async () => {
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Password Test User',
                    email,
                    password: 'OldPassword123!'
                });
            authToken = registerRes.body.token;
        });

        test('should change password with correct current password', async () => {
            const res = await request(app)
                .put('/api/auth/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'OldPassword123!',
                    newPassword: 'NewPassword456!'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('updated');

            // Verify new password works
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email, password: 'NewPassword456!' });

            expect(loginRes.status).toBe(200);
        });

        test('should reject password change with wrong current password', async () => {
            const res = await request(app)
                .put('/api/auth/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'WrongPassword!',
                    newPassword: 'NewPassword789!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('incorrect');
        });

        test('should reject password change with short new password', async () => {
            const res = await request(app)
                .put('/api/auth/password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    currentPassword: 'NewPassword456!',
                    newPassword: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.details).toBeDefined();
        });
    });

    // ==========================================
    // PASSWORD RESET TESTS
    // ==========================================

    describe('POST /api/auth/forgot-password', () => {

        test('should return success for any email (security measure)', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'nonexistent@test.com' });

            // Always returns success to prevent email enumeration
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('If an account exists');
        });

        test('should require email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('required');
        });
    });

    describe('POST /api/auth/reset-password', () => {

        test('should reject with invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    newPassword: 'NewPassword123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Invalid or expired');
        });

        test('should require token and password', async () => {
            const res = await request(app)
                .post('/api/auth/reset-password')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('required');
        });
    });

    // ==========================================
    // REFRESH TOKEN TESTS
    // ==========================================

    describe('POST /api/auth/refresh', () => {

        test('should require refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('required');
        });

        test('should reject invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid or expired');
        });
    });

    // ==========================================
    // LOGOUT TESTS
    // ==========================================

    describe('POST /api/auth/logout', () => {

        test('should logout successfully', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Logged out');
        });
    });
});
