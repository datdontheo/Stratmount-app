const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const where = req.user.role === 'OUTLET' ? { soldById: req.user.id } : {};
    const { status, startDate, endDate } = req.query;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { saleDate: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
        payments: { include: { paidBy: { select: { id: true, name: true } } } },
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (req.user.role === 'OUTLET' && sale.soldById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, items, notes, currency, amountPaid, saleDate } = req.body;
    const soldById = req.user.role === 'OUTLET' ? req.user.id : (req.body.soldById || req.user.id);

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const paid = amountPaid || 0;
    const balance = totalAmount - paid;
    const status = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

    // Validate stock before creating sale
    const location = req.user.role === 'OUTLET' ? `OUTLET_${req.user.id}` : 'WAREHOUSE';
    for (const item of items) {
      const inv = await prisma.inventory.findFirst({ where: { productId: item.productId, location } });
      if (!inv || inv.quantity < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
        return res.status(400).json({ error: `Insufficient stock for "${product?.name || 'a product'}"` });
      }
    }

    const sale = await prisma.sale.create({
      data: {
        customerId: customerId || null,
        soldById,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        totalAmount,
        amountPaid: paid,
        balance,
        currency: currency || 'GHS',
        status,
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        soldBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    // Deduct from inventory
    for (const item of items) {
      const inv = await prisma.inventory.findFirst({ where: { productId: item.productId, location } });
      if (inv) {
        await prisma.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { notes, receiptSent } = req.body;
    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: { notes, receiptSent },
      include: { customer: true, items: { include: { product: true } }, payments: true },
    });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/receipt', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { name: true, companyName: true, companyLogo: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { name: true, companyName: true, companyLogo: true } },
        items: { include: { product: true } },
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const doc = new PDFDocument({ size: [400, 600], margin: 30, autoFirstPage: true });
    const receiptId = req.params.id.slice(-8).toUpperCase();
    const companyName = sale.soldBy?.companyName || 'STRAT MOUNT';
    const appLogo = req.query.appLogo;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receiptId}.pdf"`);
    doc.pipe(res);

    const fmt = (n) => `GH₵ ${(Number(n) || 0).toFixed(2)}`;
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Header with logo
    if (appLogo && appLogo.startsWith('/uploads/')) {
      try {
        const path = require('path');
        const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../../uploads');
        const logoPath = appLogo.replace('/uploads/', '');
        doc.image(path.join(uploadDir, logoPath), { fit: [100, 50], align: 'center' });
        doc.moveDown(0.3);
      } catch (err) {
        // Logo file not found, skip
      }
    }
    doc.fontSize(16).font('Helvetica-Bold').text(companyName.toUpperCase(), { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text('Sales Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(370, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    // Receipt meta
    doc.fillColor('#000').fontSize(9);
    doc.text(`Receipt #: ${receiptId}`, 30);
    doc.text(`Date: ${fmtDate(sale.saleDate)}`, 30);
    doc.text(`Customer: ${sale.customer?.name || 'Walk-in'}`, 30);
    if (sale.customer?.phone) doc.text(`Phone: ${sale.customer.phone}`, 30);
    doc.text(`Sold By: ${sale.soldBy?.name || '—'}`, 30);
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(370, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    // Items header
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Item', 30, doc.y, { width: 160 });
    doc.text('Qty', 200, doc.y - doc.currentLineHeight(), { width: 40, align: 'right' });
    doc.text('Price', 250, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' });
    doc.text('Total', 315, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(30, doc.y).lineTo(370, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);

    // Items
    doc.font('Helvetica').fontSize(9);
    for (const item of sale.items) {
      const y = doc.y;
      doc.text(item.product.name, 30, y, { width: 160 });
      doc.text(String(item.quantity), 200, y, { width: 40, align: 'right' });
      doc.text(fmt(item.unitPrice), 250, y, { width: 55, align: 'right' });
      doc.text(fmt(item.total), 315, y, { width: 55, align: 'right' });
      doc.moveDown(0.4);
    }

    doc.moveDown(0.3);
    doc.moveTo(30, doc.y).lineTo(370, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    // Totals
    const totY = doc.y;
    doc.fontSize(9);
    doc.text('Subtotal:', 200, totY, { width: 100 });
    doc.text(fmt(sale.totalAmount), 315, totY, { width: 55, align: 'right' });
    doc.moveDown(0.4);
    doc.text('Amount Paid:', 200, doc.y, { width: 100 });
    doc.text(fmt(sale.amountPaid), 315, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' });
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold');
    doc.text('Balance Due:', 200, doc.y, { width: 100 });
    doc.text(fmt(sale.balance), 315, doc.y - doc.currentLineHeight(), { width: 55, align: 'right' });

    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(370, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    // Status
    doc.font('Helvetica').fontSize(9).fillColor('#666')
      .text(`Status: ${sale.status}`, { align: 'center' });
    if (sale.notes) doc.text(`Notes: ${sale.notes}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(8).text('Thank you for your business!', { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
