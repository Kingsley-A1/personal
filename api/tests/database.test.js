/**
 * Database Connection Tests
 * ============================================
 * Tests for database connectivity and core operations.
 * 
 * @group database
 */

const db = require('../lib/database');

describe('Database Module', () => {

    describe('isConfigured', () => {

        test('should return boolean', () => {
            const result = db.isConfigured();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('testConnection', () => {

        test('should test connection if configured', async () => {
            if (!db.isConfigured()) {
                console.log('⏭️  Skipping: Database not configured');
                return;
            }

            const result = await db.testConnection();
            expect(result).toBe(true);
        });
    });

    describe('query', () => {

        test('should execute simple query', async () => {
            if (!db.isConfigured()) {
                console.log('⏭️  Skipping: Database not configured');
                return;
            }

            const result = await db.query('SELECT 1 as test');
            expect(result.rows).toBeDefined();
            expect(result.rows.length).toBeGreaterThan(0);
            // CockroachDB returns strings for integer literals
            expect(result.rows[0].test).toBe('1');
        });

        test('should handle parameterized queries', async () => {
            if (!db.isConfigured()) {
                console.log('⏭️  Skipping: Database not configured');
                return;
            }

            const result = await db.query('SELECT $1::text as value', ['test-value']);
            expect(result.rows[0].value).toBe('test-value');
        });

        test('should handle query errors gracefully', async () => {
            if (!db.isConfigured()) {
                console.log('⏭️  Skipping: Database not configured');
                return;
            }

            await expect(db.query('INVALID SQL SYNTAX')).rejects.toThrow();
        });
    });
});
