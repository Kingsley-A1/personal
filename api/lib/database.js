/**
 * CockroachDB Serverless Connection Module
 * Handles connection pooling and query execution for REIGN
 */

require('dotenv').config();
const { Pool } = require('pg');

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not configured in .env');
    console.error('   Get your connection string from: https://cockroachlabs.cloud');
}

// Connection pool configuration for CockroachDB Serverless
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true  // CockroachDB requires SSL
    },
    max: parseInt(process.env.DATABASE_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 10000
});

// Log connection events
pool.on('connect', () => {
    console.log('✅ Connected to CockroachDB');
});

pool.on('error', (err) => {
    console.error('❌ CockroachDB connection error:', err.message);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`📊 Query executed in ${duration}ms`);
        }
        
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<PoolClient>}
 */
async function getClient() {
    return pool.connect();
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
    try {
        const result = await query('SELECT now() as current_time, version() as version');
        console.log('✅ Database connection test passed');
        console.log('   Time:', result.rows[0].current_time);
        console.log('   Version:', result.rows[0].version.split(' ')[0]);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
}

/**
 * Close all connections (for graceful shutdown)
 */
async function close() {
    await pool.end();
    console.log('Database pool closed');
}

/**
 * Check if database is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!process.env.DATABASE_URL;
}

module.exports = {
    query,
    getClient,
    testConnection,
    close,
    isConfigured,
    pool
};
