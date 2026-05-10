# Deployment Guide - Strat Mount

## Local Development Setup

### Prerequisites
- Node.js 18+
- SQLite (automatic, no installation needed)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   npm run install:all
   ```

2. **Setup local database:**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env and set DATABASE_URL to SQLite:
   # DATABASE_URL="file:./dev.db"
   ```

3. **Create database and seed sample data:**
   ```bash
   npm run db:push
   node prisma/seed.js
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   # Frontend: http://localhost:5173
   # Backend: http://localhost:3001
   ```

5. **Login with sample credentials:**
   - Email: `outlet1@stratmount.com`
   - Password: `outlet123`

---

## Production Deployment with Supabase

### Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click **Settings** → **Database**
3. Copy the **Connection String (URI)** in PostgreSQL format:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
   ```

### Step 2: Configure Environment Variables

Create `server/.env` with your Supabase credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
JWT_SECRET="your-secure-random-key-min-32-chars"
PORT=3001
NODE_ENV="production"
ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com"
```

### Step 3: Update Prisma Schema to PostgreSQL

Make sure `server/prisma/schema.prisma` uses PostgreSQL:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Step 4: Deploy Database Schema

```bash
cd server
npx prisma migrate deploy
```

This will:
- Create all tables in Supabase
- Apply migrations
- **PRESERVE your existing data** (does NOT delete anything)

### Step 5: ⚠️ IMPORTANT - DO NOT SEED PRODUCTION DATA

**NEVER run `node prisma/seed.js` on Supabase** - this will overwrite your real business data with sample data!

The seed script is ONLY for local development testing.

✅ **Safe to run seed on LOCAL (SQLite):**
```bash
# Local development only - safe to reset
node prisma/seed.js
```

❌ **NEVER run on PRODUCTION (Supabase):**
```bash
# DO NOT DO THIS ON PRODUCTION!
node prisma/seed.js  # This will delete your real data!
```

Your Supabase already has your real data. The migrations will just set up the schema without touching your existing records.

### Step 6: Deploy Backend

Choose your hosting platform:

#### Option A: Vercel (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

#### Option B: Railway / Render
1. Connect GitHub repo
2. Set environment variables
3. Deploy

#### Option C: Self-hosted (AWS EC2, DigitalOcean, etc.)
1. Clone repo
2. Install Node.js and dependencies
3. Set environment variables
4. Run: `npm run server`
5. Use PM2 or similar for process management

### Step 7: Deploy Frontend

#### Option A: Vercel
```bash
npm run build
# Push to GitHub, Vercel auto-deploys
```

#### Option B: GitHub Pages / Netlify
Build and deploy static files from `client/dist/`

#### Option C: Same server as backend
Build frontend and serve from backend using Express static middleware

---

## Syncing Data Between Local and Supabase

### Export Data from Local SQLite
```bash
cd server
sqlite3 dev.db ".dump" > backup.sql
```

### Import to Supabase
1. Go to Supabase SQL Editor
2. Paste SQL from backup.sql
3. Run it

### Or use Prisma Studio
```bash
cd server
npx prisma studio
```
This opens a GUI to manage data in real-time.

---

## Environment Variables Reference

| Variable | Local Dev | Production | Notes |
|----------|-----------|------------|-------|
| `DATABASE_URL` | `file:./dev.db` | Supabase URI | Connection string to database |
| `DIRECT_URL` | Not needed | Supabase URI | Direct connection for migrations |
| `JWT_SECRET` | Any string | Secure random key | Change this! Min 32 chars |
| `PORT` | 3001 | 3001 or 8080 | API server port |
| `NODE_ENV` | development | production | Enables optimizations |
| `ALLOWED_ORIGINS` | localhost | Your domain | CORS allowed origins |

---

## Troubleshooting

### Database Connection Error
- Check DATABASE_URL format
- Verify Supabase project is active (not paused)
- Check password doesn't have special characters (or URL-encode them)

### Migration Fails
```bash
# Reset migrations (careful - deletes data!)
rm -rf server/prisma/migrations
npx prisma migrate dev --name init
```

### Frontend Can't Connect to Backend
- Check ALLOWED_ORIGINS in .env
- Verify backend is running on correct port
- Check browser console for CORS errors

### Data Not Syncing
- Run migrations: `npx prisma migrate deploy`
- Check Supabase dashboard that tables exist
- Verify JWT token is valid

---

## Git Workflow

**Never commit .env file to GitHub:**

```bash
# .env is already in .gitignore
# Copy .env.example for reference:
cp server/.env.example server/.env
# Edit with your actual credentials
# Start development
npm run dev
```

For team members:
1. Clone repo
2. Copy `.env.example` to `.env`
3. Fill in their own database credentials
4. Run `npm install && npm run install:all`
5. Run `npm run dev`

---

## Next Steps

1. ✅ Test locally with `npm run dev`
2. ✅ Commit code to GitHub (without .env file)
3. ✅ Set up Supabase project
4. ✅ Add environment variables to hosting platform
5. ✅ Deploy!

Questions? Check the README.md or open an issue.
