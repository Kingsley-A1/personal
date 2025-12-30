/**
 * Run Migration Script
 * Usage: node scripts/run-migration.js
 */
require('dotenv').config();
const db = require('../lib/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    if (!db.isConfigured()) {
        console.error('Database not configured');
        process.exit(1);
    }

    try {
        console.log('Running migration: 003_add_phone_support.sql');
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/003_add_phone_support.sql'), 'utf8');

        // Split by semicolon (naive but works for simple migrations)
        const statements = sql.split(';').filter(s => s.trim());

        for (const stmt of statements) {
            if (stmt.trim()) {
                await db.query(stmt);
            }
        }

        console.log('✅ Migration applied successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await db.close();
    }
}

runMigration();
