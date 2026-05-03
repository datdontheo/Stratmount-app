const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const rates = await prisma.exchangeRate.findMany({ orderBy: { date: 'desc' } });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    const currencies = ['USD', 'GBP', 'AED'];
    const current = {};
    for (const c of currencies) {
      const rate = await prisma.exchangeRate.findFirst({
        where: { fromCurrency: c, toCurrency: 'GHS' },
        orderBy: { date: 'desc' },
      });
      current[c] = rate ? rate.rate : 1;
    }
    // AED→USD intermediary rate
    const aedUsd = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'AED', toCurrency: 'USD' },
      orderBy: { date: 'desc' },
    });
    current.aedToUSD = aedUsd ? aedUsd.rate : null;
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const rate = await prisma.exchangeRate.create({
      data: { ...req.body, setBy: req.user.id },
    });
    res.status(201).json(rate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
