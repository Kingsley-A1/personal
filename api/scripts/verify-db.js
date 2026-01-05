/**
 * Database Verification Script
 * ============================================
 * Run this to verify database schema and create initial admin user.
 * 
 * Usage: node scripts/verify-db.js
 */

require('dotenv').config();
const db = require('../lib/database');

async function verifyDatabase() {
    console.log('\n🔍 REIGN Database Verification\n');
    console.log('='.repeat(50));

    if (!db.isConfigured()) {
        console.error('❌ DATABASE_URL not configured in .env');
        process.exit(1);
    }

    try {
        // Test connection
        console.log('\n1️⃣  Testing connection...');
        await db.testConnection();
        console.log('   ✅ Connected successfully');

        // Check tables exist
        console.log('\n2️⃣  Checking tables...');
        const tables = ['users', 'user_data', 'sessions', 'audit_log', 'announcements', 'relationships'];

        for (const table of tables) {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_name = $1`,
                [table]
            );
            const exists = parseInt(result.rows[0].count) > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        }

        // Check classification column on relationships
        console.log('\n3️⃣  Checking classification column...');
        const colResult = await db.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'relationships' AND column_name = 'classification'`
        );

        if (colResult.rows.length > 0) {
            console.log('   ✅ classification column exists');
        } else {
            console.log('   ⚠️  classification column missing - running migration...');
            await db.query(`ALTER TABLE relationships ADD COLUMN IF NOT EXISTS classification STRING(50)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_relationships_classification ON relationships(user_id, classification)`);
            console.log('   ✅ Migration applied');
        }

        // Count users
        console.log('\n4️⃣  User statistics...');
        const userStats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE role = 'admin' OR role = 'superadmin') as admins
            FROM users
        `);
        console.log(`   Total users: ${userStats.rows[0].total}`);
        console.log(`   Admin users: ${userStats.rows[0].admins}`);

        if (parseInt(userStats.rows[0].admins) === 0) {
            console.log('\n   ⚠️  No admin users found!');
            console.log('   Run: node scripts/create-admin.js <email>');
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Database verification complete\n');

    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

verifyDatabase();
