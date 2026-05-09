const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/inventory-vs-purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { items: { include: { product: true } }, supplier: true },
      orderBy: { purchaseDate: 'desc' },
    });

    const inventory = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });

    res.json({
      purchases: purchases.map((p) => ({
        id: p.id,
        supplier: p.supplier.name,
        date: p.purchaseDate,
        items: p.items.map((i) => ({
          product: i.product.name,
          receivedQty: i.quantity,
        })),
      })),
      inventory: inventory.map((i) => ({
        product: i.product.name,
        currentQty: i.quantity,
        location: i.location,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/fix-inventory', async (req, res) => {
  try {
    const purchaseItems = await prisma.purchaseItem.findMany();

    const qtByProduct = {};
    purchaseItems.forEach(item => {
      if (!qtByProduct[item.productId]) {
        qtByProduct[item.productId] = 0;
      }
      qtByProduct[item.productId] += Number(item.quantity) || 0;
    });

    let fixed = 0;
    for (const [productId, totalQty] of Object.entries(qtByProduct)) {
      const inv = await prisma.inventory.findFirst({
        where: { productId, location: 'WAREHOUSE' },
      });

      if (inv) {
        if (inv.quantity !== totalQty) {
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { quantity: totalQty },
          });
          fixed++;
        }
      } else {
        await prisma.inventory.create({
          data: {
            productId,
            quantity: totalQty,
            location: 'WAREHOUSE',
          },
        });
        fixed++;
      }
    }

    res.json({ message: `Fixed ${fixed} inventory records with correct totals`, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory-zeros', async (req, res) => {
  try {
    const zeros = await prisma.inventory.findMany({
      where: { quantity: 0, location: 'WAREHOUSE' },
      include: { product: true },
    });

    const withPurchases = await Promise.all(
      zeros.map(async (inv) => {
        const purchases = await prisma.purchaseItem.findMany({
          where: { productId: inv.productId },
        });
        return {
          productId: inv.productId,
          productName: inv.product.name,
          currentQty: inv.quantity,
          totalReceived: purchases.reduce((sum, p) => sum + p.quantity, 0),
          purchaseCount: purchases.length,
        };
      })
    );

    res.json({ zerosWithNoReceipt: withPurchases.filter(p => p.totalReceived === 0), zerosWithReceipt: withPurchases.filter(p => p.totalReceived > 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
