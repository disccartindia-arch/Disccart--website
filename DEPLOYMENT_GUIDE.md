# DISCCART - Complete Deployment Guide
## Split Deployment: Render (Backend) + Vercel (Frontend)

---

## Architecture Overview

```
[User Browser] → [Vercel - React Frontend] → [Render - FastAPI Backend] → [MongoDB Atlas]
                  (disccart.in)                (disccart-api.onrender.com)
```

---

## STEP 1: Set Up MongoDB Atlas (Free Tier)

MongoDB Atlas provides a free 512MB cloud database.

### 1.1 Create Account & Cluster
1. Go to **https://www.mongodb.com/cloud/atlas/register**
2. Sign up with Google or email
3. Choose **"FREE" Shared Cluster** (M0 Sandbox)
4. Select region: **Mumbai (ap-south-1)** for lowest latency in India
5. Cluster name: `disccart-cluster`
6. Click **"Create Deployment"**

### 1.2 Set Up Database Access
1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Authentication: Password
   - Username: `disccart_admin`
   - Password: Generate a secure password (save it!)
4. Database User Privileges: **"Read and write to any database"**
5. Click **"Add User"**

### 1.3 Set Up Network Access
1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
   - This is needed because Render uses dynamic IPs
4. Click **"Confirm"**

### 1.4 Get Connection String
1. Go to **Database** → Click **"Connect"** on your cluster
2. Choose **"Drivers"**
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://disccart_admin:<password>@disccart-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. **Save this string** — you'll need it for Render

---

## STEP 2: Deploy Backend on Render (Free Tier)

### 2.1 Push Code to GitHub
1. Use the **"Save to GitHub"** button in Emergent chat
2. Or manually create a GitHub repo and push the code

### 2.2 Create Render Account
1. Go to **https://render.com** → Sign up with GitHub

### 2.3 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `disccart-api`
   - **Region**: Singapore (closest to India)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

### 2.4 Set Environment Variables
In Render dashboard → Your service → **"Environment"** tab, add these:

| Key | Value |
|-----|-------|
| `MONGO_URL` | `mongodb+srv://disccart_admin:YOUR_PASSWORD@disccart-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | `disccart_db` |
| `JWT_SECRET` | (Click "Generate" for a random secret) |
| `CORS_ORIGINS` | `https://disccart.in,https://www.disccart.in` |
| `ADMIN_EMAIL` | `disccartindia@gmail.com` |
| `ADMIN_PASSWORD` | `Admin@2026@` |
| `RATE_LIMIT_REQUESTS` | `100` |
| `RATE_LIMIT_WINDOW` | `60` |
| `SITE_URL` | `https://disccart.in` |
| `PYTHON_VERSION` | `3.11.0` |

5. Click **"Save Changes"** → Render will auto-deploy

### 2.5 Verify Backend
Once deployed, visit:
```
https://disccart-api.onrender.com/api/
```
You should see:
```json
{"message": "DISCCART API v1.0", "status": "healthy"}
```

> **Note**: Render free tier sleeps after 15 min of inactivity. First request takes ~30s to wake up.

---

## STEP 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Account
1. Go to **https://vercel.com** → Sign up with GitHub

### 3.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Set Environment Variable
In the **"Environment Variables"** section, add:

| Key | Value |
|-----|-------|
| `VITE_BACKEND_URL` | `https://disccart-api.onrender.com` |

4. Click **"Deploy"**

### 3.4 Verify Frontend
Once deployed, Vercel gives you a URL like:
```
https://disccart-frontend.vercel.app
```
Visit it — your full DISCCART website should load!

---

## STEP 4: Connect Custom Domain (disccart.in)

### 4.1 Add Domain to Vercel
1. In Vercel dashboard → Your project → **"Settings"** → **"Domains"**
2. Add: `disccart.in`
3. Also add: `www.disccart.in`
4. Vercel will show you DNS records to configure

### 4.2 Configure DNS at Hostinger
1. Log in to **Hostinger** → **Domains** → **disccart.in** → **DNS / Nameservers**
2. Add these DNS records:

**For root domain (disccart.in):**
| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |

**For www subdomain:**
| Type | Name | Value |
|------|------|-------|
| CNAME | www | `cname.vercel-dns.com` |

3. **Remove** any existing A records or CNAME records for @ and www that conflict
4. Save changes

> **DNS propagation takes 5-30 minutes** (sometimes up to 48 hours)

### 4.3 Verify Domain
1. Go back to Vercel → Domains → Both should show ✅ green checkmark
2. Visit **https://disccart.in** — your site should load!
3. SSL certificate is automatic via Vercel

### 4.4 Update Render CORS
After domain is working, update `CORS_ORIGINS` in Render:
```
https://disccart.in,https://www.disccart.in
```

---

## STEP 5: Final Testing Checklist

| Test | URL | Expected |
|------|-----|----------|
| Homepage | https://disccart.in | Loads with deals |
| API Health | https://disccart-api.onrender.com/api/ | JSON response |
| Login | https://disccart.in/login | Login form works |
| Admin Panel | https://disccart.in/admin | Admin dashboard (after login) |
| Coupons | https://disccart.in/coupons | Coupon listing page |
| Blog | https://disccart.in/blog | Blog posts load |
| Static Pages | https://disccart.in/page/privacy-policy | Privacy page loads |
| Deal Cards | Click "Reveal Code" | Modal opens, code copies |
| Pretty Links | https://disccart.in/go/amazon-deals | Redirects to Amazon |

---

## Common Issues & Fixes

### Issue: "Application error" on Render
**Fix**: Check Render logs. Usually missing environment variable.
```
Dashboard → Your Service → Logs
```

### Issue: CORS errors in browser console
**Fix**: Update `CORS_ORIGINS` in Render to include your exact frontend URL.
Make sure there are NO trailing slashes.

### Issue: "MongoServerError: bad auth"
**Fix**: Your MongoDB password might have special characters.
URL-encode them: `@` → `%40`, `#` → `%23`, etc.

### Issue: Render free tier is slow
**Fix**: First request after sleep takes ~30s. Options:
- Use a cron service like **UptimeRobot** (free) to ping your API every 14 min
- URL to ping: `https://disccart-api.onrender.com/api/`

### Issue: Frontend shows blank page
**Fix**: Make sure `VITE_BACKEND_URL` is set in Vercel WITHOUT trailing slash:
- Correct: `https://disccart-api.onrender.com`
- Wrong: `https://disccart-api.onrender.com/`

### Issue: Login doesn't work (cookies)
**Fix**: Cookies with `httpOnly` require `SameSite=None; Secure` for cross-origin.
The backend already handles this. Make sure both frontend and backend use HTTPS.

---

## File Structure Reference

```
your-repo/
├── backend/
│   ├── app.py                  ← Render entry point (imports from server.py)
│   ├── main.py                 ← Alternative entry point
│   ├── server.py               ← All API logic
│   ├── Procfile                ← Render start command
│   ├── render.yaml             ← Render config (optional)
│   ├── requirements.txt        ← Full dependencies
│   ├── requirements.prod.txt   ← Minimal production deps
│   └── .env                    ← LOCAL only (not pushed to GitHub)
│
├── frontend/
│   ├── vite.config.js           ← Vite config (alias, server)
│   ├── tailwind.config.cjs      ← Tailwind CSS config
│   ├── postcss.config.cjs       ← PostCSS config
│   ├── index.html               ← Entry HTML (Vite root)
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   └── pages/
│   ├── package.json
│   ├── vercel.json             ← Vercel SPA routing config
│   └── .env                    ← LOCAL only (not pushed to GitHub)
│
├── memory/                     ← Dev docs (can exclude from deploy)
└── README.md
```

---

## Quick Reference: All Environment Variables

### Backend (Render)
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=disccart_db
JWT_SECRET=your-random-secret-key-here
CORS_ORIGINS=https://disccart.in,https://www.disccart.in
ADMIN_EMAIL=disccartindia@gmail.com
ADMIN_PASSWORD=Admin@2026@
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
SITE_URL=https://disccart.in
```

### Frontend (Vercel)
```env
VITE_BACKEND_URL=https://disccart-api.onrender.com
```

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 Free | $0/mo |
| Render | Free | $0/mo |
| Vercel | Hobby | $0/mo |
| Hostinger Domain | disccart.in | ~₹799/yr |
| **Total** | | **₹799/yr** (domain only) |

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Hostinger DNS**: https://support.hostinger.com/en/articles/1583227-how-to-change-dns-records

Happy deploying! 🚀
