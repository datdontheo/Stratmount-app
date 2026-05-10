const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdminOrWarehouse, requireAdmin } = require('../middleware/role.middleware');

const prisma = require('../prisma');

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
    await prisma.inventory.upsert({
      where: { productId_location: { productId, location: 'WAREHOUSE' } },
      update: { quantity: { increment: quantity } },
      create: { productId, quantity, location: 'WAREHOUSE' },
    });
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

    const outletLocation = `OUTLET_${toUserId}`;

    await prisma.$transaction(async (tx) => {
      const warehouseInv = await tx.inventory.findUnique({
        where: { productId_location: { productId, location: 'WAREHOUSE' } },
      });
      if (!warehouseInv || warehouseInv.quantity < quantity) {
        throw new Error('Insufficient warehouse stock');
      }

      await tx.inventory.update({
        where: { productId_location: { productId, location: 'WAREHOUSE' } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.inventory.upsert({
        where: { productId_location: { productId, location: outletLocation } },
        update: { quantity: { increment: quantity } },
        create: { productId, quantity, location: outletLocation, holderId: toUserId },
      });

      await tx.inventoryAssignment.create({
        data: { productId, toUserId, quantity, notes },
      });
    });

    res.json({ message: 'Stock assigned successfully' });
  } catch (err) {
    const status = err.message === 'Insufficient warehouse stock' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.post('/return', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, fromUserId, quantity, notes } = req.body;
    if (!productId || !fromUserId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Product, user, and quantity are required' });
    }

    const outletLocation = `OUTLET_${fromUserId}`;

    await prisma.$transaction(async (tx) => {
      const outletInv = await tx.inventory.findUnique({
        where: { productId_location: { productId, location: outletLocation } },
      });
      if (!outletInv || outletInv.quantity < quantity) {
        throw new Error('Insufficient outlet stock to return');
      }

      await tx.inventory.update({
        where: { productId_location: { productId, location: outletLocation } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.inventory.upsert({
        where: { productId_location: { productId, location: 'WAREHOUSE' } },
        update: { quantity: { increment: quantity } },
        create: { productId, quantity, location: 'WAREHOUSE' },
      });
    });

    res.json({ message: 'Stock returned to warehouse' });
  } catch (err) {
    const status = err.message === 'Insufficient outlet stock to return' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.post('/writeoff', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, location, quantity, reason } = req.body;
    if (!productId || !location || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Product, location, and quantity are required' });
    }

    const inv = await prisma.inventory.findUnique({
      where: { productId_location: { productId, location } },
    });
    if (!inv || inv.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock to write off' });
    }

    await prisma.inventory.update({
      where: { productId_location: { productId, location } },
      data: { quantity: { decrement: quantity } },
    });

    res.json({ message: 'Stock written off' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfer', requireAdminOrWarehouse, async (req, res) => {
  try {
    const { productId, fromLocation, toLocation, quantity, toUserId } = req.body;

    await prisma.$transaction(async (tx) => {
      const fromInv = await tx.inventory.findUnique({
        where: { productId_location: { productId, location: fromLocation } },
      });
      if (!fromInv || fromInv.quantity < quantity) {
        throw new Error('Insufficient stock in source location');
      }

      await tx.inventory.update({
        where: { productId_location: { productId, location: fromLocation } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.inventory.upsert({
        where: { productId_location: { productId, location: toLocation } },
        update: { quantity: { increment: quantity } },
        create: { productId, quantity, location: toLocation, holderId: toUserId || null },
      });
    });

    res.json({ message: 'Stock transferred successfully' });
  } catch (err) {
    const status = err.message === 'Insufficient stock in source location' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
