const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/summary', async (req, res) => {
  try {
    const [sales, expenses, drawings, inventory, products] = await Promise.all([
      prisma.sale.findMany({ include: { items: { include: { product: true } } } }),
      prisma.expense.findMany(),
      prisma.drawing.findMany(),
      prisma.inventory.findMany({ include: { product: true } }),
      prisma.product.findMany(),
    ]);

    const cashAtHand = sales.filter((s) => s.status === 'PAID').reduce((s, sale) => s + sale.amountPaid, 0);
    const totalRevenue = sales.reduce((s, sale) => s + sale.amountPaid, 0);
    const outstandingBalance = sales.reduce((s, sale) => s + sale.balance, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDrawings = drawings.reduce((s, d) => s + d.amount, 0);
    const totalPurchases = await prisma.purchase.aggregate({ _sum: { totalGHS: true } });
    const cogs = sales.reduce((s, sale) =>
      s + sale.items.reduce((is, item) => is + item.quantity * (item.product?.costPrice || 0), 0), 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses - totalDrawings;
    const cashflow = totalRevenue - totalExpenses - totalDrawings - (totalPurchases._sum.totalGHS || 0);

    const stockValue = inventory.reduce((s, inv) => s + inv.quantity * inv.product.costPrice, 0);

    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: { customer: true, soldBy: { select: { name: true } } },
    });

    const lowStock = inventory.filter((inv) => inv.quantity <= 5 && inv.location === 'WAREHOUSE');

    res.json({ totalRevenue, outstandingBalance, totalExpenses, totalDrawings, stockValue, recentSales, lowStock, cashAtHand, netProfit, cashflow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, soldById } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }
    if (soldById) where.soldById = soldById;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        soldBy: { select: { name: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { saleDate: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
    });
    const products = await prisma.product.findMany();
    const users = await prisma.user.findMany({ where: { role: 'OUTLET' }, select: { id: true, name: true } });

    const report = products.map((p) => {
      const invEntries = inventory.filter((i) => i.productId === p.id);
      const warehouse = invEntries.find((i) => i.location === 'WAREHOUSE')?.quantity || 0;
      const outletBreakdown = {};
      for (const u of users) {
        outletBreakdown[u.name] = invEntries.find((i) => i.holderId === u.id)?.quantity || 0;
      }
      const total = invEntries.reduce((s, i) => s + i.quantity, 0);
      return { product: p, warehouse, outletBreakdown, total };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    }

    const salesWhere = Object.keys(dateFilter).length ? { saleDate: dateFilter } : {};
    const expenseWhere = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const [sales, expenses, purchases, drawings] = await Promise.all([
      prisma.sale.findMany({ where: salesWhere, include: { items: { include: { product: true } } } }),
      prisma.expense.findMany({ where: expenseWhere }),
      prisma.purchase.findMany({ where: Object.keys(dateFilter).length ? { purchaseDate: dateFilter } : {} }),
      prisma.drawing.findMany({ where: Object.keys(dateFilter).length ? { date: dateFilter } : {} }),
    ]);

    const totalRevenue = sales.reduce((s, sale) => s + sale.amountPaid, 0);
    const cogs = sales.reduce((s, sale) =>
      s + sale.items.reduce((is, item) => is + item.quantity * (item.product.costPrice || 0), 0), 0);
    const grossProfit = totalRevenue - cogs;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDrawings = drawings.reduce((s, d) => s + d.amount, 0);
    const netProfit = grossProfit - totalExpenses - totalDrawings;
    const fxGainLoss = purchases.reduce((s, p) => s + (p.fxGainLoss || 0), 0);

    res.json({ totalRevenue, cogs, grossProfit, totalExpenses, totalDrawings, fxGainLoss, netProfit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/expenses', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    res.json({ expenses, byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/product-velocity', async (req, res) => {
  try {
    const now = new Date();
    const [products, purchaseItems, saleItems, inventory] = await Promise.all([
      prisma.product.findMany(),
      prisma.purchaseItem.findMany({ include: { purchase: { select: { purchaseDate: true } } } }),
      prisma.saleItem.findMany({ include: { sale: { select: { saleDate: true } } } }),
      prisma.inventory.findMany(),
    ]);

    const receivedMap = {};
    for (const pi of purchaseItems) {
      const d = pi.purchase.purchaseDate;
      if (!receivedMap[pi.productId]) receivedMap[pi.productId] = { totalReceived: 0, firstReceived: d };
      receivedMap[pi.productId].totalReceived += pi.quantity;
      if (d < receivedMap[pi.productId].firstReceived) receivedMap[pi.productId].firstReceived = d;
    }

    const soldMap = {};
    for (const si of saleItems) {
      const d = si.sale.saleDate;
      if (!soldMap[si.productId]) soldMap[si.productId] = { totalSold: 0, lastSold: d };
      soldMap[si.productId].totalSold += si.quantity;
      if (d > soldMap[si.productId].lastSold) soldMap[si.productId].lastSold = d;
    }

    const stockMap = {};
    for (const inv of inventory) stockMap[inv.productId] = (stockMap[inv.productId] || 0) + inv.quantity;

    const result = products.map((p) => {
      const received = receivedMap[p.id] || { totalReceived: 0, firstReceived: null };
      const sold = soldMap[p.id] || { totalSold: 0, lastSold: null };
      const currentStock = stockMap[p.id] || 0;

      const daysInSystem = received.firstReceived
        ? (now - new Date(received.firstReceived)) / 86400000 : null;
      const daysSinceLastSale = sold.lastSold
        ? (now - new Date(sold.lastSold)) / 86400000 : null;

      const weeklyVelocity = daysInSystem > 0
        ? Math.round((sold.totalSold / daysInSystem) * 7 * 100) / 100 : 0;
      const stockWeeksRemaining = weeklyVelocity > 0
        ? Math.round((currentStock / weeklyVelocity) * 10) / 10 : null;

      let classification = 'STAGNANT';
      if (daysSinceLastSale !== null && daysSinceLastSale < 30 && weeklyVelocity >= 3) classification = 'FAST';
      else if (daysSinceLastSale !== null && daysSinceLastSale < 30 && weeklyVelocity >= 0.5) classification = 'SLOW';

      return {
        productId: p.id, name: p.name, sku: p.sku, category: p.category, brand: p.brand,
        totalReceived: received.totalReceived, totalSold: sold.totalSold, currentStock,
        firstReceived: received.firstReceived, lastSold: sold.lastSold,
        daysInSystem: daysInSystem ? Math.floor(daysInSystem) : null,
        daysSinceLastSale: daysSinceLastSale !== null ? Math.floor(daysSinceLastSale) : null,
        weeklyVelocity, stockWeeksRemaining, classification,
      };
    });

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let data = [];
    let sheetName = type;

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        include: { customer: true, soldBy: { select: { name: true } }, items: { include: { product: true } } },
        orderBy: { saleDate: 'desc' },
      });
      data = sales.map((s) => ({
        Date: s.saleDate.toISOString().split('T')[0],
        'Invoice #': s.id.slice(-8).toUpperCase(),
        Customer: s.customer?.name || 'Walk-in',
        'Sold By': s.soldBy.name,
        Items: s.items.map((i) => `${i.product.name} x${i.quantity}`).join(', '),
        Total: s.totalAmount,
        Paid: s.amountPaid,
        Balance: s.balance,
        Status: s.status,
      }));
    } else if (type === 'inventory') {
      const inventory = await prisma.inventory.findMany({ include: { product: true } });
      const products = await prisma.product.findMany();
      data = products.map((p) => {
        const invEntries = inventory.filter((i) => i.productId === p.id);
        const warehouseQty = invEntries.find((i) => i.location === 'WAREHOUSE')?.quantity || 0;
        const total = invEntries.reduce((s, i) => s + i.quantity, 0);
        return { Name: p.name, SKU: p.sku, Brand: p.brand, Category: p.category, 'Warehouse Qty': warehouseQty, Total: total };
      });
    } else if (type === 'expenses') {
      const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
      data = expenses.map((e) => ({
        Date: e.date.toISOString().split('T')[0],
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency,
        Notes: e.notes || '',
      }));
    } else if (type === 'pl') {
      const [sales, expenses] = await Promise.all([prisma.sale.findMany(), prisma.expense.findMany()]);
      const totalRevenue = sales.reduce((s, sale) => s + sale.amountPaid, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      data = [
        { Item: 'Total Revenue', Amount: totalRevenue },
        { Item: 'Total Expenses', Amount: totalExpenses },
        { Item: 'Net Profit', Amount: totalRevenue - totalExpenses },
      ];
    } else if (type === 'velocity') {
      const now = new Date();
      const [products, purchaseItems, saleItems, inventory] = await Promise.all([
        prisma.product.findMany(),
        prisma.purchaseItem.findMany({ include: { purchase: { select: { purchaseDate: true } } } }),
        prisma.saleItem.findMany({ include: { sale: { select: { saleDate: true } } } }),
        prisma.inventory.findMany(),
      ]);
      const receivedMap = {};
      for (const pi of purchaseItems) {
        const d = pi.purchase.purchaseDate;
        if (!receivedMap[pi.productId]) receivedMap[pi.productId] = { totalReceived: 0, firstReceived: d };
        receivedMap[pi.productId].totalReceived += pi.quantity;
        if (d < receivedMap[pi.productId].firstReceived) receivedMap[pi.productId].firstReceived = d;
      }
      const soldMap = {};
      for (const si of saleItems) {
        const d = si.sale.saleDate;
        if (!soldMap[si.productId]) soldMap[si.productId] = { totalSold: 0, lastSold: d };
        soldMap[si.productId].totalSold += si.quantity;
        if (d > soldMap[si.productId].lastSold) soldMap[si.productId].lastSold = d;
      }
      const stockMap = {};
      for (const inv of inventory) stockMap[inv.productId] = (stockMap[inv.productId] || 0) + inv.quantity;
      data = products.map((p) => {
        const received = receivedMap[p.id] || { totalReceived: 0, firstReceived: null };
        const sold = soldMap[p.id] || { totalSold: 0, lastSold: null };
        const currentStock = stockMap[p.id] || 0;
        const daysInSystem = received.firstReceived ? (now - new Date(received.firstReceived)) / 86400000 : null;
        const daysSinceLastSale = sold.lastSold ? (now - new Date(sold.lastSold)) / 86400000 : null;
        const weeklyVelocity = daysInSystem > 0 ? Math.round((sold.totalSold / daysInSystem) * 7 * 100) / 100 : 0;
        let classification = 'STAGNANT';
        if (daysSinceLastSale !== null && daysSinceLastSale < 30 && weeklyVelocity >= 3) classification = 'FAST';
        else if (daysSinceLastSale !== null && daysSinceLastSale < 30 && weeklyVelocity >= 0.5) classification = 'SLOW';
        return {
          Product: p.name, SKU: p.sku, Category: p.category,
          'First Received': received.firstReceived ? new Date(received.firstReceived).toISOString().split('T')[0] : '—',
          'Total Received': received.totalReceived, 'Total Sold': sold.totalSold,
          'Current Stock': currentStock, 'Weekly Velocity': weeklyVelocity,
          'Days Since Last Sale': daysSinceLastSale !== null ? Math.floor(daysSinceLastSale) : 'Never',
          Status: classification,
        };
      });
      sheetName = 'Product Velocity';
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=stratmount-${type}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
