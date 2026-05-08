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

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
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

      for (const item of items) {
        const existing = await tx.inventory.findFirst({
          where: { productId: item.productId, location: 'WAREHOUSE' },
        });
        if (existing) {
          await tx.inventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: { productId: item.productId, quantity: item.quantity, location: 'WAREHOUSE' },
          });
        }

        if (item.trueCostPerUnit > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              costPrice: item.trueCostPerUnit,
              sellingPrice: item.outletPrice || item.trueCostPerUnit,
            },
          });
        }
      }

      return created;
    }, { timeout: 30000 });

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      supplierId, invoiceNumber, purchaseDate, currency, exchangeRate,
      totalForeign, totalGHS, shippingCostGHS, fxGainLoss, notes, items,
    } = req.body;

    if (!items) {
      const purchase = await prisma.purchase.update({
        where: { id: req.params.id },
        data: { invoiceNumber, notes, fxGainLoss },
        include: { supplier: true, items: { include: { product: true } } },
      });
      return res.json(purchase);
    }

    await prisma.$transaction(async (tx) => {
      const old = await tx.purchase.findUnique({
        where: { id: req.params.id },
        include: { items: true },
      });
      if (!old) throw new Error('Purchase not found');

      const oldProductIds = old.items.map(i => i.productId);
      const newProductIds = items.map(i => i.productId);
      const allProductIds = [...new Set([...oldProductIds, ...newProductIds])];

      // Batch load all inventory records
      const inventories = await tx.inventory.findMany({
        where: { productId: { in: allProductIds }, location: 'WAREHOUSE' },
      });
      const invByProduct = new Map(inventories.map(inv => [inv.productId, inv]));

      // Calculate inventory changes
      const invChanges = new Map();
      for (const pid of allProductIds) invChanges.set(pid, 0);
      for (const oldItem of old.items) {
        invChanges.set(oldItem.productId, (invChanges.get(oldItem.productId) || 0) - oldItem.quantity);
      }
      for (const item of items) {
        invChanges.set(item.productId, (invChanges.get(item.productId) || 0) + item.quantity);
      }

      // Batch update/create inventory
      for (const [productId, change] of invChanges) {
        if (change === 0) continue;
        const inv = invByProduct.get(productId);
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: change } },
          });
        } else if (change > 0) {
          await tx.inventory.create({
            data: { productId, quantity: change, location: 'WAREHOUSE' },
          });
        }
      }

      // Delete and recreate items
      await tx.purchaseItem.deleteMany({ where: { purchaseId: req.params.id } });

      await tx.purchase.update({
        where: { id: req.params.id },
        data: {
          supplierId, invoiceNumber,
          purchaseDate: new Date(purchaseDate),
          currency, exchangeRate,
          totalForeign, totalGHS,
          shippingCostGHS: shippingCostGHS || 0,
          fxGainLoss: fxGainLoss || 0, notes,
        },
      });

      // Batch create items
      const itemsToCreate = items.map(item => ({
        purchaseId: req.params.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        unitCostGHS: item.unitCostGHS || 0,
        shippingAllocated: item.shippingAllocated || 0,
        trueCostPerUnit: item.trueCostPerUnit || 0,
        profitMargin: item.profitMargin ?? 20,
        outletPrice: item.outletPrice || 0,
      }));
      await tx.purchaseItem.createMany({ data: itemsToCreate });

      // Batch update products
      for (const item of items) {
        if (item.trueCostPerUnit > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              costPrice: item.trueCostPerUnit,
              sellingPrice: item.outletPrice || item.trueCostPerUnit,
            },
          });
        }
      }
    }, { timeout: 30000 });

    const updated = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, items: { include: { product: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
