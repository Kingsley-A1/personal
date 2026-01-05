# REIGN Deployment Guide

## Hosting Architecture

```
┌─────────────────┐      API Calls      ┌─────────────────┐
│   FRONTEND      │ ──────────────────▶ │    BACKEND      │
│   (Vercel)      │                     │    (Render)     │
│   Static Files  │                     │   Express API   │
│   reign.vercel.app                    │reign-nz5m.onrender.com
└─────────────────┘                     └─────────────────┘
                                               │
                                               │ SQL
                                               ▼
                                    ┌─────────────────┐
                                    │   DATABASE      │
                                    │(CockroachDB Free)│
                                    └─────────────────┘
```

---

## 1. Deploy Frontend to Vercel

### Step 1: Push to GitHub
```bash
cd c:\Users\KING MADU\Desktop\REIGN
git init
git add .
git commit -m "Initial commit - REIGN platform"
git remote add origin https://github.com/Kingsley-A1/reign.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `reign` repository
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `.` (root)
   - **Build Command**: Leave empty
   - **Output Directory**: `.`
5. Click "Deploy"

### Step 3: Your Frontend URL
- Free domain: `reign-xxxx.vercel.app`
- Or set custom domain in Vercel dashboard

---

## 2. Deploy Backend to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create New Web Service
1. Click "+ New" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - **Name**: `reign-api`
   - **Root Directory**: `api`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Set Environment Variables
In Render dashboard → Environment:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | Your CockroachDB connection string |
| `JWT_SECRET` | (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `FRONTEND_URL` | `https://reign.vercel.app` |

### Step 4: Deploy
Click "Create Web Service" - Render will build and deploy.

Your API URL: `https://reign-nz5m.onrender.com`

---

## 3. Connect Frontend to Backend

### Update vercel.json
The `vercel.json` already has API rewrites configured:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://reign-nz5m.onrender.com/api/$1"
    }
  ]
}
```

Update the destination URL with your actual Render URL.

---

## 4. Database Setup (CockroachDB)

### Free Tier
1. Go to [cockroachlabs.cloud](https://cockroachlabs.cloud)
2. Create a free Serverless cluster
3. Get connection string from "Connect" → "Connection String"
4. Add to Render environment as `DATABASE_URL`

### Initialize Tables
Run the schema migration via the API's database initialization endpoint or manually via CockroachDB console.

---

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Vercel** | Unlimited static sites, 100GB bandwidth/month |
| **Render** | 750 hours/month (spins down after 15min idle) |
| **CockroachDB** | 10GB storage, 50M request units/month |

---

## Testing Deployment

### Health Check
```bash
curl https://reign-nz5m.onrender.com/api/health
```

### Frontend
Visit: `https://reign.vercel.app`

---

## Custom Domain (Optional)

### Vercel
1. Go to Settings → Domains
2. Add your domain (e.g., `reign.yourdomain.com`)
3. Update DNS as instructed

### Render
1. Go to Settings → Custom Domains
2. Add your API domain (e.g., `api.reign.yourdomain.com`)

---

## Troubleshooting

### Backend Cold Starts
Render free tier spins down after 15 min idle. First request may take 30-60 seconds.

### CORS Errors
Ensure `FRONTEND_URL` in Render matches your Vercel domain exactly.

### API 404
Check vercel.json rewrites point to correct Render URL.
