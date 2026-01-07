/**
 * REIGN API - Authentication Module
 * Password hashing, JWT management, and user persistence with CockroachDB
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_REMEMBER = '10d';  // 10 days for "Remember Me"
const TOKEN_EXPIRY_DEFAULT = '1d';    // 1 day default session
const SALT_ROUNDS = 12;

// Fail fast if JWT_SECRET is not configured
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required. Server cannot start without it.');
}

// ==========================================
// PASSWORD UTILITIES
// ==========================================

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Is valid
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// ==========================================
// JWT TOKEN MANAGEMENT
// ==========================================

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {boolean} rememberMe - Whether to use extended expiry (10 days)
 * @returns {string} JWT token
 */
function generateToken(payload, rememberMe = false) {
    const expiry = rememberMe ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY_DEFAULT;
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiry });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// ==========================================
// USER MANAGEMENT (CockroachDB)
// ==========================================

/**
 * Create a new user in the database
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user (without password)
 */
async function createUser(userData) {
    const { name, email, password } = userData; // 'email' here acts as the generic identifier

    // Check if database is configured
    if (!db.isConfigured()) {
        throw new Error('Database not configured. Please set DATABASE_URL in .env');
    }

    const identifier = email.trim();
    const isPhone = /^\+?[0-9\s-]{10,}$/.test(identifier);
    let finalEmail = null;
    let finalPhone = null;

    if (isPhone) {
        finalPhone = identifier; // Could normalize here
    } else {
        finalEmail = identifier.toLowerCase();
    }

    // Check if identifier already exists
    const existingUser = await findUserByIdentifier(identifier);
    if (existingUser) {
        throw new Error('Account already registered');
    }

    const hashedPassword = await hashPassword(password);

    // Generate initials for default avatar
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const result = await db.query(
        `INSERT INTO users (email, phone, password_hash, name, initials) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, phone, name, avatar_url as avatar, initials, role, status, streak, created_at as "createdAt", updated_at as "updatedAt"`,
        [finalEmail, finalPhone, hashedPassword, name.trim(), initials]
    );

    return result.rows[0];
}

/**
 * Find user by email or phone
 * @param {string} identifier - User email or phone
 * @returns {Promise<Object|null>} User or null
 */
async function findUserByIdentifier(identifier) {
    if (!db.isConfigured()) return null;

    const term = identifier.trim().toLowerCase(); // phone normalization might be needed if strictly enforcing format

    const result = await db.query(
        `SELECT id, email, phone, name, password_hash as password, avatar_url as avatar, initials, role, status, streak, 
                created_at as "createdAt", updated_at as "updatedAt"
         FROM users 
         WHERE email = $1 OR phone = $1`,
        [term]
    );
    return result.rows[0] || null;
}

/**
 * Find user by email (Legacy - uses findUserByIdentifier)
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User or null
 */
async function findUserByEmail(email) {
    return findUserByIdentifier(email);
}

/**
 * Find user by ID
 * @param {string} id - User ID
 * @param {boolean} includePassword - Include password in result
 * @returns {Promise<Object|null>} User or null
 */
async function findUserById(id, includePassword = false) {
    if (!db.isConfigured()) return null;

    const columns = includePassword
        ? 'id, email, phone, name, password_hash as password, avatar_url as avatar, initials, role, status, streak, created_at as "createdAt", updated_at as "updatedAt"'
        : 'id, email, phone, name, avatar_url as avatar, initials, role, status, streak, created_at as "createdAt", updated_at as "updatedAt"';

    const result = await db.query(
        `SELECT ${columns} FROM users WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

/**
 * Update user profile
 * @param {string} id - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user (without password)
 */
async function updateUser(id, updates) {
    if (!db.isConfigured()) {
        throw new Error('Database not configured');
    }

    const user = await findUserById(id);
    if (!user) {
        throw new Error('User not found');
    }

    // Calculate new initials if name changed
    let initials = user.initials;
    if (updates.name) {
        initials = updates.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    // Handle password update
    let passwordHash = null;
    if (updates.password) {
        passwordHash = await hashPassword(updates.password);
    }

    const result = await db.query(
        `UPDATE users 
         SET name = COALESCE($1, name), 
             avatar_url = COALESCE($2, avatar_url),
             initials = COALESCE($3, initials),
             password_hash = COALESCE($4, password_hash),
             updated_at = now()
         WHERE id = $5
         RETURNING id, email, name, avatar_url as avatar, initials, role, status, streak, created_at as "createdAt", updated_at as "updatedAt"`,
        [updates.name || null, updates.avatar || null, initials, passwordHash, id]
    );

    return result.rows[0];
}

/**
 * Delete a user
 * @param {string} id - User ID
 * @returns {Promise<boolean>} Success
 */
async function deleteUser(id) {
    if (!db.isConfigured()) return false;

    const result = await db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
    );
    return result.rowCount > 0;
}

/**
 * Get all users (for admin)
 * @returns {Promise<Array>} All users
 */
async function getAllUsers() {
    if (!db.isConfigured()) return [];

    const result = await db.query(
        `SELECT id, email, name, avatar_url as avatar, initials, role, status, streak, 
                created_at as "createdAt", updated_at as "updatedAt"
         FROM users 
         ORDER BY created_at DESC`
    );
    return result.rows;
}

// ==========================================
// MIDDLEWARE
// ==========================================

/**
 * Express middleware to verify auth token
 */
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        const user = await findUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user to request (without password)
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ error: 'Authentication error' });
    }
}

// ==========================================
// ROLE-BASED ACCESS MIDDLEWARE
// ==========================================

/**
 * Express middleware to verify admin role
 * Must be used AFTER authMiddleware to ensure req.user exists
 * 
 * Usage: router.get('/admin-route', authMiddleware, adminMiddleware, handler)
 */
function adminMiddleware(req, res, next) {
    // Verify user exists (authMiddleware should have set this)
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for admin or superadmin role
    const adminRoles = ['admin', 'superadmin'];
    if (!adminRoles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Admin access required',
            userRole: req.user.role
        });
    }

    next();
}

/**
 * Express middleware to verify superadmin role
 * For operations like promoting users to admin, system settings, etc.
 * Must be used AFTER authMiddleware
 */
function superAdminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            error: 'Superadmin access required',
            message: 'This operation requires superadmin privileges'
        });
    }

    next();
}

// ==========================================
// AUDIT LOGGING
// ==========================================

/**
 * Log an audit event
 * @param {string} userId - User ID (can be null for system events)
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 * @param {string} ipAddress - Client IP address
 */
async function logAudit(userId, action, details = {}, ipAddress = null) {
    if (!db.isConfigured()) return;

    try {
        await db.query(
            `INSERT INTO audit_log (user_id, action, details, ip_address) 
             VALUES ($1, $2, $3, $4)`,
            [userId, action, JSON.stringify(details), ipAddress]
        );
    } catch (error) {
        console.error('Audit log error:', error.message);
    }
}

// ==========================================
// LEGACY R2 COMPATIBILITY (Deprecated)
// ==========================================

/**
 * @deprecated Use CockroachDB instead
 */
async function saveUsersToR2(r2) {
    console.log('saveUsersToR2 is deprecated - users are now stored in CockroachDB');
}

/**
 * @deprecated Use CockroachDB instead
 */
async function loadUsersFromR2(r2) {
    console.log('loadUsersFromR2 is deprecated - users are now stored in CockroachDB');
    // Test database connection on startup
    if (db.isConfigured()) {
        await db.testConnection();
    }
}

module.exports = {
    // Password utilities
    hashPassword,
    verifyPassword,

    // JWT utilities
    generateToken,
    verifyToken,

    // User CRUD
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,
    getAllUsers,

    // Middleware
    authMiddleware,
    adminMiddleware,
    superAdminMiddleware,

    // Convenience middleware: combines auth + admin check in one
    requireAdmin: [authMiddleware, adminMiddleware],
    requireSuperAdmin: [authMiddleware, superAdminMiddleware],
    requireAuth: authMiddleware,

    // Audit
    logAudit,

    // Legacy exports (deprecated - will be removed in future versions)
    saveUsersToR2,
    loadUsersFromR2
};
