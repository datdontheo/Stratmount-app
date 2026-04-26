const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const kalebPassword = await bcrypt.hash('kaleb123', 12);
  const outletPassword = await bcrypt.hash('outlet123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stratmount.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@stratmount.com',
      password: adminPassword,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  const kaleb = await prisma.user.upsert({
    where: { email: 'kaleb@stratmount.com' },
    update: {},
    create: {
      name: 'Kaleb',
      email: 'kaleb@stratmount.com',
      password: kalebPassword,
      role: 'WAREHOUSE',
    },
  });

  const outlet1 = await prisma.user.upsert({
    where: { email: 'outlet1@stratmount.com' },
    update: {},
    create: {
      name: 'Outlet Partner 1',
      email: 'outlet1@stratmount.com',
      password: outletPassword,
      role: 'OUTLET',
    },
  });

  const outlet2 = await prisma.user.upsert({
    where: { email: 'outlet2@stratmount.com' },
    update: {},
    create: {
      name: 'Outlet Partner 2',
      email: 'outlet2@stratmount.com',
      password: outletPassword,
      role: 'OUTLET',
    },
  });

  // Suppliers
  const uaeSupplier = await prisma.supplier.upsert({
    where: { id: 'supplier-uae' },
    update: {},
    create: {
      id: 'supplier-uae',
      name: 'Dubai Fragrance House',
      country: 'UAE',
      currency: 'AED',
      contact: '+971 50 123 4567',
      email: 'orders@dubaifrags.ae',
    },
  });

  const ukSupplier = await prisma.supplier.upsert({
    where: { id: 'supplier-uk' },
    update: {},
    create: {
      id: 'supplier-uk',
      name: 'London Scents Ltd',
      country: 'UK',
      currency: 'GBP',
      contact: '+44 20 7946 0958',
      email: 'trade@londonscents.co.uk',
    },
  });

  const ghanaSupplier = await prisma.supplier.upsert({
    where: { id: 'supplier-gh' },
    update: {},
    create: {
      id: 'supplier-gh',
      name: 'Accra Imports Ltd',
      country: 'Ghana',
      currency: 'GHS',
      contact: '+233 24 123 4567',
      email: 'info@accra-imports.com.gh',
    },
  });

  // Products
  const products = [
    {
      id: 'prod-dior',
      name: 'Dior Sauvage EDP 100ml',
      sku: 'DIOR-SAU-100',
      category: 'PERFUME',
      brand: 'Dior',
      description: 'Dior Sauvage Eau de Parfum 100ml',
      unit: 'bottle',
      costPrice: 120,
      sellingPrice: 185,
      currency: 'GHS',
    },
    {
      id: 'prod-creed',
      name: 'Creed Aventus EDP 100ml',
      sku: 'CREE-AVE-100',
      category: 'PERFUME',
      brand: 'Creed',
      description: 'Creed Aventus Eau de Parfum 100ml',
      unit: 'bottle',
      costPrice: 280,
      sellingPrice: 420,
      currency: 'GHS',
    },
    {
      id: 'prod-chanel',
      name: 'Chanel No.5 EDP 50ml',
      sku: 'CHAN-N5-050',
      category: 'PERFUME',
      brand: 'Chanel',
      description: 'Chanel No.5 Eau de Parfum 50ml',
      unit: 'bottle',
      costPrice: 95,
      sellingPrice: 150,
      currency: 'GHS',
    },
    {
      id: 'prod-oud',
      name: 'Arabian Oud Royale 50ml',
      sku: 'ARAB-OUD-050',
      category: 'PERFUME',
      brand: 'Arabian Oud',
      description: 'Premium Oud Royal fragrance',
      unit: 'bottle',
      costPrice: 75,
      sellingPrice: 130,
      currency: 'GHS',
    },
    {
      id: 'prod-airpods',
      name: 'Wireless Earbuds Pro',
      sku: 'GADG-EAR-001',
      category: 'GADGET',
      brand: 'Generic',
      description: 'Premium wireless earbuds with noise cancellation',
      unit: 'piece',
      costPrice: 55,
      sellingPrice: 90,
      currency: 'GHS',
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  // Exchange Rates
  const rates = [
    { fromCurrency: 'USD', toCurrency: 'GHS', rate: 14.5, setBy: admin.id },
    { fromCurrency: 'GBP', toCurrency: 'GHS', rate: 18.2, setBy: admin.id },
    { fromCurrency: 'AED', toCurrency: 'GHS', rate: 3.95, setBy: admin.id },
  ];

  for (const rate of rates) {
    await prisma.exchangeRate.create({ data: rate });
  }

  // Inventory - warehouse stock
  const inventoryData = [
    { productId: 'prod-dior', quantity: 20, location: 'WAREHOUSE' },
    { productId: 'prod-creed', quantity: 15, location: 'WAREHOUSE' },
    { productId: 'prod-chanel', quantity: 25, location: 'WAREHOUSE' },
    { productId: 'prod-oud', quantity: 30, location: 'WAREHOUSE' },
    { productId: 'prod-airpods', quantity: 40, location: 'WAREHOUSE' },
    { productId: 'prod-dior', quantity: 5, location: `OUTLET_${outlet1.id}`, holderId: outlet1.id },
    { productId: 'prod-creed', quantity: 3, location: `OUTLET_${outlet1.id}`, holderId: outlet1.id },
    { productId: 'prod-chanel', quantity: 8, location: `OUTLET_${outlet2.id}`, holderId: outlet2.id },
    { productId: 'prod-oud', quantity: 10, location: `OUTLET_${outlet2.id}`, holderId: outlet2.id },
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.create({ data: inv });
  }

  // Customers
  const cust1 = await prisma.customer.create({
    data: { name: 'Kwame Mensah', phone: '+233 24 555 0001', type: 'DIRECT' },
  });
  const cust2 = await prisma.customer.create({
    data: { name: 'Abena Owusu', phone: '+233 24 555 0002', type: 'DIRECT' },
  });
  const cust3 = await prisma.customer.create({
    data: { name: 'Kofi Trading', phone: '+233 24 555 0003', type: 'OUTLET' },
  });

  // Sample Purchases
  await prisma.purchase.create({
    data: {
      supplierId: uaeSupplier.id,
      invoiceNumber: 'INV-UAE-001',
      purchaseDate: new Date('2024-01-15'),
      currency: 'AED',
      exchangeRate: 3.95,
      totalForeign: 5000,
      totalGHS: 19750,
      fxGainLoss: 0,
      notes: 'Initial stock from UAE',
      items: {
        create: [
          { productId: 'prod-dior', quantity: 10, unitCost: 250, totalCost: 2500 },
          { productId: 'prod-creed', quantity: 10, unitCost: 250, totalCost: 2500 },
        ],
      },
    },
  });

  await prisma.purchase.create({
    data: {
      supplierId: ukSupplier.id,
      invoiceNumber: 'INV-UK-001',
      purchaseDate: new Date('2024-02-10'),
      currency: 'GBP',
      exchangeRate: 18.2,
      totalForeign: 1500,
      totalGHS: 27300,
      fxGainLoss: 150,
      notes: 'UK perfume batch',
      items: {
        create: [
          { productId: 'prod-chanel', quantity: 15, unitCost: 60, totalCost: 900 },
          { productId: 'prod-oud', quantity: 15, unitCost: 40, totalCost: 600 },
        ],
      },
    },
  });

  // Sample Sales
  const sale1 = await prisma.sale.create({
    data: {
      customerId: cust1.id,
      soldById: admin.id,
      saleDate: new Date('2024-03-01'),
      totalAmount: 370,
      amountPaid: 370,
      balance: 0,
      status: 'PAID',
      items: {
        create: [
          { productId: 'prod-dior', quantity: 1, unitPrice: 185, total: 185 },
          { productId: 'prod-chanel', quantity: 1, unitPrice: 150, total: 150 },
          { productId: 'prod-airpods', quantity: 1, unitPrice: 90, total: 90 },
        ],
      },
      payments: {
        create: [
          {
            paidById: admin.id,
            amount: 370,
            method: 'MOBILE_MONEY',
            paymentDate: new Date('2024-03-01'),
          },
        ],
      },
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust2.id,
      soldById: outlet1.id,
      saleDate: new Date('2024-03-05'),
      totalAmount: 420,
      amountPaid: 200,
      balance: 220,
      status: 'PARTIAL',
      items: {
        create: [{ productId: 'prod-creed', quantity: 1, unitPrice: 420, total: 420 }],
      },
      payments: {
        create: [
          {
            paidById: outlet1.id,
            amount: 200,
            method: 'CASH',
            paymentDate: new Date('2024-03-05'),
          },
        ],
      },
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust3.id,
      soldById: outlet2.id,
      saleDate: new Date('2024-03-08'),
      totalAmount: 260,
      amountPaid: 0,
      balance: 260,
      status: 'PENDING',
      items: {
        create: [
          { productId: 'prod-oud', quantity: 2, unitPrice: 130, total: 260 },
        ],
      },
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust1.id,
      soldById: admin.id,
      saleDate: new Date('2024-03-10'),
      totalAmount: 540,
      amountPaid: 540,
      balance: 0,
      status: 'PAID',
      items: {
        create: [
          { productId: 'prod-dior', quantity: 2, unitPrice: 185, total: 370 },
          { productId: 'prod-airpods', quantity: 1, unitPrice: 90, total: 90 },
          { productId: 'prod-oud', quantity: 1, unitPrice: 130, total: 130 },
        ],
      },
      payments: {
        create: [
          {
            paidById: admin.id,
            amount: 540,
            method: 'BANK_TRANSFER',
            paymentDate: new Date('2024-03-10'),
          },
        ],
      },
    },
  });

  await prisma.sale.create({
    data: {
      customerId: cust2.id,
      soldById: kaleb.id,
      saleDate: new Date('2024-03-12'),
      totalAmount: 185,
      amountPaid: 185,
      balance: 0,
      status: 'PAID',
      items: {
        create: [{ productId: 'prod-dior', quantity: 1, unitPrice: 185, total: 185 }],
      },
      payments: {
        create: [
          {
            paidById: kaleb.id,
            amount: 185,
            method: 'CASH',
            paymentDate: new Date('2024-03-12'),
          },
        ],
      },
    },
  });

  // Expenses
  await prisma.expense.createMany({
    data: [
      { category: 'LOGISTICS', description: 'Shipping from UAE', amount: 850, date: new Date('2024-01-16') },
      { category: 'PACKAGING', description: 'Gift boxes and wrapping', amount: 200, date: new Date('2024-02-01') },
      { category: 'MARKETING', description: 'Social media ads', amount: 300, date: new Date('2024-02-15') },
    ],
  });

  // Drawings
  await prisma.drawing.create({
    data: { amount: 2000, description: 'Owner withdrawal - January', date: new Date('2024-01-31') },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
