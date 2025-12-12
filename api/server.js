/**
 * King Daily API Server
 * Backend for Authentication and Cloud Sync with Cloudflare R2
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const syncRoutes = require('./routes/sync');
const r2 = require('./lib/r2');
const auth = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        r2Configured: r2.isConfigured(),
        timestamp: new Date().toISOString()
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

// Start server
async function start() {
    // Load existing users from R2
    await auth.loadUsersFromR2(r2);

    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║         👑 King Daily API Server 👑              ║
╠══════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}               ║
║  R2 Status: ${r2.isConfigured() ? '✅ Configured' : '⚠️  Not configured (check .env)'}           ║
╚══════════════════════════════════════════════════╝
        `);

        if (!r2.isConfigured()) {
            console.log('\n⚠️  To enable cloud sync, fill in your R2 credentials in api/.env\n');
        }
    });
}

start();
