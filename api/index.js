const path = require('path');

// Defaults — DATABASE_URL must be set in Vercel env vars (Supabase connection string)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'stratmount_demo_secret_change_for_production';
process.env.NODE_ENV   = process.env.NODE_ENV   || 'production';

require('dotenv').config();

let _ready = false;

async function ensureReady() {
  if (_ready) return;

  // Run migrations then seed if empty
  try {
    const { execSync } = require('child_process');
    const prismaPath = path.resolve(__dirname, '../node_modules/.bin/prisma');
    const schemaPath = path.resolve(__dirname, '../server/prisma/schema.prisma');
    execSync(`"${prismaPath}" migrate deploy --schema="${schemaPath}"`, {
      env: process.env,
      stdio: 'pipe',
    });
  } catch (e) {
    console.error('Migrate failed:', e.message);
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.user.count();
    if (count === 0) await runSeed(prisma);
    await prisma.$disconnect();
  } catch (e) {
    console.error('Seed check failed:', e.message);
  }

  _ready = true;
}

async function runSeed(prisma) {
  const bcrypt = require('bcryptjs');

  const [adminPw, kalebPw, outletPw] = await Promise.all([
    bcrypt.hash('admin123', 12),
    bcrypt.hash('kaleb123', 12),
    bcrypt.hash('outlet123', 12),
  ]);

  const admin   = await prisma.user.create({ data: { name: 'Admin', email: 'admin@stratmount.com', password: adminPw, role: 'ADMIN', mustChangePassword: true } });
  const kaleb   = await prisma.user.create({ data: { name: 'Kaleb', email: 'kaleb@stratmount.com', password: kalebPw, role: 'WAREHOUSE' } });
  const outlet1 = await prisma.user.create({ data: { name: 'Outlet Partner 1', email: 'outlet1@stratmount.com', password: outletPw, role: 'OUTLET' } });
  const outlet2 = await prisma.user.create({ data: { name: 'Outlet Partner 2', email: 'outlet2@stratmount.com', password: outletPw, role: 'OUTLET' } });

  const uae = await prisma.supplier.create({ data: { name: 'Dubai Fragrance House', country: 'UAE', currency: 'AED' } });
  const uk  = await prisma.supplier.create({ data: { name: 'London Scents Ltd', country: 'UK', currency: 'GBP' } });
  await prisma.supplier.create({ data: { name: 'Accra Imports Ltd', country: 'Ghana', currency: 'GHS' } });

  const [dior, creed, chanel, oud, earbuds] = await Promise.all([
    prisma.product.create({ data: { name: 'Dior Sauvage EDP 100ml', sku: 'DIOR-SAU-100', category: 'PERFUME', brand: 'Dior', unit: 'bottle', costPrice: 120, sellingPrice: 185, currency: 'GHS' } }),
    prisma.product.create({ data: { name: 'Creed Aventus EDP 100ml', sku: 'CREE-AVE-100', category: 'PERFUME', brand: 'Creed', unit: 'bottle', costPrice: 280, sellingPrice: 420, currency: 'GHS' } }),
    prisma.product.create({ data: { name: 'Chanel No.5 EDP 50ml', sku: 'CHAN-N5-050', category: 'PERFUME', brand: 'Chanel', unit: 'bottle', costPrice: 95, sellingPrice: 150, currency: 'GHS' } }),
    prisma.product.create({ data: { name: 'Arabian Oud Royale 50ml', sku: 'ARAB-OUD-050', category: 'PERFUME', brand: 'Arabian Oud', unit: 'bottle', costPrice: 75, sellingPrice: 130, currency: 'GHS' } }),
    prisma.product.create({ data: { name: 'Wireless Earbuds Pro', sku: 'GADG-EAR-001', category: 'GADGET', brand: 'Generic', unit: 'piece', costPrice: 55, sellingPrice: 90, currency: 'GHS' } }),
  ]);

  await prisma.exchangeRate.createMany({
    data: [
      { fromCurrency: 'USD', toCurrency: 'GHS', rate: 14.5, setBy: admin.id },
      { fromCurrency: 'GBP', toCurrency: 'GHS', rate: 18.2, setBy: admin.id },
      { fromCurrency: 'AED', toCurrency: 'GHS', rate: 3.95, setBy: admin.id },
    ],
  });

  await Promise.all([
    prisma.inventory.create({ data: { productId: dior.id,    quantity: 20, location: 'WAREHOUSE' } }),
    prisma.inventory.create({ data: { productId: creed.id,   quantity: 15, location: 'WAREHOUSE' } }),
    prisma.inventory.create({ data: { productId: chanel.id,  quantity: 25, location: 'WAREHOUSE' } }),
    prisma.inventory.create({ data: { productId: oud.id,     quantity: 30, location: 'WAREHOUSE' } }),
    prisma.inventory.create({ data: { productId: earbuds.id, quantity: 40, location: 'WAREHOUSE' } }),
    prisma.inventory.create({ data: { productId: dior.id,    quantity: 5,  location: `OUTLET_${outlet1.id}`, holderId: outlet1.id } }),
    prisma.inventory.create({ data: { productId: creed.id,   quantity: 3,  location: `OUTLET_${outlet1.id}`, holderId: outlet1.id } }),
    prisma.inventory.create({ data: { productId: chanel.id,  quantity: 8,  location: `OUTLET_${outlet2.id}`, holderId: outlet2.id } }),
    prisma.inventory.create({ data: { productId: oud.id,     quantity: 10, location: `OUTLET_${outlet2.id}`, holderId: outlet2.id } }),
  ]);

  const cust1 = await prisma.customer.create({ data: { name: 'Kwame Mensah', phone: '+233 24 555 0001', type: 'DIRECT' } });
  const cust2 = await prisma.customer.create({ data: { name: 'Abena Owusu', phone: '+233 24 555 0002', type: 'DIRECT' } });

  await prisma.purchase.create({
    data: {
      supplierId: uae.id, invoiceNumber: 'INV-UAE-001', purchaseDate: new Date('2024-01-15'),
      currency: 'AED', exchangeRate: 3.95, totalForeign: 5000, totalGHS: 19750,
      items: { create: [
        { productId: dior.id,  quantity: 10, unitCost: 250, totalCost: 2500 },
        { productId: creed.id, quantity: 10, unitCost: 250, totalCost: 2500 },
      ]},
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust1.id, soldById: admin.id, saleDate: new Date('2024-03-01'),
      totalAmount: 370, amountPaid: 370, balance: 0, status: 'PAID',
      items: { create: [
        { productId: dior.id,    quantity: 1, unitPrice: 185, total: 185 },
        { productId: chanel.id,  quantity: 1, unitPrice: 150, total: 150 },
        { productId: earbuds.id, quantity: 1, unitPrice: 90,  total: 90  },
      ]},
      payments: { create: [{ paidById: admin.id, amount: 370, method: 'MOBILE_MONEY', paymentDate: new Date('2024-03-01') }] },
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust2.id, soldById: outlet1.id, saleDate: new Date('2024-03-05'),
      totalAmount: 420, amountPaid: 200, balance: 220, status: 'PARTIAL',
      items: { create: [{ productId: creed.id, quantity: 1, unitPrice: 420, total: 420 }] },
      payments: { create: [{ paidById: outlet1.id, amount: 200, method: 'CASH', paymentDate: new Date('2024-03-05') }] },
    },
  });

  await prisma.expense.createMany({
    data: [
      { category: 'LOGISTICS', description: 'Shipping from UAE', amount: 850, date: new Date('2024-01-16') },
      { category: 'PACKAGING', description: 'Gift boxes', amount: 200, date: new Date('2024-02-01') },
      { category: 'MARKETING', description: 'Social media ads', amount: 300, date: new Date('2024-02-15') },
    ],
  });

  await prisma.drawing.create({ data: { amount: 2000, description: 'Owner withdrawal - January', date: new Date('2024-01-31') } });
  console.log('✅ Database seeded');
}

const app = require('../server/src/app');

module.exports = async (req, res) => {
  await ensureReady();
  app(req, res);
};
