/**
 * Jest Configuration for REIGN API
 * ============================================
 * Senior-developer configuration with coverage, timeouts, and test organization.
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory for tests
    rootDir: '.',

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

    // Coverage thresholds (enforce quality)
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },

    // Test timeout (10 seconds for API tests)
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Setup/teardown
    setupFilesAfterEnv: ['./tests/setup.js'],

    // Force exit after all tests complete
    forceExit: true,

    // Detect open handles (like database connections)
    detectOpenHandles: true
};
