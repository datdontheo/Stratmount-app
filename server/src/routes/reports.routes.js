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
      prisma.sale.findMany({ include: { items: true } }),
      prisma.expense.findMany(),
      prisma.drawing.findMany(),
      prisma.inventory.findMany({ include: { product: true } }),
      prisma.product.findMany(),
    ]);

    const totalRevenue = sales.reduce((s, sale) => s + sale.amountPaid, 0);
    const outstandingBalance = sales.reduce((s, sale) => s + sale.balance, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDrawings = drawings.reduce((s, d) => s + d.amount, 0);

    const stockValue = inventory.reduce((s, inv) => s + inv.quantity * inv.product.costPrice, 0);

    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { saleDate: 'desc' },
      include: { customer: true, soldBy: { select: { name: true } } },
    });

    const lowStock = inventory.filter((inv) => inv.quantity <= 5 && inv.location === 'WAREHOUSE');

    res.json({ totalRevenue, outstandingBalance, totalExpenses, totalDrawings, stockValue, recentSales, lowStock });
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
