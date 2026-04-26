# Strat Mount — Business Management System

A full-stack business management application for a perfume and gadgets trading business operating out of Ghana, sourcing from UAE, UK, and Ghana.

## Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS + Zustand + TanStack Query
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + Role-based access control

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Configure the server

Edit `server/.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/stratmount_db"
JWT_SECRET="your-secret-key"
```

### 3. Set up the database

```bash
npm run db:setup
```

This runs migrations and seeds the database with sample data.

### 4. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@stratmount.com | admin123 |
| Warehouse | kaleb@stratmount.com | kaleb123 |
| Outlet 1 | outlet1@stratmount.com | outlet123 |
| Outlet 2 | outlet2@stratmount.com | outlet123 |

> **Note**: Admin will be prompted to change password on first login.

## User Roles

- **Admin**: Full access to all features, reports, and user management
- **Warehouse (Kaleb)**: Inventory, purchases, sales, payments — no financial reports
- **Outlet Partner**: Own stock view, record sales and payments with proof upload

## Features

- Multi-currency support (GHS, USD, GBP, AED) with exchange rate tracking
- Inventory management with warehouse/outlet assignment
- Sales tracking with receipt generation and WhatsApp sharing
- Payment recording with proof-of-payment image upload
- Profit & Loss reporting with FX gain/loss calculation
- Excel export for sales, inventory, expenses, and P&L
- Mobile-responsive dark theme UI
- Role-based access control enforced at API level
