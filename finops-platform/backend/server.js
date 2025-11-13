const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const podRoutes = require('./routes/pods');
const vendorRoutes = require('./routes/vendors');
const invoiceRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');

const app = express();

// Export for Vercel serverless functions
module.exports = (req, res) => {
  app(req, res);
};

// Keep local development server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 FinOps Backend Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  });
}

// Trust proxy settings for rate limiting
app.set('trust proxy', 1); // Trust first proxy

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Note: module.exports is already defined above for Vercel compatibility
// The server start is handled in the conditional block above