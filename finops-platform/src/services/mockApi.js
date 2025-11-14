import {
  mockCompanies,
  mockPods,
  mockVendors,
  mockInvoices,
  mockAuth
} from './mockData';

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API service
export const mockApi = {
  // Auth endpoints
  auth: {
    login: async (credentials) => {
      await delay();
      // Simulate login validation
      if (credentials.email === 'demo@finops.com' && credentials.password === 'demo123') {
        localStorage.setItem('token', mockAuth.token);
        localStorage.setItem('user', JSON.stringify(mockAuth.user));
        return { data: mockAuth };
      }
      throw new Error('Invalid credentials. Use demo@finops.com / demo123');
    },

    register: async (userData) => {
      await delay();
      throw new Error('Registration disabled in demo mode');
    },

    getProfile: async () => {
      await delay();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return { data: { user } };
    }
  },

  // Company endpoints
  companies: {
    getAll: async () => {
      await delay();
      return { data: { companies: mockCompanies } };
    },

    getById: async (id) => {
      await delay();
      const company = mockCompanies.find(c => c.id === parseInt(id));
      const companyPods = mockPods.filter(p => p.company_id === parseInt(id));
      const companyVendors = mockVendors.filter(v => {
        const vendorPods = mockPods.filter(p => p.company_id === parseInt(id));
        return vendorPods.some(p => mockInvoices.some(i => i.vendor_id === v.id && i.pod_id === p.id));
      });

      return {
        data: {
          company: {
            ...company,
            pods: companyPods,
            vendors: companyVendors
          }
        }
      };
    },

    create: async (data) => {
      await delay();
      throw new Error('Create disabled in demo mode');
    },

    update: async (id, data) => {
      await delay();
      throw new Error('Update disabled in demo mode');
    },

    delete: async (id) => {
      await delay();
      throw new Error('Delete disabled in demo mode');
    }
  },

  // Pod endpoints
  pods: {
    getAll: async () => {
      await delay();
      return { data: { pods: mockPods } };
    },

    getById: async (id) => {
      await delay();
      const pod = mockPods.find(p => p.id === parseInt(id));
      const podInvoices = mockInvoices.filter(i => i.pod_id === parseInt(id));
      const podVendors = mockVendors.filter(v =>
        podInvoices.some(i => i.vendor_id === v.id)
      );

      return {
        data: {
          pod: {
            ...pod,
            invoices: podInvoices,
            vendors: podVendors
          }
        }
      };
    },

    create: async (data) => {
      await delay();
      throw new Error('Create disabled in demo mode');
    },

    update: async (id, data) => {
      await delay();
      throw new Error('Update disabled in demo mode');
    },

    delete: async (id) => {
      await delay();
      throw new Error('Delete disabled in demo mode');
    }
  },

  // Vendor endpoints
  vendors: {
    getAll: async () => {
      await delay();
      return { data: { vendors: mockVendors } };
    },

    getById: async (id) => {
      await delay();
      const vendor = mockVendors.find(v => v.id === parseInt(id));
      const vendorInvoices = mockInvoices.filter(i => i.vendor_id === parseInt(id));
      const vendorPods = mockPods.filter(p =>
        vendorInvoices.some(i => i.pod_id === p.id)
      );

      return {
        data: {
          vendor: {
            ...vendor,
            invoices: vendorInvoices,
            pods: vendorPods,
            documents: [] // Mock empty documents array
          }
        }
      };
    },

    create: async (data) => {
      await delay();
      throw new Error('Create disabled in demo mode');
    },

    update: async (id, data) => {
      await delay();
      throw new Error('Update disabled in demo mode');
    },

    delete: async (id) => {
      await delay();
      throw new Error('Delete disabled in demo mode');
    }
  },

  // Invoice endpoints
  invoices: {
    getAll: async () => {
      await delay();
      return { data: { invoices: mockInvoices } };
    },

    getById: async (id) => {
      await delay();
      const invoice = mockInvoices.find(i => i.id === parseInt(id));
      return { data: { invoice } };
    },

    create: async (data) => {
      await delay();
      throw new Error('Create disabled in demo mode');
    },

    update: async (id, data) => {
      await delay();
      throw new Error('Update disabled in demo mode');
    },

    delete: async (id) => {
      await delay();
      throw new Error('Delete disabled in demo mode');
    }
  },

  // Dashboard endpoints
  dashboard: {
    getStats: async () => {
      await delay();
      const totalBudget = mockPods.reduce((sum, pod) => sum + pod.budget, 0);
      const totalSpent = mockPods.reduce((sum, pod) => sum + pod.spent, 0);
      const activePods = mockPods.filter(p => p.status === 'active').length;

      return {
        data: {
          totalBudget,
          totalSpent,
          totalPods: mockPods.length,
          activePods,
          totalVendors: mockVendors.length,
          totalInvoices: mockInvoices.length,
          recentInvoices: mockInvoices.slice(0, 5),
          budgetUtilization: ((totalSpent / totalBudget) * 100).toFixed(1)
        }
      };
    }
  }
};