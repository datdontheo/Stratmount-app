const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    // Safety check — only run if no admin exists yet
    const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existing) {
      return res.json({ message: 'Database already seeded. Nothing to do.', alreadySeeded: true });
    }

    const adminPassword = await bcrypt.hash('admin123', 12);
    const kalebPassword = await bcrypt.hash('kaleb123', 12);
    const outletPassword = await bcrypt.hash('outlet123', 12);

    const admin = await prisma.user.create({
      data: { name: 'Admin', email: 'admin@stratmount.com', password: adminPassword, role: 'ADMIN', mustChangePassword: true },
    });
    const kaleb = await prisma.user.create({
      data: { name: 'Kaleb', email: 'kaleb@stratmount.com', password: kalebPassword, role: 'WAREHOUSE' },
    });
    const outlet1 = await prisma.user.create({
      data: { name: 'Outlet Partner 1', email: 'outlet1@stratmount.com', password: outletPassword, role: 'OUTLET' },
    });
    const outlet2 = await prisma.user.create({
      data: { name: 'Outlet Partner 2', email: 'outlet2@stratmount.com', password: outletPassword, role: 'OUTLET' },
    });

    const uaeSupplier = await prisma.supplier.create({ data: { name: 'Dubai Fragrance House', country: 'UAE', currency: 'AED', contact: '+971 50 123 4567' } });
    const ukSupplier = await prisma.supplier.create({ data: { name: 'London Scents Ltd', country: 'UK', currency: 'GBP', contact: '+44 20 7946 0958' } });
    await prisma.supplier.create({ data: { name: 'Accra Imports Ltd', country: 'Ghana', currency: 'GHS', contact: '+233 24 123 4567' } });

    const products = await Promise.all([
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

    const inventoryData = [
      { productId: products[0].id, quantity: 20, location: 'WAREHOUSE' },
      { productId: products[1].id, quantity: 15, location: 'WAREHOUSE' },
      { productId: products[2].id, quantity: 25, location: 'WAREHOUSE' },
      { productId: products[3].id, quantity: 30, location: 'WAREHOUSE' },
      { productId: products[4].id, quantity: 40, location: 'WAREHOUSE' },
      { productId: products[0].id, quantity: 5, location: `OUTLET_${outlet1.id}`, holderId: outlet1.id },
      { productId: products[1].id, quantity: 3, location: `OUTLET_${outlet1.id}`, holderId: outlet1.id },
      { productId: products[2].id, quantity: 8, location: `OUTLET_${outlet2.id}`, holderId: outlet2.id },
      { productId: products[3].id, quantity: 10, location: `OUTLET_${outlet2.id}`, holderId: outlet2.id },
    ];
    for (const inv of inventoryData) await prisma.inventory.create({ data: inv });

    const cust1 = await prisma.customer.create({ data: { name: 'Kwame Mensah', phone: '+233 24 555 0001', type: 'DIRECT' } });
    const cust2 = await prisma.customer.create({ data: { name: 'Abena Owusu', phone: '+233 24 555 0002', type: 'DIRECT' } });

    await prisma.purchase.create({
      data: {
        supplierId: uaeSupplier.id, invoiceNumber: 'INV-UAE-001', purchaseDate: new Date('2024-01-15'),
        currency: 'AED', exchangeRate: 3.95, totalForeign: 5000, totalGHS: 19750,
        items: { create: [{ productId: products[0].id, quantity: 10, unitCost: 250, totalCost: 2500 }, { productId: products[1].id, quantity: 10, unitCost: 250, totalCost: 2500 }] },
      },
    });

    await prisma.sale.create({
      data: {
        customerId: cust1.id, soldById: admin.id, saleDate: new Date('2024-03-01'),
        totalAmount: 370, amountPaid: 370, balance: 0, status: 'PAID',
        items: { create: [{ productId: products[0].id, quantity: 1, unitPrice: 185, total: 185 }, { productId: products[2].id, quantity: 1, unitPrice: 150, total: 150 }, { productId: products[4].id, quantity: 1, unitPrice: 90, total: 90 }] },
        payments: { create: [{ paidById: admin.id, amount: 370, method: 'MOBILE_MONEY', paymentDate: new Date('2024-03-01') }] },
      },
    });

    await prisma.sale.create({
      data: {
        customerId: cust2.id, soldById: outlet1.id, saleDate: new Date('2024-03-05'),
        totalAmount: 420, amountPaid: 200, balance: 220, status: 'PARTIAL',
        items: { create: [{ productId: products[1].id, quantity: 1, unitPrice: 420, total: 420 }] },
        payments: { create: [{ paidById: outlet1.id, amount: 200, method: 'CASH', paymentDate: new Date('2024-03-05') }] },
      },
    });

    await prisma.expense.createMany({
      data: [
        { category: 'LOGISTICS', description: 'Shipping from UAE', amount: 850, date: new Date('2024-01-16') },
        { category: 'PACKAGING', description: 'Gift boxes and wrapping', amount: 200, date: new Date('2024-02-01') },
        { category: 'MARKETING', description: 'Social media ads', amount: 300, date: new Date('2024-02-15') },
      ],
    });

    await prisma.drawing.create({ data: { amount: 2000, description: 'Owner withdrawal - January', date: new Date('2024-01-31') } });

    res.json({
      message: '✅ Database seeded successfully!',
      credentials: {
        admin: 'admin@stratmount.com / admin123',
        warehouse: 'kaleb@stratmount.com / kaleb123',
        outlet1: 'outlet1@stratmount.com / outlet123',
        outlet2: 'outlet2@stratmount.com / outlet123',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
