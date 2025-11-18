// Mock data for demonstration purposes
export const mockCompanies = [
  {
    id: 1,
    name: 'RPSG Group',
    industry: 'Conglomerate',
    website: 'https://rpsg.in',
    description: 'RP-Sanjiv Goenka Group is a leading Indian conglomerate with diverse business interests.',
    contact_email: 'info@rpsg.in',
    contact_phone: '+91-33-22881234',
    address: 'Kolkata, West Bengal, India',
    total_pods: 12,
    total_budget: 50000000,
    spent_amount: 32000000,
    vendor_count: 8,
    created_at: '2024-01-15',
    updated_at: '2024-11-14'
  },
  {
    id: 2,
    name: 'TechCorp Solutions',
    industry: 'Technology',
    website: 'https://techcorp.com',
    description: 'Leading technology solutions provider for enterprise clients.',
    contact_email: 'contact@techcorp.com',
    contact_phone: '+1-555-0123',
    address: 'San Francisco, CA, USA',
    total_pods: 8,
    total_budget: 25000000,
    spent_amount: 18500000,
    vendor_count: 6,
    created_at: '2024-02-01',
    updated_at: '2024-11-14'
  }
];

export const mockPods = [
  {
    id: 1,
    name: 'Cloud Infrastructure',
    company_id: 1,
    company_name: 'RPSG Group',
    budget: 10000000,
    spent: 7500000,
    status: 'active',
    description: 'Cloud computing and infrastructure management pod.',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    created_at: '2024-01-01',
    updated_at: '2024-11-14'
  },
  {
    id: 2,
    name: 'Digital Marketing',
    company_id: 1,
    company_name: 'RPSG Group',
    budget: 5000000,
    spent: 3200000,
    status: 'active',
    description: 'Digital marketing and advertising campaigns.',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    created_at: '2024-02-01',
    updated_at: '2024-11-14'
  },
  {
    id: 3,
    name: 'Software Development',
    company_id: 2,
    company_name: 'TechCorp Solutions',
    budget: 8000000,
    spent: 6200000,
    status: 'active',
    description: 'Custom software development and maintenance.',
    start_date: '2024-01-15',
    end_date: '2024-12-31',
    created_at: '2024-01-15',
    updated_at: '2024-11-14'
  }
];

export const mockVendors = [
  {
    id: 1,
    name: 'AWS',
    category: 'Cloud Services',
    contact_email: 'support@aws.com',
    contact_phone: '+1-800-555-1234',
    website: 'https://aws.com',
    description: 'Amazon Web Services - Cloud computing platform',
    address: 'Seattle, WA, USA',
    total_invoices: 24,
    total_amount: 8500000,
    created_at: '2024-01-01',
    updated_at: '2024-11-14'
  },
  {
    id: 2,
    name: 'Microsoft Azure',
    category: 'Cloud Services',
    contact_email: 'support@microsoft.com',
    contact_phone: '+1-800-555-5678',
    website: 'https://azure.microsoft.com',
    description: 'Microsoft Azure cloud computing services',
    address: 'Redmond, WA, USA',
    total_invoices: 18,
    total_amount: 6200000,
    created_at: '2024-01-15',
    updated_at: '2024-11-14'
  },
  {
    id: 3,
    name: 'Google Marketing',
    category: 'Digital Marketing',
    contact_email: 'ads@google.com',
    contact_phone: '+1-800-555-9876',
    website: 'https://ads.google.com',
    description: 'Google Ads and digital marketing solutions',
    address: 'Mountain View, CA, USA',
    total_invoices: 36,
    total_amount: 3200000,
    created_at: '2024-02-01',
    updated_at: '2024-11-14'
  }
];

export const mockInvoices = [
  {
    id: 1,
    vendor_id: 1,
    vendor_name: 'AWS',
    pod_id: 1,
    pod_name: 'Cloud Infrastructure',
    company_id: 1,
    company_name: 'RPSG Group',
    invoice_number: 'AWS-2024-001',
    amount: 750000,
    issue_date: '2024-10-01',
    due_date: '2024-11-01',
    status: 'paid',
    description: 'Monthly cloud infrastructure services',
    file_url: null,
    created_at: '2024-10-01',
    updated_at: '2024-11-14'
  },
  {
    id: 2,
    vendor_id: 3,
    vendor_name: 'Google Marketing',
    pod_id: 2,
    pod_name: 'Digital Marketing',
    company_id: 1,
    company_name: 'RPSG Group',
    invoice_number: 'GOOGLE-2024-010',
    amount: 320000,
    issue_date: '2024-10-15',
    due_date: '2024-11-15',
    status: 'pending',
    description: 'October digital marketing campaign',
    file_url: null,
    created_at: '2024-10-15',
    updated_at: '2024-11-14'
  }
];

export const mockUser = {
  id: 1,
  username: 'demo.user',
  email: 'demo@finops.com',
  first_name: 'Demo',
  last_name: 'User',
  name: 'Demo User',
  phone: '+91-9876543210',
  department: 'Finance',
  location: 'Kolkata, India',
  role: 'admin',
  created_at: '2024-01-01',
  updated_at: '2024-11-14'
};

export const mockAuth = {
  token: 'mock-jwt-token-for-demo',
  user: mockUser,
  isAuthenticated: true
};