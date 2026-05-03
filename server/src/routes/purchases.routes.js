const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdminOrWarehouse } = require('../middleware/role.middleware');

const prisma = new PrismaClient();

router.use(authenticate, requireAdminOrWarehouse);

router.get('/', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      supplierId, invoiceNumber, purchaseDate, currency, exchangeRate,
      intermediaryCurrency, intermediaryRate,
      totalForeign, totalGHS, shippingCostForeign, shippingCostGHS,
      fxGainLoss, notes, items,
    } = req.body;

    const purchase = await prisma.purchase.create({
      data: {
        supplierId, invoiceNumber, purchaseDate: new Date(purchaseDate),
        currency, exchangeRate,
        intermediaryCurrency: intermediaryCurrency || null,
        intermediaryRate: intermediaryRate || null,
        totalForeign, totalGHS,
        shippingCostForeign: shippingCostForeign || 0,
        shippingCostGHS: shippingCostGHS || 0,
        fxGainLoss, notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            unitCostGHS: item.unitCostGHS || 0,
            shippingAllocated: item.shippingAllocated || 0,
            trueCostPerUnit: item.trueCostPerUnit || 0,
            profitMargin: item.profitMargin ?? 20,
            outletPrice: item.outletPrice || 0,
          })),
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    // Update warehouse inventory and product prices
    for (const item of items) {
      const existing = await prisma.inventory.findFirst({
        where: { productId: item.productId, location: 'WAREHOUSE' },
      });
      if (existing) {
        await prisma.inventory.update({
          where: { id: existing.id },
          data: { quantity: { increment: item.quantity } },
        });
      } else {
        await prisma.inventory.create({
          data: { productId: item.productId, quantity: item.quantity, location: 'WAREHOUSE' },
        });
      }

      // Update product cost and outlet price
      if (item.trueCostPerUnit > 0) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            costPrice: item.trueCostPerUnit,
            sellingPrice: item.outletPrice || item.trueCostPerUnit,
          },
        });
      }
    }

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { invoiceNumber, notes, fxGainLoss } = req.body;
    const purchase = await prisma.purchase.update({
      where: { id: req.params.id },
      data: { invoiceNumber, notes, fxGainLoss },
      include: { supplier: true, items: { include: { product: true } } },
    });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
