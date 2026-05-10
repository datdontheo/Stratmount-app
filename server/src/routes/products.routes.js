const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const prisma = require('../prisma');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, sku, brand, category, description, unit, sellingPrice, costPrice, currency } = req.body;
    const product = await prisma.product.create({
      data: {
        name, sku, brand: brand || null, category, description: description || null,
        unit: unit || 'bottle', currency: currency || 'GHS',
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
      },
    });
    await prisma.inventory.create({
      data: { productId: product.id, quantity: 0, location: 'WAREHOUSE' },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/quick-create', requireAdmin, async (req, res) => {
  try {
    const { name, sku, category = 'OTHER', brand } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });

    const product = await prisma.product.create({
      data: {
        name, sku, category, brand: brand || null,
        unit: 'bottle', currency: 'GHS',
        sellingPrice: 0, costPrice: 0,
      },
    });
    await prisma.inventory.create({
      data: { productId: product.id, quantity: 0, location: 'WAREHOUSE' },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, sku, brand, category, description, unit, sellingPrice, costPrice, currency } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name, sku, brand: brand || null, category, description: description || null,
        unit: unit || 'bottle', currency: currency || 'GHS',
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
      },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { productId: req.params.id } });
      await tx.saleItem.deleteMany({ where: { productId: req.params.id } });
      await tx.inventory.deleteMany({ where: { productId: req.params.id } });
      await tx.product.delete({ where: { id: req.params.id } });
    });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
