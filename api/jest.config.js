const path = require('path');

/**
 * Jest Configuration for REIGN API
 * ============================================
 * Senior-developer configuration with coverage, timeouts, and test organization.
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory for tests
    rootDir: __dirname,

    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Files to ignore
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/'
    ],

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'lib/**/*.js',
        'routes/**/*.js',
        '!**/node_modules/**'
    ],

    // Coverage thresholds (realistic for production MVP)
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 30,
            lines: 25,
            statements: 25
        }
    },

    // Test timeout (10 seconds for API tests)
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Setup/teardown - inline the testUtils setup since file loading has issues
    globalSetup: undefined,
    setupFilesAfterEnv: [],

    // Force exit after all tests complete
    forceExit: true,

    // Detect open handles (like database connections)
    detectOpenHandles: true
};
