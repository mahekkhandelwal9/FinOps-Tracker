import React, { useState, useEffect } from 'react';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_type: 'Cloud',
    shared_status: 'Exclusive',
    poc_email: '',
    poc_phone: '',
    payment_terms: 'NET 30',
    default_due_days: 30,
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.vendor_id}`, formData);
      } else {
        await api.post('/vendors', formData);
      }
      fetchVendors();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      shared_status: vendor.shared_status,
      poc_email: vendor.poc_email || '',
      poc_phone: vendor.poc_phone || '',
      payment_terms: vendor.payment_terms || 'NET 30',
      default_due_days: vendor.default_due_days || 30,
      notes: vendor.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (vendorId) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await api.delete(`/vendors/${vendorId}`);
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendor(null);
    setFormData({
      vendor_name: '',
      vendor_type: 'Cloud',
      shared_status: 'Exclusive',
      poc_email: '',
      poc_phone: '',
      payment_terms: 'NET 30',
      default_due_days: 30,
      notes: ''
    });
  };

  const getVendorTypeColor = (type) => {
    const colors = {
      'Cloud': 'bg-blue-50 text-blue-700',
      'SaaS': 'bg-green-50 text-green-700',
      'Staff Augmentation': 'bg-purple-50 text-purple-700',
      'Other': 'bg-gray-50 text-gray-700'
    };
    return colors[type] || 'bg-gray-50 text-gray-700';
  };

  const getSharedStatusColor = (status) => {
    return status === 'Shared' ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700';
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
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600">Manage your service providers and vendor relationships</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div key={vendor.vendor_id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{vendor.vendor_name}</h3>
                <div className="flex space-x-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getVendorTypeColor(vendor.vendor_type)}`}>
                    {vendor.vendor_type}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getSharedStatusColor(vendor.shared_status)}`}>
                    {vendor.shared_status}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(vendor)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(vendor.vendor_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(vendor.poc_email || vendor.poc_phone) && (
                <div className="space-y-2">
                  {vendor.poc_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`mailto:${vendor.poc_email}`} className="hover:text-blue-600">
                        {vendor.poc_email}
                      </a>
                    </div>
                  )}
                  {vendor.poc_phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <a href={`tel:${vendor.poc_phone}`} className="hover:text-blue-600">
                        {vendor.poc_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.payment_terms || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Days</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.default_due_days || 'N/A'}</p>
                </div>
              </div>

              {vendor.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{vendor.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  vendor.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {vendor.status || 'Active'}
                </span>
                <span className="text-xs text-gray-500">
                  Added: {new Date(vendor.created_at).toLocaleDateString('en-IN')}
                </span>
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
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Type
                  </label>
                  <select
                    value={formData.vendor_type}
                    onChange={(e) => setFormData({...formData, vendor_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cloud">Cloud</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Staff Augmentation">Staff Augmentation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shared Status
                  </label>
                  <select
                    value={formData.shared_status}
                    onChange={(e) => setFormData({...formData, shared_status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Exclusive">Exclusive</option>
                    <option value="Shared">Shared</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.poc_email}
                    onChange={(e) => setFormData({...formData, poc_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.poc_phone}
                    onChange={(e) => setFormData({...formData, poc_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Due Days
                  </label>
                  <input
                    type="number"
                    value={formData.default_due_days}
                    onChange={(e) => setFormData({...formData, default_due_days: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  {editingVendor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;