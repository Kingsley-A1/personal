# Reign - Backend Management Handbook

## Overview

This document provides guidance on hosting, deploying, and managing the Reign backend API.

---

## Current Architecture

```
┌─────────────────┐      ┌─────────────────┐
│   Frontend      │──────│   Backend API   │
│   (Static)      │      │   (Node.js)     │
│   Netlify/      │      │   localhost:3001│
│   Vercel        │      │                 │
└─────────────────┘      └─────────────────┘
                                  │
                         ┌────────┴────────┐
                         │    Database     │
                         │    (SQLite/     │
                         │    PostgreSQL)  │
                         └─────────────────┘
```

---

## Deployment Options

### Option 1: Railway (Recommended)

**Pros:** Easy deployment, free tier, automatic SSL, PostgreSQL included

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd api
railway init
railway up
```

**Environment Variables:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-secret
NODE_ENV=production
```

---

### Option 2: Render

**Pros:** Free tier for hobby projects, automatic deploys from GitHub

1. Create account at [render.com](https://render.com)
2. Connect GitHub repository
3. Create new "Web Service"
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables

---

### Option 3: Fly.io

**Pros:** Global edge deployment, generous free tier

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
cd api
fly launch
fly deploy
```

---

### Option 4: DigitalOcean App Platform

**Pros:** Predictable pricing, good performance

1. Create DigitalOcean account
2. Create App from GitHub
3. Configure environment variables
4. Deploy

---

## Database Options

### SQLite (Development)
- **Location:** `api/database.sqlite`
- **Pros:** Zero config, file-based
- **Cons:** Not suitable for production with multiple instances

### PostgreSQL (Production)
- **Providers:**
  - Supabase (Free tier)
  - Railway (Included)
  - Neon (Generous free tier)
  - PlanetScale (MySQL alternative)

**Migration from SQLite to PostgreSQL:**
```bash
# Update knexfile.js for PostgreSQL
npm install pg

# Run migrations
npx knex migrate:latest --env production
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT tokens | `your-256-bit-secret` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3001` |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/avatar` | Upload avatar |
| GET | `/api/sync` | Get synced data |
| POST | `/api/sync` | Sync data |

---

## Monitoring & Logging

### Recommended Tools:
- **Logging:** Pino, Winston
- **Monitoring:** UptimeRobot (free), Better Uptime
- **Error Tracking:** Sentry (free tier)

### Basic Health Check:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});
```

---

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure JWT secret (256+ bits)
- [ ] Enable CORS with specific origins
- [ ] Rate limit API endpoints
- [ ] Validate all user inputs
- [ ] Use parameterized database queries
- [ ] Keep dependencies updated

---

## Frontend Configuration

Update `js/config.js` for production:

```javascript
const Config = {
    API_URL: 'https://your-api-domain.com/api',
    // ...
};
```

---

## Troubleshooting

### "Failed to fetch" Error
- **Cause:** Backend not running or CORS issue
- **Solution:** 
  1. Start backend: `cd api && npm start`
  2. Check CORS settings in backend
  3. Verify API_URL in config.js

### Database Connection Errors
- **Cause:** Invalid DATABASE_URL or database offline
- **Solution:**
  1. Verify credentials
  2. Check database status
  3. Test connection: `npx knex migrate:status`

---

## Quick Start Commands

```bash
# Development
cd api
npm install
npm start

# Production build
npm run build
npm run start:prod
```

---

## Cost Estimation (Monthly)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway | $5 credit/month | $20+ |
| Render | 750 hrs/month | $7+ |
| Fly.io | 3 shared VMs | $5+ |
| Supabase | 500MB DB | $25+ |

---

## Support

For issues with the Reign backend:
1. Check this handbook
2. Review error logs
3. Open GitHub issue

---

*Last updated: December 2024*
