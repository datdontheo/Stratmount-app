const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const drawings = await prisma.drawing.findMany({ orderBy: { date: 'desc' } });
    res.json(drawings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const drawing = await prisma.drawing.create({
      data: { ...req.body, date: new Date(req.body.date) },
    });
    res.status(201).json(drawing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
