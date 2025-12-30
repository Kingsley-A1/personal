/**
 * Test Setup and Teardown
 * ============================================
 * Global setup for all tests including database connection and cleanup.
 */

const db = require('../lib/database');

// Increase timeout for database operations
jest.setTimeout(15000);

// Before all tests
beforeAll(async () => {
    // Check if database is configured for tests
    if (!db.isConfigured()) {
        console.warn('⚠️  Database not configured - some tests will be skipped');
    }
});

// After all tests
afterAll(async () => {
    // Close database connections
    try {
        await db.close();
    } catch (error) {
        // Ignore close errors during tests
    }
});

// Global test utilities
global.testUtils = {
    /**
     * Generate a unique test email
     */
    generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@test.com`,

    /**
     * Wait for a specified time
     */
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
