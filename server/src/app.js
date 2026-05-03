require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp'
  : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/purchases', require('./routes/purchases.routes'));
app.use('/api/suppliers', require('./routes/suppliers.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/expenses', require('./routes/expenses.routes'));
app.use('/api/drawings', require('./routes/drawings.routes'));
app.use('/api/exchange-rates', require('./routes/exchangeRates.routes'));
app.use('/api/reports', require('./routes/reports.routes'));

app.use('/api/seed', require('./routes/seed.routes'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Strat Mount server running on port ${PORT}`));

module.exports = app;
