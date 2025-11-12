const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data that matches the structure expected by React app
const mockUsers = [
  {
    id: 1,
    email: 'admin@finops.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    email: 'user@finops.com',
    name: 'Regular User',
    role: 'user',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockCompanies = [
  {
    id: 1,
    name: 'Tech Corp',
    description: 'Technology Solutions Provider',
    status: 'active',
    budget: 500000,
    spent: 234567,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 2,
    name: 'Finance Solutions Inc',
    description: 'Financial Services Company',
    status: 'active',
    budget: 750000,
    spent: 456789,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z'
  }
];

const mockPods = [
  {
    id: 1,
    name: 'Infrastructure Pod',
    description: 'Cloud Infrastructure Team',
    company_id: 1,
    budget: 200000,
    spent: 123456,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Development Pod',
    description: 'Software Development Team',
    company_id: 1,
    budget: 150000,
    spent: 78901,
    status: 'active',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockVendors = [
  {
    id: 1,
    name: 'Cloud Provider Inc',
    description: 'Cloud Infrastructure Services',
    category: 'Infrastructure',
    status: 'active',
    total_spend: 150000,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Software Solutions Ltd',
    description: 'Software Licenses and Support',
    category: 'Software',
    status: 'active',
    total_spend: 75000,
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockInvoices = [
  {
    id: 1,
    company_id: 1,
    vendor_id: 1,
    invoice_number: 'INV-2024-001',
    amount: 25000,
    status: 'paid',
    issue_date: '2024-01-01T00:00:00Z',
    due_date: '2024-01-15T00:00:00Z',
    description: 'Monthly Cloud Services'
  },
  {
    id: 2,
    company_id: 1,
    vendor_id: 2,
    invoice_number: 'INV-2024-002',
    amount: 15000,
    status: 'pending',
    issue_date: '2024-01-05T00:00:00Z',
    due_date: '2024-01-20T00:00:00Z',
    description: 'Software License Renewal'
  }
];

const mockPayments = [
  {
    id: 1,
    company_id: 1,
    vendor_id: 1,
    amount: 25000,
    status: 'completed',
    payment_date: '2024-01-14T00:00:00Z',
    method: 'wire_transfer',
    description: 'Payment for INV-2024-001'
  }
];

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper functions
const generateToken = (user) => {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth endpoints (matching React app expectations)
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }

  // Find user (in real app, verify password hash)
  const user = mockUsers.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: { ...user, password: undefined },
      token
    }
  });
});

app.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body;

  // Validation
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'All fields required'
    });
  }

  // Check if user exists
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Create new user (in real app, hash password)
  const newUser = {
    id: mockUsers.length + 1,
    email,
    name,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  const token = generateToken(newUser);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: newUser,
      token
    }
  });
});

app.get('/auth/profile', authenticateToken, (req, res) => {
  const user = mockUsers.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { ...user, password: undefined }
  });
});

// Company endpoints
app.get('/companies', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: mockCompanies
  });
});

app.get('/companies/:id', authenticateToken, (req, res) => {
  const company = mockCompanies.find(c => c.id === parseInt(req.params.id));
  if (!company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  res.json({
    success: true,
    data: company
  });
});

app.post('/companies', authenticateToken, (req, res) => {
  const newCompany = {
    id: mockCompanies.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockCompanies.push(newCompany);

  res.status(201).json({
    success: true,
    data: newCompany
  });
});

// Pod endpoints
app.get('/pods', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: mockPods
  });
});

// Vendor endpoints
app.get('/vendors', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: mockVendors
  });
});

// Invoice endpoints
app.get('/invoices', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: mockInvoices
  });
});

// Payment endpoints
app.get('/payments', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: mockPayments
  });
});

// Dashboard endpoints
app.get('/dashboard/company/:id', authenticateToken, (req, res) => {
  const companyId = parseInt(req.params.id);
  const company = mockCompanies.find(c => c.id === companyId);

  if (!company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  const dashboardData = {
    company,
    totalBudget: company.budget,
    totalSpent: company.spent,
    remainingBudget: company.budget - company.spent,
    utilizationRate: ((company.spent / company.budget) * 100).toFixed(1),
    podCount: mockPods.filter(p => p.company_id === companyId).length,
    vendorCount: mockVendors.length,
    pendingInvoices: mockInvoices.filter(i => i.company_id === companyId && i.status === 'pending').length
  };

  res.json({
    success: true,
    data: dashboardData
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Catch all other routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'POST /auth/login',
      'POST /auth/register',
      'GET /auth/profile',
      'GET /companies',
      'GET /pods',
      'GET /vendors',
      'GET /invoices',
      'GET /payments',
      'GET /dashboard/company/:id'
    ]
  });
});

export default function handler(req, res) {
  return app(req, res);
}