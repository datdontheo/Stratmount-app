const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const purchases = await tx.purchase.findMany({
        where: { supplierId: req.params.id },
        select: { id: true },
      });
      const purchaseIds = purchases.map((p) => p.id);
      if (purchaseIds.length) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
        await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
      }
      await tx.supplier.delete({ where: { id: req.params.id } });
    });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { supplierId: req.params.id },
      include: { items: { include: { product: true } } },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
