// Vercel serverless entry point — routes all /api/* requests to the Express app
require('dotenv').config();
const app = require('../server/src/app');
module.exports = app;
