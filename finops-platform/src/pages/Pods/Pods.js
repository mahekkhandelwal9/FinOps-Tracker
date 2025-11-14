import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const Pods = () => {
  const [pods, setPods] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPod, setEditingPod] = useState(null);

  const [formData, setFormData] = useState({
    pod_name: '',
    company_id: '',
    description: '',
    budget_ceiling: '',
    threshold_alert: 80
  });

  useEffect(() => {
    fetchPods();
    fetchCompanies();
  }, []);

  const fetchPods = async () => {
    try {
      const response = await api.get('/pods');
      setPods(response.data.pods || []);
    } catch (error) {
      console.error('Error fetching pods:', error);
      setPods([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPod) {
        await api.put(`/pods/${editingPod.pod_id}`, formData);
      } else {
        await api.post('/pods', formData);
      }
      fetchPods();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving pod:', error);
    }
  };

  const handleEdit = (pod) => {
    setEditingPod(pod);
    setFormData({
      pod_name: pod.pod_name,
      company_id: pod.company_id,
      description: pod.description,
      budget_ceiling: pod.budget_ceiling,
      threshold_alert: pod.threshold_alert || 80
    });
    setShowModal(true);
  };

  const handleDelete = async (podId) => {
    if (window.confirm('Are you sure you want to delete this pod?')) {
      try {
        await api.delete(`/pods/${podId}`);
        fetchPods();
      } catch (error) {
        console.error('Error deleting pod:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPod(null);
    setFormData({
      pod_name: '',
      company_id: '',
      description: '',
      budget_ceiling: '',
      threshold_alert: 80
    });
  };

  const getBudgetUtilization = (pod) => {
    if (!pod.budget_ceiling) return 0;
    const percentage = ((pod.budget_used || 0) / pod.budget_ceiling) * 100;
    return Math.min(percentage, 100);
  };

  const getBudgetStatusColor = (pod) => {
    const utilization = getBudgetUtilization(pod);
    if (utilization >= 90) return 'text-red-600 bg-red-50';
    if (utilization >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
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
          <h1 className="text-2xl font-bold text-gray-900">Pods</h1>
          <p className="text-gray-600">Manage project pods and their budget allocations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Pod
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pods.map((pod) => {
          const utilization = getBudgetUtilization(pod);
          const statusColor = getBudgetStatusColor(pod);
          const company = companies.find(c => c.company_id === pod.company_id);

          return (
            <Link
              key={pod.pod_id}
              to={`/pods/${pod.pod_id}`}
              className="block bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pod.pod_name}</h3>
                  <p className="text-sm text-gray-500">{company?.company_name || 'Unknown Company'}</p>
                </div>
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEdit(pod);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(pod.pod_id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-500">Budget Utilization</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        utilization >= 90 ? 'bg-red-600' :
                        utilization >= 75 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="text-sm font-bold text-gray-900">
                      ₹{pod.budget_ceiling ? pod.budget_ceiling.toLocaleString('en-IN') : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Used</p>
                    <p className="text-sm font-bold text-gray-900">
                      ₹{(pod.budget_used || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Alert Threshold</p>
                  <p className="text-sm text-gray-700">{pod.threshold_alert || 80}%</p>
                </div>

                {pod.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{pod.description}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    pod.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                  }`}>
                    {pod.status || 'Active'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {new Date(pod.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPod ? 'Edit Pod' : 'Add New Pod'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pod Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pod_name}
                    onChange={(e) => setFormData({...formData, pod_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    required
                    value={formData.company_id}
                    onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.company_id} value={company.company_id}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Ceiling (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.budget_ceiling}
                    onChange={(e) => setFormData({...formData, budget_ceiling: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.threshold_alert}
                    onChange={(e) => setFormData({...formData, threshold_alert: e.target.value})}
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
                  {editingPod ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pods;