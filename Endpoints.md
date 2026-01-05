# REIGN API Endpoints Documentation

**Base URL:** `https://reign-nz5m.onrender.com` (Production) | `http://localhost:3001` (Local)

**API Version:** 2.2.0

---

## Table of Contents
1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [Sync](#sync)
4. [Relationships](#relationships)
5. [Feedback](#feedback)
6. [Admin](#admin)
7. [Local Testing Strategy](#local-testing-strategy)

---

## Health Check

### GET `/api/health`
Check API server status and database connectivity.

**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "r2": "configured",
  "timestamp": "2026-01-05T03:00:00.000Z",
  "version": "2.2.0"
}
```

**Test:**
```bash
curl http://localhost:3001/api/health
```

---

## Authentication

### POST `/api/auth/register`
Create a new user account.

**Auth Required:** No  
**Rate Limit:** 10 requests / 15 min

**Body:**
```json
{
  "name": "Kingsley A",
  "email": "king@example.com",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI...",
  "user": {
    "id": "uuid-here",
    "name": "Kingsley A",
    "email": "king@example.com",
    "initials": "KA"
  }
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!"}'
```

---

### POST `/api/auth/login`
Login with email/phone and password.

**Auth Required:** No  
**Rate Limit:** 10 requests / 15 min

**Body:**
```json
{
  "email": "king@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI...",
  "user": { "id": "...", "name": "...", "email": "...", "initials": "...", "role": "user" }
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","rememberMe":true}'
```

---

### GET `/api/auth/profile`
Get current user profile.

**Auth Required:** Yes (Bearer Token)

**Test:**
```bash
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT `/api/auth/profile`
Update user profile.

**Auth Required:** Yes

**Body:**
```json
{
  "name": "New Name"
}
```

**Test:**
```bash
curl -X PUT http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Name"}'
```

---

### POST `/api/auth/avatar`
Upload user avatar (max 500KB).

**Auth Required:** Yes  
**Content-Type:** multipart/form-data

**Test:**
```bash
curl -X POST http://localhost:3001/api/auth/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

---

### DELETE `/api/auth/avatar`
Remove user avatar.

**Auth Required:** Yes

**Test:**
```bash
curl -X DELETE http://localhost:3001/api/auth/avatar \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT `/api/auth/password`
Change user password.

**Auth Required:** Yes

**Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Test:**
```bash
curl -X PUT http://localhost:3001/api/auth/password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Old123!","newPassword":"New456!"}'
```

---

### DELETE `/api/auth/account`
Delete user account permanently.

**Auth Required:** Yes

**Test:**
```bash
curl -X DELETE http://localhost:3001/api/auth/account \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST `/api/auth/forgot-password`
Request password reset email.

**Auth Required:** No

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

### POST `/api/auth/reset-password`
Reset password using token from email.

**Auth Required:** No

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

---

### PUT `/api/auth/security-question`
Set security question for password recovery.

**Auth Required:** Yes

**Body:**
```json
{
  "question": "What is your pet's name?",
  "answer": "Fluffy",
  "password": "current-password"
}
```

---

## Sync

### GET `/api/sync`
Download user data from cloud.

**Auth Required:** Yes

**Response:**
```json
{
  "data": { "logs": [...], "settings": {...} },
  "lastSync": "2026-01-05T03:00:00.000Z",
  "source": "database"
}
```

**Test:**
```bash
curl http://localhost:3001/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST `/api/sync`
Upload user data to cloud.

**Auth Required:** Yes

**Body:**
```json
{
  "appData": { "logs": [...], "settings": {...} },
  "localTimestamp": "2026-01-05T03:00:00.000Z"
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appData":{"logs":[],"settings":{}},"localTimestamp":"2026-01-05T00:00:00Z"}'
```

---

### POST `/api/sync/force`
Force upload, overwriting cloud data.

**Auth Required:** Yes

---

### GET `/api/sync/status`
Check sync configuration status.

**Auth Required:** Yes

**Response:**
```json
{
  "configured": true,
  "hasData": true,
  "lastSync": "2026-01-05T03:00:00.000Z",
  "source": "database"
}
```

---

## Relationships

### GET `/api/relationships`
Get all user relationships.

**Auth Required:** Yes

**Query Params:**
- `purpose` - Filter by purpose
- `favorite` - Filter favorites only
- `classification` - Filter by classification

**Response:**
```json
{
  "relationships": [...],
  "grouped": {...},
  "total": 5,
  "purposes": ["friend", "family", "mentor", ...],
  "classifications": ["close", "acquaintance", ...]
}
```

**Test:**
```bash
curl http://localhost:3001/api/relationships \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET `/api/relationships/:id`
Get specific relationship.

**Auth Required:** Yes

---

### POST `/api/relationships`
Create new relationship.

**Auth Required:** Yes

**Body:**
```json
{
  "name": "John Doe",
  "gender": "male",
  "purpose": "friend",
  "classification": "close",
  "whatTheyDid": "Helped me move",
  "notes": "Met in college"
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/relationships \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","purpose":"friend","classification":"close"}'
```

---

### PUT `/api/relationships/:id`
Update relationship.

**Auth Required:** Yes

---

### PATCH `/api/relationships/:id/favorite`
Toggle favorite status.

**Auth Required:** Yes

---

### DELETE `/api/relationships/:id`
Delete relationship.

**Auth Required:** Yes

---

## Feedback

### POST `/api/feedback`
Submit user feedback (public).

**Auth Required:** Optional (includes user_id if logged in)

**Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "message": "Great app!",
  "rating": 5,
  "persona": "king",
  "pageContext": "/app/morning.html"
}
```

**Test:**
```bash
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Testing feedback"}'
```

---

### GET `/api/feedback`
List all feedback (admin only).

**Auth Required:** Yes (Admin)

**Query Params:**
- `status` - pending, reviewed, resolved, archived
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

---

### GET `/api/feedback/stats`
Get feedback statistics (admin only).

**Auth Required:** Yes (Admin)

**Response:**
```json
{
  "total": 100,
  "pending": 50,
  "reviewed": 30,
  "resolved": 20,
  "avg_rating": 4.5
}
```

---

### PUT `/api/feedback/:id/status`
Update feedback status (admin only).

**Auth Required:** Yes (Admin)

**Body:**
```json
{
  "status": "reviewed",
  "adminNotes": "Reviewed and noted"
}
```

---

### DELETE `/api/feedback/:id`
Delete feedback (admin only).

**Auth Required:** Yes (Admin)

---

## Admin

> **All Admin endpoints require:** Bearer Token + `role: admin` or `role: superadmin`

### GET `/api/admin/users`
List all users with pagination.

**Query Params:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `status` - active, suspended
- `role` - user, admin, superadmin
- `search` - Search by name/email
- `sortBy` - createdAt, name, email
- `sortOrder` - asc, desc

**Test:**
```bash
curl http://localhost:3001/api/admin/users?page=1&limit=10 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### GET `/api/admin/users/:id`
Get detailed user information.

---

### PUT `/api/admin/users/:id`
Update user (name, email, role, status).

**Body:**
```json
{
  "name": "Updated Name",
  "role": "admin",
  "status": "suspended"
}
```

---

### DELETE `/api/admin/users/:id`
Delete user account.

---

### GET `/api/admin/analytics`
Get platform analytics.

---

### GET `/api/admin/audit-log`
View audit log entries.

---

### POST `/api/admin/announcements`
Create announcement.

---

### GET `/api/admin/announcements`
List announcements.

---

### DELETE `/api/admin/announcements/:id`
Delete announcement.

---

## Local Testing Strategy

### Prerequisites
```bash
cd api
npm install
cp .env.example .env
# Edit .env with your credentials
```

### 1. Start Local Server
```bash
cd api
npm start
# Server runs on http://localhost:3001
```

### 2. Test Health Endpoint
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","database":"connected",...}
```

### 3. Authentication Flow Test
```bash
# Step 1: Register
REGISTER=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test123!"}')
TOKEN=$(echo $REGISTER | jq -r '.token')

# Step 2: Login
LOGIN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}')
TOKEN=$(echo $LOGIN | jq -r '.token')

# Step 3: Get Profile
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Sync Flow Test
```bash
# Upload data
curl -X POST http://localhost:3001/api/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appData":{"logs":[{"date":"2026-01-05","entries":[]}]}}'

# Download data
curl http://localhost:3001/api/sync \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Relationships Test
```bash
# Create
curl -X POST http://localhost:3001/api/relationships \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","purpose":"friend","classification":"close"}'

# List
curl http://localhost:3001/api/relationships \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Feedback Test
```bash
# Submit (no auth required)
curl -X POST http://localhost:3001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Tester","email":"test@test.com","message":"Great app!","rating":5}'
```

### 7. Admin Test (requires admin account)
```bash
# Create admin first (run script)
node scripts/create-admin.js

# Login as admin
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reign.app","password":"AdminPassword123!"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')

# Get all users
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get feedback
curl http://localhost:3001/api/feedback \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 8. Run Automated Tests
```bash
cd api
npm test
```

---

## Error Response Format

All errors return JSON:
```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (database not configured)

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 10 req / 15 min |
| `/api/auth/register` | 10 req / 15 min |
| All other endpoints | 100 req / 15 min |

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-secret

# Optional
PORT=3001
FRONTEND_URL=https://reign-pi.vercel.app
NODE_ENV=production

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_USER=user
SMTP_PASS=password

# R2 Storage (optional)
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_ENDPOINT=...
```

---

**Last Updated:** 2026-01-05  
**API Version:** 2.2.0
