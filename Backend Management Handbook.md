# Reign - Backend Management Handbook

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Critical Production Issues](#critical-production-issues)
3. [Database Implementation Plan](#database-implementation-plan)
4. [Security Hardening](#security-hardening)
5. [Deployment Guide](#deployment-guide)
6. [API Reference](#api-reference)
7. [Environment Variables](#environment-variables)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Cost Estimation](#cost-estimation)

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REIGN ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Frontend (PWA)          Backend API           Storage      │
│   ─────────────          ───────────           ─────────     │
│                                                              │
│   ┌──────────┐          ┌──────────┐          ┌──────────┐  │
│   │ index.   │   HTTP   │ Express  │   S3     │ Cloudflare│ │
│   │ html     │ ───────► │ server.js│ ───────► │ R2        │ │
│   │ queen.   │          │ :3001    │          │           │ │
│   │ html     │          └──────────┘          └──────────┘  │
│   │ admin.   │               │                              │
│   │ html     │               ▼                              │
│   └──────────┘          ┌──────────┐                        │
│                         │ In-Memory│  ⚠️ DATA LOST ON       │
│                         │ Map()    │     SERVER RESTART!    │
│                         └──────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Current Tech Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Server | Express.js | ✅ Working |
| Auth | JWT + bcrypt | ✅ Working |
| Storage | Cloudflare R2 | ✅ Configured |
| User Store | **In-Memory Map()** | ⚠️ CRITICAL |
| Rate Limiting | express-rate-limit | ✅ Working |
| File Upload | multer | ✅ Working |

---

## Critical Production Issues

### 🚨 CRITICAL #1: In-Memory User Storage

**Problem:** Users are stored in a JavaScript `Map()` in memory. When the server restarts, ALL USER DATA IS LOST.

**Location:** `api/lib/auth.js`, line 14

```javascript
// In-memory user store (replace with R2 storage in production)
const users = new Map();
```

**Impact:**
- Users lose accounts on every server restart
- Cannot scale horizontally (no shared state)
- No data persistence

**Solution:** Implement PostgreSQL or MongoDB database

---

### 🚨 CRITICAL #2: Fallback JWT Secret

**Problem:** JWT uses an insecure fallback secret if not configured.

**Location:** `api/lib/auth.js`, line 10

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-not-for-production';
```

**Impact:**
- Anyone can forge authentication tokens
- Complete security bypass

**Solution:** Always set `JWT_SECRET` in production with a 256-bit random string

---

### ⚠️ HIGH #3: CORS Wide Open in Development

**Problem:** All origins allowed in development mode.

**Location:** `api/server.js`, lines 44-45

```javascript
const corsOptions = process.env.NODE_ENV === 'development'
    ? { origin: true, credentials: true }
```

**Solution:** Always run `NODE_ENV=production` in production

---

### ⚠️ HIGH #4: No HTTPS Enforcement

**Problem:** No SSL/TLS configuration in the server.

**Solution:** Use a reverse proxy (Nginx, Caddy) or platform with automatic SSL (Railway, Render)

---

## Database Implementation Plan

### Option A: PostgreSQL (Recommended)

**Pros:** Relational, ACID compliant, great for structured data, free tiers available

#### Step 1: Install Dependencies

```bash
cd api
npm install pg knex
```

#### Step 2: Create Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    initials VARCHAR(2),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User data (JSON blob for app data)
CREATE TABLE user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Sessions table (for refresh tokens)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log (for admin)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target VARCHAR(50) DEFAULT 'all',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
```

#### Step 3: Update auth.js

Replace in-memory Map with database calls:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createUser(userData) {
    const { name, email, password } = userData;
    const hashedPassword = await hashPassword(password);
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, initials) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, name, avatar_url, initials, role, created_at`,
        [email.toLowerCase(), hashedPassword, name, initials]
    );

    return result.rows[0];
}

async function findUserByEmail(email) {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    return result.rows[0] || null;
}
```

#### Step 4: Database Providers (Free Tiers)

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Supabase** | 500MB, 2 projects | Best overall |
| **Neon** | 512MB, 1 project | Serverless PostgreSQL |
| **Railway** | $5 credit/month | Easy deployment |
| **PlanetScale** | 1 billion rows | MySQL alternative |

---

### Option B: MongoDB (Alternative)

**Pros:** Flexible schema, JSON-like documents, easy to start

```bash
npm install mongoose
```

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    role: { type: String, default: 'user' },
    appData: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});
```

---

## Security Hardening

### Checklist Before Production

| Item | Priority | Status |
|------|----------|--------|
| Set strong JWT_SECRET (256-bit) | 🔴 CRITICAL | ❌ |
| Use HTTPS only | 🔴 CRITICAL | ❌ |
| Set NODE_ENV=production | 🔴 CRITICAL | ❌ |
| Configure CORS whitelist | 🟡 HIGH | ✅ |
| Rate limiting enabled | 🟡 HIGH | ✅ |
| Password hashing (bcrypt) | 🟡 HIGH | ✅ |
| Input validation | 🟡 HIGH | ✅ |
| Helmet.js for headers | 🟡 HIGH | ❌ |
| SQL injection prevention | 🟡 HIGH | N/A |
| Admin role verification | 🟢 MEDIUM | ❌ |

### Generate Secure JWT Secret

```bash
# Generate 256-bit random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Add Helmet.js

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Deployment Guide

### Option 1: Railway (Recommended)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd api
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Set environment variables
railway variables set JWT_SECRET=your-secret
railway variables set NODE_ENV=production

# 6. Deploy
railway up
```

### Option 2: Render

1. Connect GitHub repository
2. Create Web Service from `api` directory
3. Set environment variables
4. Add PostgreSQL database
5. Deploy

### Option 3: VPS (DigitalOcean, Linode)

```bash
# 1. SSH into server
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install PM2
npm install -g pm2

# 4. Clone repo
git clone https://github.com/Kingsley-A1/personal.git
cd personal/api

# 5. Install dependencies
npm install

# 6. Configure environment
cp .env.example .env
nano .env  # Edit with real values

# 7. Start with PM2
pm2 start server.js --name reign-api
pm2 save
pm2 startup
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/avatar` | Upload avatar |

### Data Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync` | Download user data |
| POST | `/api/sync` | Upload user data |

### Admin (To Implement)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | Get user details |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/analytics` | Platform stats |
| POST | `/api/admin/announce` | Send announcement |

---

## Environment Variables

### Required for Production

```env
# Server
NODE_ENV=production
PORT=3001

# Security (REQUIRED!)
JWT_SECRET=your-256-bit-random-secret-here

# Database (REQUIRED!)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cloudflare R2 (Optional, for file storage)
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=reign-storage

# Frontend URL (for CORS)
FRONTEND_URL=https://your-domain.com
```

### Generate .env for Production

```bash
cat << EOF > .env.production
NODE_ENV=production
PORT=3001
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DATABASE_URL=your-database-url-here
FRONTEND_URL=https://your-domain.com
EOF
```

---

## Monitoring & Logging

### Recommended Tools

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **UptimeRobot** | Uptime monitoring | 50 monitors |
| **Sentry** | Error tracking | 5K errors/month |
| **Logtail** | Log aggregation | 1GB/month |
| **Grafana Cloud** | Metrics | 10K series |

### Basic Logging

```bash
npm install pino pino-http
```

```javascript
const pino = require('pino-http')();
app.use(pino);
```

### PM2 Logs

```bash
pm2 logs reign-api
pm2 logs reign-api --lines 100
```

---

## Backup & Recovery

### Database Backups

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20241214.sql
```

### Automated Backups (Supabase/Railway)

Both platforms offer automatic daily backups in their dashboards.

### R2 Backup Strategy

1. Enable versioning in R2 bucket settings
2. Set retention policy for 30 days
3. Consider cross-region replication for disaster recovery

---

## Cost Estimation

### Minimal Production Setup (Free)

| Service | Cost | Purpose |
|---------|------|---------|
| Render/Railway | Free | API hosting |
| Supabase | Free | PostgreSQL |
| Cloudflare R2 | Free (10GB) | File storage |
| UptimeRobot | Free | Monitoring |
| **Total** | **$0/month** | |

### Recommended Production Setup

| Service | Cost | Purpose |
|---------|------|---------|
| Railway Pro | $20/month | API + DB |
| Cloudflare R2 | ~$5/month | Storage |
| Sentry | Free | Error tracking |
| **Total** | **~$25/month** | |

### Scale-Up Costs (1000+ users)

| Service | Cost | Purpose |
|---------|------|---------|
| Railway/Render Pro | $50/month | Scaled API |
| Supabase Pro | $25/month | Managed DB |
| Cloudflare R2 | ~$15/month | More storage |
| **Total** | **~$90/month** | |

---

## Implementation Priority

### Phase 1: Critical (Do First)

1. [ ] Set up PostgreSQL database
2. [ ] Migrate from in-memory Map to database
3. [ ] Set strong JWT_SECRET
4. [ ] Configure HTTPS

### Phase 2: Security

5. [ ] Add Helmet.js
6. [ ] Implement admin role checks
7. [ ] Add audit logging
8. [ ] Set up error tracking (Sentry)

### Phase 3: Features

9. [ ] Implement admin API endpoints
10. [ ] Add real-time updates (WebSockets)
11. [ ] Email notifications
12. [ ] Password reset flow

### Phase 4: Operations

13. [ ] Set up monitoring
14. [ ] Configure automated backups
15. [ ] Load testing
16. [ ] Performance optimization

---

## Quick Reference Commands

```bash
# Start development server
cd api && npm start

# Run with watch mode
npm run dev

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test API health
curl http://localhost:3001/api/health

# View PM2 logs
pm2 logs reign-api

# Restart PM2 process
pm2 restart reign-api
```

---

## Support

For issues:
1. Check this handbook
2. Review server logs: `pm2 logs`
3. Test health endpoint: `/api/health`
4. Open GitHub issue

---

*Last updated: December 2024*
*Version: 2.0*
