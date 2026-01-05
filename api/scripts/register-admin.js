/**
 * Register Platform Admin Script
 * ============================================
 * Creates the first superadmin user directly in the database.
 * Use this for initial platform setup when no users exist.
 * 
 * Usage: node scripts/register-admin.js
 * 
 * You will be prompted for:
 * - Name
 * - Email
 * - Password
 */

require('dotenv').config();
const readline = require('readline');
const db = require('../lib/database');
const auth = require('../lib/auth');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

async function registerAdmin() {
    console.log('\n' + '='.repeat(50));
    console.log('👑 REIGN Platform Admin Registration');
    console.log('='.repeat(50) + '\n');

    if (!db.isConfigured()) {
        console.error('❌ DATABASE_URL not configured in .env');
        process.exit(1);
    }

    try {
        // Test database connection
        console.log('Testing database connection...');
        await db.testConnection();
        console.log('');

        // Get admin details
        const name = await prompt('Enter admin name: ');
        const email = await prompt('Enter admin email: ');
        const password = await prompt('Enter password (min 6 chars): ');

        // Validation
        if (!name || name.trim().length < 2) {
            console.error('\n❌ Name must be at least 2 characters');
            process.exit(1);
        }

        if (!email || !email.includes('@')) {
            console.error('\n❌ Invalid email format');
            process.exit(1);
        }

        if (!password || password.length < 6) {
            console.error('\n❌ Password must be at least 6 characters');
            process.exit(1);
        }

        // Check if email already exists
        const existing = await db.query(
            `SELECT id, role FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );

        if (existing.rows.length > 0) {
            if (existing.rows[0].role === 'superadmin') {
                console.log(`\nℹ️  ${email} is already a superadmin`);
            } else {
                console.log(`\n⚠️  User already exists. Promoting to superadmin...`);
                await db.query(
                    `UPDATE users SET role = 'superadmin', updated_at = now() WHERE id = $1`,
                    [existing.rows[0].id]
                );
                console.log('✅ User promoted to superadmin');
            }
            process.exit(0);
        }

        // Hash password
        console.log('\nCreating admin account...');
        const hashedPassword = await auth.hashPassword(password);

        // Generate initials
        const initials = name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

        // Create user with superadmin role
        const result = await db.query(
            `INSERT INTO users (email, password_hash, name, initials, role, status)
             VALUES ($1, $2, $3, $4, 'superadmin', 'active')
             RETURNING id, email, name, role`,
            [email.toLowerCase().trim(), hashedPassword, name.trim(), initials]
        );

        const admin = result.rows[0];

        // Log audit event
        await db.query(
            `INSERT INTO audit_log (user_id, action, details) VALUES ($1, $2, $3)`,
            [admin.id, 'SUPERADMIN_CREATED_VIA_SCRIPT', JSON.stringify({ email: admin.email })]
        );

        console.log('\n' + '='.repeat(50));
        console.log('✅ SUPERADMIN CREATED SUCCESSFULLY');
        console.log('='.repeat(50));
        console.log(`\n   Name:  ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role:  ${admin.role}`);
        console.log(`\nYou can now login to the admin panel at:`);
        console.log(`   http://localhost:3001/admin/admin.html\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
        await db.close();
    }
}

registerAdmin();
