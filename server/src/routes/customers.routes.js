const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { sales: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/statement', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { customerId: req.params.id },
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { saleDate: 'desc' },
    });
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    res.json({ customer, sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
