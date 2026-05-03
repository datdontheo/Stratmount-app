const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdminOrWarehouse, requireAdmin } = require('../middleware/role.middleware');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', requireAdminOrWarehouse, async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: [{ product: { name: 'asc' } }],
    });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { holderId: req.user.id },
      include: { product: true },
    });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/holders', requireAdminOrWarehouse, async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
    });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
    });

    const summary = {};
    for (const inv of inventory) {
      const key = inv.location;
      if (!summary[key]) summary[key] = { location: key, holderId: inv.holderId, items: [] };
      summary[key].items.push({ product: inv.product, quantity: inv.quantity });
    }

    res.json({ summary: Object.values(summary), users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/receive', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Product and quantity are required' });
    }
    const existing = await prisma.inventory.findFirst({
      where: { productId, location: 'WAREHOUSE' },
    });
    if (existing) {
      await prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await prisma.inventory.create({
        data: { productId, quantity, location: 'WAREHOUSE' },
      });
    }
    res.json({ message: 'Stock received into warehouse' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assign', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, toUserId, quantity, notes } = req.body;

    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser) return res.status(404).json({ error: 'User not found' });

    // Deduct from warehouse
    const warehouseInv = await prisma.inventory.findFirst({
      where: { productId, location: 'WAREHOUSE' },
    });
    if (!warehouseInv || warehouseInv.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient warehouse stock' });
    }

    await prisma.inventory.update({
      where: { id: warehouseInv.id },
      data: { quantity: { decrement: quantity } },
    });

    // Add to outlet
    const outletLocation = `OUTLET_${toUserId}`;
    const existing = await prisma.inventory.findFirst({
      where: { productId, location: outletLocation },
    });

    if (existing) {
      await prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await prisma.inventory.create({
        data: { productId, quantity, location: outletLocation, holderId: toUserId },
      });
    }

    await prisma.inventoryAssignment.create({
      data: { productId, toUserId, quantity, notes },
    });

    res.json({ message: 'Stock assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfer', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, fromLocation, toLocation, quantity, toUserId } = req.body;

    const fromInv = await prisma.inventory.findFirst({
      where: { productId, location: fromLocation },
    });
    if (!fromInv || fromInv.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock in source location' });
    }

    await prisma.inventory.update({
      where: { id: fromInv.id },
      data: { quantity: { decrement: quantity } },
    });

    const toInv = await prisma.inventory.findFirst({
      where: { productId, location: toLocation },
    });

    if (toInv) {
      await prisma.inventory.update({
        where: { id: toInv.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await prisma.inventory.create({
        data: { productId, quantity, location: toLocation, holderId: toUserId || null },
      });
    }

    res.json({ message: 'Stock transferred successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
