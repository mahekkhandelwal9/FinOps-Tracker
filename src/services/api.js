import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage but let AuthContext handle redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't immediately redirect - let AuthContext handle state management
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// Company APIs
export const companyAPI = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (companyData) => api.post('/companies', companyData),
  update: (id, companyData) => api.put(`/companies/${id}`, companyData),
  delete: (id) => api.delete(`/companies/${id}`),
  getDashboard: (id, period) => api.get(`/companies/${id}/dashboard`, { params: { period } }),
  getNotes: (id) => api.get(`/companies/${id}/notes`),
  addNote: (id, noteData) => api.post(`/companies/${id}/notes`, noteData),
  updateNote: (id, noteId, noteData) => api.put(`/companies/${id}/notes/${noteId}`, noteData),
  deleteNote: (id, noteId) => api.delete(`/companies/${id}/notes/${noteId}`),
};

// Pod APIs
export const podAPI = {
  getAll: (filters) => api.get('/pods', { params: filters }),
  getById: (id) => api.get(`/pods/${id}`),
  create: (podData) => api.post('/pods', podData),
  update: (id, podData) => api.put(`/pods/${id}`, podData),
  delete: (id) => api.delete(`/pods/${id}`),
  updateBudget: (id, amount) => api.put(`/pods/${id}/budget`, { amount }),
  getDashboard: (id, period) => api.get(`/pods/${id}/dashboard`, { params: { period } }),
};

// Vendor APIs
export const vendorAPI = {
  getAll: (filters) => api.get('/vendors', { params: filters }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (vendorData) => api.post('/vendors', vendorData),
  update: (id, vendorData) => api.put(`/vendors/${id}`, vendorData),
  delete: (id) => api.delete(`/vendors/${id}`),
  updateAllocation: (id, allocationData) => api.put(`/vendors/${id}/allocations`, allocationData),
  removeAllocation: (id, podId) => api.delete(`/vendors/${id}/allocations/${podId}`),
  getComparison: (id, params) => api.get(`/vendors/${id}/comparison`, { params }),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: (filters) => api.get('/invoices', { params: filters }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (formData) => api.post('/invoices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, formData) => api.put(`/invoices/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/invoices/${id}`),
  getStats: (filters) => api.get('/invoices/stats/summary', { params: filters }),
};

// Payment APIs
export const paymentAPI = {
  getAll: (filters) => api.get('/payments', { params: filters }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (formData) => api.post('/payments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, formData) => api.put(`/payments/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/payments/${id}`),
  getStats: (filters) => api.get('/payments/stats/summary', { params: filters }),
};

// Dashboard APIs
export const dashboardAPI = {
  getCompanyDashboard: (companyId, period) => api.get(`/dashboard/company/${companyId}`, { params: { period } }),
  getPodDashboard: (podId, period) => api.get(`/dashboard/pod/${podId}`, { params: { period } }),
  getTopVendors: (filters) => api.get('/dashboard/vendors/top-spenders', { params: filters }),
  getCategoryTrends: (filters) => api.get('/dashboard/spending/category-trends', { params: filters }),
};

// Alert APIs
export const alertAPI = {
  getAll: (filters) => api.get('/alerts', { params: filters }),
  getById: (id) => api.get(`/alerts/${id}`),
  create: (alertData) => api.post('/alerts', alertData),
  updateStatus: (id, status) => api.put(`/alerts/${id}/status`, { status }),
  delete: (id) => api.delete(`/alerts/${id}`),
  getSummary: (filters) => api.get('/alerts/summary/overview', { params: filters }),
  generateSystemAlerts: (filters) => api.post('/alerts/generate-system-alerts', filters),
};

export default api;