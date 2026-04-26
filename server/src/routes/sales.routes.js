const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const where = req.user.role === 'OUTLET' ? { soldById: req.user.id } : {};
    const { status, startDate, endDate } = req.query;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true, role: true } },
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

router.get('/:id', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
        payments: { include: { paidBy: { select: { id: true, name: true } } } },
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (req.user.role === 'OUTLET' && sale.soldById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, items, notes, currency, amountPaid, saleDate } = req.body;
    const soldById = req.user.role === 'OUTLET' ? req.user.id : (req.body.soldById || req.user.id);

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const paid = amountPaid || 0;
    const balance = totalAmount - paid;
    const status = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

    const sale = await prisma.sale.create({
      data: {
        customerId: customerId || null,
        soldById,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        totalAmount,
        amountPaid: paid,
        balance,
        currency: currency || 'GHS',
        status,
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    // Deduct from inventory
    for (const item of items) {
      const location = req.user.role === 'OUTLET' ? `OUTLET_${req.user.id}` : 'WAREHOUSE';
      const inv = await prisma.inventory.findFirst({ where: { productId: item.productId, location } });
      if (inv && inv.quantity >= item.quantity) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { notes, receiptSent } = req.body;
    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: { notes, receiptSent },
      include: { customer: true, items: { include: { product: true } }, payments: true },
    });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/receipt', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { name: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
