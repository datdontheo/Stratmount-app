# Strat Mount - Quick Start Guide

## ⚡ 5-Minute Setup

### For Local Development (with sample data)

```bash
# 1. Install dependencies
npm install && npm run install:all

# 2. Setup local database
cd server
cp .env.example .env
# DATABASE_URL should be: file:./dev.db

# 3. Create database with sample data
npm run db:push
node prisma/seed.js

# 4. Start both servers
cd ..
npm run dev
```

**Open:** http://localhost:5173
**Login:** 
- Email: `outlet1@stratmount.com`
- Password: `outlet123`

---

## 🚀 Production Setup (Connect to Your Supabase Data)

### When You Have Internet:

```bash
# 1. Update server/.env with Supabase credentials
cd server
nano .env  # or edit in your editor
```

**Replace with your Supabase info:**
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
JWT_SECRET="change-this-to-random-key"
NODE_ENV="production"
```

### 2. Update Prisma Schema to PostgreSQL

Edit `server/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3. Deploy Schema to Supabase

```bash
npx prisma migrate deploy
```

**This will:**
- ✅ Create tables in Supabase (if they don't exist)
- ✅ Apply any new migrations
- ✅ **KEEP your existing data** (does NOT delete anything)

### 4. Start the servers

```bash
npm run dev
```

**Now your app will show YOUR REAL DATA from Supabase! 🎉**

---

## ⚠️ CRITICAL - Protect Your Data

### ❌ NEVER do this on production:
```bash
node prisma/seed.js  # This WILL overwrite your real data with samples!
```

### ✅ ONLY do this locally:
```bash
# Local development only
cd server
npm run db:push
node prisma/seed.js  # Safe - just SQLite
```

---

## 📊 How Data Syncing Works

### Local Development (SQLite)
```
Your App ↔️ Local SQLite Database (dev.db)
- Sample data for testing
- Easy to reset with: rm dev.db && node prisma/seed.js
```

### Production (Supabase)
```
Your App ↔️ Supabase PostgreSQL Database
- Your REAL business data
- Same Prisma schema
- Migrations sync schema, data stays intact
```

---

## 🔄 Switching Between Local and Production

### To work LOCALLY (sample data):
1. `.env`: `DATABASE_URL="file:./dev.db"`
2. Schema: SQLite provider
3. Run: `npm run dev`

### To work with REAL DATA (Supabase):
1. `.env`: `DATABASE_URL="postgresql://..."`
2. Schema: PostgreSQL provider
3. Run: `npm run dev`

Both use the same code - just different database!

---

## 🐛 Troubleshooting

**"Cannot connect to Supabase"**
- Check internet connection
- Verify DATABASE_URL is correct
- Check Supabase project isn't paused

**"Data disappeared"**
- ❌ Did you run `node prisma/seed.js`? (This overwrites data!)
- ✅ Restore from Supabase backup if available
- Always test on LOCAL first!

**"Migration failed"**
- Ensure NODE_ENV is not "production" locally
- Or set NODE_ENV="development" in .env

---

## 📚 Full Documentation

See `DEPLOYMENT.md` for complete setup guide with all platforms and advanced options.

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Start both servers
npm run server          # Backend only
npm run client          # Frontend only

# Database
npm run db:push         # Create schema
npm run db:studio       # Open database GUI
npx prisma migrate dev  # Create new migration (local only)
npx prisma migrate deploy  # Apply migrations (production)

# Testing (LOCAL ONLY - never on Supabase!)
node prisma/seed.js     # Add sample data
```

---

**Ready to go! Your data is safe. 🛡️**
