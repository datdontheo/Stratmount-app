const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const where = req.user.role === 'OUTLET' ? { paidById: req.user.id } : {};
    const payments = await prisma.payment.findMany({
      where,
      include: {
        paidBy: { select: { id: true, name: true } },
        sale: { include: { customer: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { saleId, amount, currency, method, notes, paymentDate, proofImage } = req.body;
    const paidById = req.user.id;

    const payment = await prisma.payment.create({
      data: {
        saleId: saleId || null,
        paidById,
        amount,
        currency: currency || 'GHS',
        method: method || 'MOBILE_MONEY',
        notes,
        proofImage: proofImage || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
      include: { paidBy: { select: { id: true, name: true } }, sale: true },
    });

    // Update sale balance if linked
    if (saleId) {
      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (sale) {
        const newPaid = sale.amountPaid + amount;
        const newBalance = sale.totalAmount - newPaid;
        const status = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
        await prisma.sale.update({
          where: { id: saleId },
          data: { amountPaid: newPaid, balance: Math.max(0, newBalance), status },
        });
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('proof'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
