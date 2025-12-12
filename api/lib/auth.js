/**
 * King Daily API - Authentication Utilities
 * Password hashing and JWT token management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-not-for-production';
const TOKEN_EXPIRY = '30d'; // 30 days

// In-memory user store (replace with R2 storage in production)
const users = new Map();

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} Is valid
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
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

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Object} Created user (without password)
 */
async function createUser(userData) {
    const { name, email, password } = userData;

    // Check if email already exists
    for (const [, user] of users) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            throw new Error('Email already registered');
        }
    }

    const id = uuidv4();
    const hashedPassword = await hashPassword(password);

    // Generate initials for default avatar
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    const user = {
        id,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        avatar: null,
        initials,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.set(id, user);

    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object|null} User or null
 */
function findUserByEmail(email) {
    for (const [, user] of users) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            return user;
        }
    }
    return null;
}

/**
 * Find user by ID
 * @param {string} id - User ID
 * @param {boolean} includePassword - Include password in result
 * @returns {Object|null} User or null
 */
function findUserById(id, includePassword = false) {
    const user = users.get(id);
    if (!user) return null;

    if (includePassword) {
        return user;
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
}

/**
 * Update user profile
 * @param {string} id - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated user (without password)
 */
function updateUser(id, updates) {
    const user = users.get(id);
    if (!user) {
        throw new Error('User not found');
    }

    // Allow updating these fields
    const allowedFields = ['name', 'avatar', 'password'];
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            user[field] = updates[field];
        }
    }

    // Update initials if name changed
    if (updates.name) {
        user.initials = updates.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    user.updatedAt = new Date().toISOString();
    users.set(id, user);

    const { password: _, ...safeUser } = user;
    return safeUser;
}

/**
 * Delete a user
 * @param {string} id - User ID
 */
function deleteUser(id) {
    users.delete(id);
}

/**
 * Express middleware to verify auth token
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = findUserById(payload.userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request (without password)
    req.user = user;
    next();
}

/**
 * Save users to R2 (for persistence)
 */
async function saveUsersToR2(r2) {
    if (!r2.isConfigured()) return;

    const usersArray = Array.from(users.entries());
    await r2.uploadUserData('_system', { users: usersArray });
}

/**
 * Load users from R2 (on startup)
 */
async function loadUsersFromR2(r2) {
    if (!r2.isConfigured()) return;

    try {
        const data = await r2.downloadUserData('_system');
        if (data && data.users) {
            users.clear();
            for (const [id, user] of data.users) {
                users.set(id, user);
            }
            console.log(`Loaded ${users.size} users from R2`);
        }
    } catch (error) {
        console.log('No existing user data in R2, starting fresh');
    }
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,
    authMiddleware,
    saveUsersToR2,
    loadUsersFromR2
};
