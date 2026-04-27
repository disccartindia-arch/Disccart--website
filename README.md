# DISCCART - AI-Powered Coupon & Deals Platform

India's smartest coupon and deals platform with AI-powered deal scoring, verified coupons, and affiliate tracking.

## Features
- AI Deal Score (0-100) with smart ranking
- Verified coupon detection (Verified / Possibly Expired / Unverified)
- Admin Panel with CRUD for Deals, Categories, Blogs, Pages, Pretty Links
- Pretty Links URL shortener with click tracking
- Blog CMS with Markdown support
- SEO optimized (Sitemap, Meta Tags, Robots.txt)
- Google Analytics 4 integration
- Social sharing (WhatsApp, Telegram, Instagram)
- Mobile responsive design

## Tech Stack
- **Frontend**: React.js, TailwindCSS, Shadcn UI, Framer Motion
- **Backend**: FastAPI (Python), Motor (async MongoDB)
- **Database**: MongoDB
- **Auth**: JWT with httpOnly cookies

## Quick Start (Local Development)

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with required variables (see DEPLOYMENT_GUIDE.md)
uvicorn main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# Create .env with REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

## Deployment
See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for complete instructions.

## Admin Access
- URL: `/admin`
- Default: `disccartindia@gmail.com` / `Admin@2026@`

## License
Private - All rights reserved.
