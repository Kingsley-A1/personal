/**
 * Create Admin User Script
 * ============================================
 * Promotes an existing user to superadmin role.
 * 
 * Usage: node scripts/create-admin.js <email>
 */

require('dotenv').config();
const db = require('../lib/database');

async function promoteToAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.log('\n📋 Usage: node scripts/create-admin.js <email>\n');
        console.log('Example: node scripts/create-admin.js kingsley@example.com\n');
        process.exit(1);
    }

    if (!db.isConfigured()) {
        console.error('❌ DATABASE_URL not configured in .env');
        process.exit(1);
    }

    try {
        console.log(`\n🔍 Looking for user: ${email}...`);

        // Check if user exists
        const userResult = await db.query(
            `SELECT id, email, name, role FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );

        if (userResult.rows.length === 0) {
            console.log(`❌ No user found with email: ${email}`);
            console.log('\nAvailable users:');

            const allUsers = await db.query(
                `SELECT email, name, role FROM users ORDER BY created_at`
            );

            if (allUsers.rows.length === 0) {
                console.log('   No users registered yet.');
                console.log('   Register through the app first, then run this script.');
            } else {
                allUsers.rows.forEach(u => {
                    console.log(`   - ${u.email} (${u.name}) [${u.role}]`);
                });
            }

            process.exit(1);
        }

        const user = userResult.rows[0];

        if (user.role === 'superadmin') {
            console.log(`ℹ️  ${user.name} is already a superadmin`);
            process.exit(0);
        }

        // Promote to superadmin
        await db.query(
            `UPDATE users SET role = 'superadmin', updated_at = now() WHERE id = $1`,
            [user.id]
        );

        console.log(`\n✅ Success! ${user.name} (${email}) is now a superadmin\n`);
        console.log(`   Previous role: ${user.role}`);
        console.log(`   New role: superadmin\n`);

        // Log audit event
        await db.query(
            `INSERT INTO audit_log (user_id, action, details) VALUES ($1, $2, $3)`,
            [user.id, 'ADMIN_PROMOTED_VIA_SCRIPT', JSON.stringify({ email, previousRole: user.role })]
        );

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

promoteToAdmin();
