# 🔄 Data Sync Guide - Strat Mount

## Your Data is SAFE ✅

Your original Supabase data will **NOT** be overwritten. Here's how the sync works:

---

## 📊 Two Separate Databases

### 1️⃣ Local Development (SQLite)
```
Your Computer
    ↓
    └─→ dev.db (SQLite)
         ├─ Sample customers (for testing)
         ├─ Sample products
         └─ Sample sales
```

**Purpose:** Test features locally without affecting real data

**What to do:** Safe to delete and recreate anytime
```bash
rm dev.db
node prisma/seed.js  # Creates fresh sample data
```

---

### 2️⃣ Production (Supabase PostgreSQL)
```
Supabase Cloud
    ↓
    └─→ PostgreSQL Database
         ├─ YOUR REAL customers
         ├─ YOUR REAL products  
         └─ YOUR REAL sales
```

**Purpose:** Production database with your actual business data

**What NOT to do:** ⚠️ NEVER run `node prisma/seed.js` here!

---

## 🔐 How Data Stays Safe

The seed script has a **PROTECTION LAYER**:

```javascript
// In prisma/seed.js:
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: Cannot seed production database!');
  process.exit(1);
}
```

**This means:**
- ✅ `node prisma/seed.js` works on **LOCAL** (NODE_ENV=development)
- ❌ `node prisma/seed.js` **FAILS** on **PRODUCTION** (NODE_ENV=production)

---

## 🔄 The Sync Process

### Step 1: Local Development (RIGHT NOW)
```
Your App (React)
    ↓
Your Backend (Express)
    ↓
SQLite Database (dev.db)
    ↓
Shows: Sample data for testing ✅
```

### Step 2: Switch to Supabase (When Internet Available)
```
1. Update .env with Supabase credentials
2. Change Prisma schema to PostgreSQL
3. Run: npx prisma migrate deploy
4. Your App now connects to Supabase
5. Shows: YOUR REAL DATA 🎉
```

**Same code, different database!**

---

## 📋 Detailed Sync Steps

### Before You Start (RIGHT NOW ✅)
- [x] Local SQLite database working
- [x] Sample data seeded
- [x] App running at localhost:5173
- [x] Login system working

### When Internet Available (NEXT STEP)
1. Get Supabase credentials
2. Update `server/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
   NODE_ENV="production"  # ← IMPORTANT!
   ```

3. Update `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```

4. Deploy schema:
   ```bash
   cd server
   npx prisma migrate deploy
   ```
   This creates tables in Supabase **without** touching your data

5. Restart app:
   ```bash
   npm run dev
   ```

6. Login and verify your real data appears ✅

---

## ⚠️ Critical Rules

### DO ✅
- ✅ Test locally with sample data
- ✅ Run `node prisma/seed.js` on LOCAL only
- ✅ Use Supabase for real data
- ✅ Keep `.env` file private (never commit to GitHub)
- ✅ Set `NODE_ENV=production` on Supabase

### DON'T ❌
- ❌ Run `node prisma/seed.js` on Supabase
- ❌ Copy sample data to production
- ❌ Commit `.env` file to GitHub
- ❌ Share your JWT_SECRET
- ❌ Use SQLite in production

---

## 🔍 How to Verify Data is Synced

### Check What Database You're Using

**Look at your `.env` file:**

```env
# LOCAL (sample data)
DATABASE_URL="file:./dev.db"

# PRODUCTION (real data)
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
```

### Check What Data Shows

**Login and look for:**
- ✅ Your real customer names
- ✅ Your real product SKUs
- ✅ Your real sales amounts
- ✅ Your real transaction history

---

## 🆘 Troubleshooting

### "I see sample data, not my real data"
**Check:**
1. Are you connected to Supabase? (Check .env DATABASE_URL)
2. Did migrations run? (`npx prisma migrate deploy`)
3. Are there network issues?

**Solution:**
```bash
# Check which database you're using:
cat server/.env | grep DATABASE_URL

# If it shows "file:./dev.db" - you're on local (sample data) ✅
# If it shows "postgresql://..." - you're on Supabase (should show real data)
```

### "I accidentally ran seed.js on Supabase!"
**Don't panic!** The protection layer prevents this:
```bash
# This command will FAIL on Supabase:
$ node prisma/seed.js
❌ ERROR: Cannot seed production database!
```

But if you somehow disabled protection, restore from Supabase backup:
1. Go to Supabase dashboard
2. Settings → Backups
3. Restore from backup

### "My data disappeared"
1. Check Supabase backup
2. Verify you ran migrations (not seed)
3. Check git history if code was changed

---

## 🎯 Summary

| Aspect | Local | Supabase |
|--------|-------|----------|
| **Database** | SQLite | PostgreSQL |
| **Data** | Sample (for testing) | Your REAL data |
| **Safe to reset?** | ✅ Yes (just delete dev.db) | ❌ No! Back up first |
| **Run seed.js?** | ✅ Yes (safe) | ❌ No! Protected anyway |
| **Migrations?** | ✅ Can run | ✅ Should run (safe) |
| **Production use?** | ❌ No | ✅ Yes |

---

## 📚 More Info

- **QUICKSTART.md** - Fast setup guide
- **DEPLOYMENT.md** - Complete deployment options
- **SETUP_CHECKLIST.md** - Step-by-step checklist

---

**Your data is safe. The system is designed to protect it. You're ready to sync!** 🛡️
