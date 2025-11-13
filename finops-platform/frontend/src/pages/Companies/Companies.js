import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    total_budget: '',
    description: '',
    currency: 'INR',
    financial_period: 'Yearly',
    notes: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await api.put(`/companies/${editingCompany.company_id}`, formData);
      } else {
        await api.post('/companies', formData);
      }
      fetchCompanies();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving company:', error);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name,
      total_budget: company.total_budget,
      description: company.description || '',
      currency: company.currency,
      financial_period: company.financial_period,
      notes: company.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await api.delete(`/companies/${companyId}`);
        fetchCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCompany(null);
    setFormData({
      company_name: '',
      total_budget: '',
      description: '',
      currency: 'INR',
      financial_period: 'Yearly',
      notes: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600">Manage your organization's companies and their budgets</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {companies.map((company) => (
          <div
            key={company.company_id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.company_name}</h3>
                {company.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{company.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  company.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Pods</p>
                  <p className="text-lg font-bold text-gray-900">{company.total_pods || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Spend</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₹{company.total_spend ? company.total_spend.toLocaleString('en-IN') : '0'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Budget Allocation</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${company.budget_utilization_percentage || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {company.budget_utilization_percentage || 0}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-sm font-medium text-gray-900">
                    ₹{company.total_budget ? company.total_budget.toLocaleString('en-IN') : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Financial Period</p>
                  <p className="text-sm font-medium text-gray-700">{company.financial_period}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-700">
                      {new Date(company.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(company)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit company"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(company.company_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete company"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCompany ? 'Edit Company' : 'Add New Company'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description of the company..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Budget (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.total_budget}
                    onChange={(e) => setFormData({...formData, total_budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Financial Period
                  </label>
                  <select
                    value={formData.financial_period}
                    onChange={(e) => setFormData({...formData, financial_period: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCompany ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;