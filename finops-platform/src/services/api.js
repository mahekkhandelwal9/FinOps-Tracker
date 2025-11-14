import axios from 'axios';
import { mockApi } from './mockApi';

// Use mock API for Vercel deployment, real API for local development
const USE_MOCK_API = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
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
  login: USE_MOCK_API ? mockApi.auth.login : (credentials) => api.post('/auth/login', credentials),
  register: USE_MOCK_API ? mockApi.auth.register : (userData) => api.post('/auth/register', userData),
  getProfile: USE_MOCK_API ? mockApi.auth.getProfile : () => api.get('/auth/profile'),
  updateProfile: USE_MOCK_API ? () => Promise.reject(new Error('Update disabled in demo mode')) : (userData) => api.put('/auth/profile', userData),
  changePassword: USE_MOCK_API ? () => Promise.reject(new Error('Update disabled in demo mode')) : (passwordData) => api.put('/auth/change-password', passwordData),
};

// Company APIs
export const companyAPI = {
  getAll: USE_MOCK_API ? mockApi.companies.getAll : () => api.get('/companies'),
  getById: USE_MOCK_API ? mockApi.companies.getById : (id) => api.get(`/companies/${id}`),
  create: USE_MOCK_API ? mockApi.companies.create : (companyData) => api.post('/companies', companyData),
  update: USE_MOCK_API ? mockApi.companies.update : (id, companyData) => api.put(`/companies/${id}`, companyData),
  delete: USE_MOCK_API ? mockApi.companies.delete : (id) => api.delete(`/companies/${id}`),
  getDashboard: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, period) => api.get(`/companies/${id}/dashboard`, { params: { period } }),
  getNotes: USE_MOCK_API ? () => Promise.resolve({ data: { notes: [] } }) : (id) => api.get(`/companies/${id}/notes`),
  addNote: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, noteData) => api.post(`/companies/${id}/notes`, noteData),
  updateNote: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, noteId, noteData) => api.put(`/companies/${id}/notes/${noteId}`, noteData),
  deleteNote: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, noteId) => api.delete(`/companies/${id}/notes/${noteId}`),
};

// Pod APIs
export const podAPI = {
  getAll: USE_MOCK_API ? mockApi.pods.getAll : (filters) => api.get('/pods', { params: filters }),
  getById: USE_MOCK_API ? mockApi.pods.getById : (id) => api.get(`/pods/${id}`),
  create: USE_MOCK_API ? mockApi.pods.create : (podData) => api.post('/pods', podData),
  update: USE_MOCK_API ? mockApi.pods.update : (id, podData) => api.put(`/pods/${id}`, podData),
  delete: USE_MOCK_API ? mockApi.pods.delete : (id) => api.delete(`/pods/${id}`),
  updateBudget: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, amount) => api.put(`/pods/${id}/budget`, { amount }),
  getDashboard: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, period) => api.get(`/pods/${id}/dashboard`, { params: { period } }),
};

// Vendor APIs
export const vendorAPI = {
  getAll: USE_MOCK_API ? mockApi.vendors.getAll : (filters) => api.get('/vendors', { params: filters }),
  getById: USE_MOCK_API ? mockApi.vendors.getById : (id) => api.get(`/vendors/${id}`),
  create: USE_MOCK_API ? mockApi.vendors.create : (vendorData) => api.post('/vendors', vendorData),
  update: USE_MOCK_API ? mockApi.vendors.update : (id, vendorData) => api.put(`/vendors/${id}`, vendorData),
  delete: USE_MOCK_API ? mockApi.vendors.delete : (id) => api.delete(`/vendors/${id}`),
  updateAllocation: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, allocationData) => api.put(`/vendors/${id}/allocations`, allocationData),
  removeAllocation: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, podId) => api.delete(`/vendors/${id}/allocations/${podId}`),
  getComparison: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, params) => api.get(`/vendors/${id}/comparison`, { params }),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: USE_MOCK_API ? mockApi.invoices.getAll : (filters) => api.get('/invoices', { params: filters }),
  getById: USE_MOCK_API ? mockApi.invoices.getById : (id) => api.get(`/invoices/${id}`),
  create: USE_MOCK_API ? mockApi.invoices.create : (formData) => api.post('/invoices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: USE_MOCK_API ? mockApi.invoices.update : (id, formData) => api.put(`/invoices/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: USE_MOCK_API ? mockApi.invoices.delete : (id) => api.delete(`/invoices/${id}`),
  getStats: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.get('/invoices/stats/summary', { params: filters }),
};

// Payment APIs (not used in current UI)
export const paymentAPI = {
  getAll: USE_MOCK_API ? () => Promise.resolve({ data: { payments: [] } }) : (filters) => api.get('/payments', { params: filters }),
  getById: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id) => api.get(`/payments/${id}`),
  create: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (formData) => api.post('/payments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, formData) => api.put(`/payments/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id) => api.delete(`/payments/${id}`),
  getStats: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.get('/payments/stats/summary', { params: filters }),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: USE_MOCK_API ? mockApi.dashboard.getStats : () => Promise.reject(new Error('Use specific dashboard endpoints')),
  getCompanyDashboard: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (companyId, period) => api.get(`/dashboard/company/${companyId}`, { params: { period } }),
  getPodDashboard: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (podId, period) => api.get(`/dashboard/pod/${podId}`, { params: { period } }),
  getTopVendors: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.get('/dashboard/vendors/top-spenders', { params: filters }),
  getCategoryTrends: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.get('/dashboard/spending/category-trends', { params: filters }),
};

// Alert APIs
export const alertAPI = {
  getAll: USE_MOCK_API ? () => Promise.resolve({ data: { alerts: [] } }) : (filters) => api.get('/alerts', { params: filters }),
  getById: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id) => api.get(`/alerts/${id}`),
  create: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (alertData) => api.post('/alerts', alertData),
  updateStatus: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id, status) => api.put(`/alerts/${id}/status`, { status }),
  delete: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (id) => api.delete(`/alerts/${id}`),
  getSummary: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.get('/alerts/summary/overview', { params: filters }),
  generateSystemAlerts: USE_MOCK_API ? () => Promise.reject(new Error('Demo mode')) : (filters) => api.post('/alerts/generate-system-alerts', filters),
};

export default api;