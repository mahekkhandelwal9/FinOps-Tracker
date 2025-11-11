const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock users for testing
const users = [
  {
    id: '1',
    email: 'admin@finops.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: '2',
    email: 'user@finops.com',
    password: 'user123',
    name: 'Regular User',
    role: 'user'
  }
];

// Auth routes
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Simple mock authentication
  if (email && password) {
    const user = users.find(u => u.email === email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: 'mock-jwt-token-' + Date.now()
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

app.get('/profile', (req, res) => {
  // Mock profile data
  res.status(200).json({
    success: true,
    user: {
      id: '1',
      email: 'admin@finops.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z'
    }
  });
});

// Mock data for other endpoints
app.get('/companies', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: 1, name: 'Company A', status: 'active', budget: 100000 },
      { id: 2, name: 'Company B', status: 'active', budget: 200000 }
    ]
  });
});

app.get('/invoices', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: 1, company: 'Company A', amount: 5000, status: 'paid' },
      { id: 2, company: 'Company B', amount: 10000, status: 'pending' }
    ]
  });
});

// Catch all other API routes
app.all('*', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API working',
    data: [],
    method: req.method,
    url: req.url
  });
});

export default function handler(req, res) {
  return app(req, res);
}