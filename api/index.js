const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import backend modules from finops-platform
const dbPath = path.join(__dirname, '../finops-platform/backend');
const backendPath = path.join(__dirname, '../finops-platform/backend');

// Make sure the backend modules are accessible
process.chdir(backendPath);

const db = require('../finops-platform/backend/config/database');
const authRoutes = require('../finops-platform/backend/routes/auth');
const companyRoutes = require('../finops-platform/backend/routes/companies');
const podRoutes = require('../finops-platform/backend/routes/pods');
const vendorRoutes = require('../finops-platform/backend/routes/vendors');
const invoiceRoutes = require('../finops-platform/backend/routes/invoices');
const paymentRoutes = require('../finops-platform/backend/routes/payments');
const dashboardRoutes = require('../finops-platform/backend/routes/dashboard');
const alertRoutes = require('../finops-platform/backend/routes/alerts');

// Copy database to /tmp for Vercel serverless if it doesn't exist
if (!fs.existsSync('/tmp/database.sqlite') && fs.existsSync(path.join(__dirname, '../finops-platform/backend/database.sqlite'))) {
  fs.copyFileSync(
    path.join(__dirname, '../finops-platform/backend/database.sqlite'),
    '/tmp/database.sqlite'
  );
}

const app = express();

// Trust proxy settings for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    /^https:\/\/.*\.vercel\.app$/,
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for local development
    return req.ip === '127.0.0.1' || req.ip === '::1';
  }
});
app.use(limiter);

// General middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../finops-platform/backend/uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/pods', podRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export for Vercel serverless functions
module.exports = (req, res) => {
  app(req, res);
};