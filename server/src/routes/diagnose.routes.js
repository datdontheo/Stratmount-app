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

module.exports = router;
