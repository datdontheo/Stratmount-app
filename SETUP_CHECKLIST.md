# Strat Mount Setup Checklist

## ✅ What's Already Done (Local Development)

- [x] SQLite database created with sample data
- [x] Prisma schema configured for SQLite
- [x] Backend server running (port 3001/random)
- [x] Frontend server running (port 5173)
- [x] Login system working
- [x] Sample data seeded and visible in app
- [x] `.env.example` created for reference
- [x] `DEPLOYMENT.md` guide created
- [x] `QUICKSTART.md` created
- [x] Seed script protected (won't run on production)

---

## 📋 TODO: Connect to Your Supabase Data

### When you have internet access:

- [ ] **Get Supabase credentials**
  - [ ] Go to supabase.com dashboard
  - [ ] Open your project
  - [ ] Settings → Database → Connection String
  - [ ] Copy PostgreSQL URI

- [ ] **Update server/.env**
  ```bash
  cp server/.env.example server/.env
  # Edit with your Supabase credentials:
  # DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
  # DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
  ```

- [ ] **Update Prisma schema**
  - [ ] Change `server/prisma/schema.prisma`:
    ```prisma
    datasource db {
      provider  = "postgresql"
      url       = env("DATABASE_URL")
      directUrl = env("DIRECT_URL")
    }
    ```

- [ ] **Deploy schema to Supabase**
  ```bash
  cd server
  npx prisma migrate deploy
  ```

- [ ] **Restart servers**
  ```bash
  npm run dev
  ```

- [ ] **Verify YOUR data appears**
  - [ ] Login at http://localhost:5173
  - [ ] Check that your real sales/customers/products show
  - [ ] ✅ If you see your data, syncing is complete!

---

## 🚀 TODO: Push to GitHub

- [ ] **Create .gitignore entries** (should already exist)
  - [ ] `.env` (never commit this!)
  - [ ] `node_modules/`
  - [ ] `dev.db`
  - [ ] `.DS_Store`

- [ ] **Commit code**
  ```bash
  git add .
  git commit -m "Initial commit: Strat Mount business management system"
  git push origin main
  ```

- [ ] **Verify on GitHub**
  - [ ] Code is pushed
  - [ ] `.env` file is NOT there (only `.env.example` exists)
  - [ ] All documentation files exist

---

## 🌐 TODO: Deploy to Production

Choose one platform:

### Option 1: Vercel (Recommended)
- [ ] Connect GitHub repo to Vercel
- [ ] Add environment variables in Vercel dashboard
- [ ] Set `NODE_ENV=production`
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Test on live URL

### Option 2: Railway
- [ ] Connect GitHub repo
- [ ] Add PostgreSQL plugin
- [ ] Configure environment variables
- [ ] Deploy both services

### Option 3: Self-hosted
- [ ] Purchase server (AWS, DigitalOcean, Linode)
- [ ] Install Node.js
- [ ] Clone repo
- [ ] Set environment variables
- [ ] Use PM2 for process management
- [ ] Setup reverse proxy (Nginx)

---

## 🛡️ CRITICAL SECURITY CHECKLIST

Before going live:

- [ ] Change `JWT_SECRET` to a strong random key
  - [ ] Use: `openssl rand -base64 32`
  - [ ] Never share this key

- [ ] Set `NODE_ENV=production` on production server

- [ ] Update `ALLOWED_ORIGINS` to your domain(s)
  ```env
  ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
  ```

- [ ] Ensure `.env` file is NEVER committed to GitHub

- [ ] Enable HTTPS on your domain

- [ ] Backup Supabase data regularly
  - [ ] Supabase → Settings → Backups

- [ ] Test login with strong passwords

---

## 📞 Support

**If something goes wrong:**

1. Check `DEPLOYMENT.md` troubleshooting section
2. Check `QUICKSTART.md` for common issues
3. Look at server logs: `server/.logs` or terminal output
4. Check browser console (F12) for errors

**Common Issues:**

| Problem | Solution |
|---------|----------|
| "Can't connect to Supabase" | Check internet, verify DATABASE_URL |
| "Data disappeared" | Did you run seed.js? (Delete it from prod!) |
| "Login fails" | Check ALLOWED_ORIGINS in .env |
| "Blank page" | Check browser console for errors (F12) |

---

## 📊 Progress Summary

```
Local Development:     ✅ COMPLETE
├── SQLite Database    ✅
├── Sample Data        ✅
├── Backend API        ✅
├── Frontend UI        ✅
└── Login System       ✅

Supabase Connection:   ⏳ PENDING (need internet)
├── Get credentials    ⏳
├── Update .env        ⏳
├── Deploy schema      ⏳
└── Verify data        ⏳

GitHub:                ⏳ PENDING
├── Push code          ⏳
├── Protect .env       ✅
└── Document setup     ✅

Production Deploy:     ⏳ FUTURE
└── Choose platform    ⏳
```

---

**Your app is ready for local testing and GitHub! Once you have internet, just follow the Supabase checklist above to sync your real data. 🚀**
