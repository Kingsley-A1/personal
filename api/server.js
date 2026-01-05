/**
 * REIGN API Server
 * Backend for Authentication, Cloud Sync, and Relationships
 * Now powered by CockroachDB Serverless
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');
const relationshipsRoutes = require('./routes/relationships');
const adminRoutes = require('./routes/admin');
const r2 = require('./lib/r2');
const db = require('./lib/database');
const auth = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * ============================================
 * SECURITY MIDDLEWARE
 * ============================================
 * Helmet sets various HTTP headers to protect against
 * common web vulnerabilities like XSS, clickjacking, etc.
 */
app.use(helmet());

// Rate Limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 auth attempts per 15 min
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware - CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL
].filter(Boolean);

// In development, allow all origins
const corsOptions = process.env.NODE_ENV === 'development'
    ? { origin: true, credentials: true }
    : {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    };

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(generalLimiter);

// Routes with specific rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/admin', adminRoutes);  // Admin routes (require auth + admin role)
app.use('/api/feedback', require('./routes/feedback'));  // Feedback routes

// Health check
app.get('/api/health', async (req, res) => {
    const dbConnected = db.isConfigured() ? await db.testConnection().catch(() => false) : false;

    res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'not configured',
        r2: r2.isConfigured() ? 'configured' : 'not configured',
        timestamp: new Date().toISOString(),
        version: '2.2.0'  // Major: Admin API added, security improvements
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await db.close();
    process.exit(0);
});

// Start server
async function start() {
    // Test database connection on startup
    if (db.isConfigured()) {
        await db.testConnection();
    }

    app.listen(PORT, () => {
        const dbStatus = db.isConfigured() ? '✅ CockroachDB' : '⚠️  Not configured';
        const r2Status = r2.isConfigured() ? '✅ Configured' : '⚠️  Not configured';

        console.log(`
╔═══════════════════════════════════════════════════════╗
║            👑 REIGN API Server v2.2.0 👑              ║
╠═══════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                   ║
║  Database:   ${dbStatus}                       ║
║  R2 Storage: ${r2Status}                       ║
╚═══════════════════════════════════════════════════════╝
        `);

        if (!db.isConfigured()) {
            console.log('\n⚠️  To enable database, set DATABASE_URL in api/.env\n');
        }
    });
}

start();
