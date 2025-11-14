import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PhoneIcon,
  TagIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const PodDetail = () => {
  const { podId } = useParams();
  const navigate = useNavigate();
  const [pod, setPod] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    amount: '',
    due_date: '',
    status: 'Pending',
    description: '',
    vendor_id: ''
  });

  const [editForm, setEditForm] = useState({
    pod_name: '',
    company_id: '',
    description: '',
    budget_ceiling: '',
    threshold_alert: 80
  });

  useEffect(() => {
    if (podId) {
      fetchPodDetails();
      fetchPodInvoices();
      fetchPodVendors();
      fetchCompanies();
    }
  }, [podId]);

  const fetchPodDetails = async () => {
    try {
      const response = await api.get(`/pods/${podId}`);
      setPod(response.data.pod);
    } catch (error) {
      console.error('Error fetching pod details:', error);
    }
  };

  const fetchPodInvoices = async () => {
    try {
      const response = await api.get(`/invoices?pod_id=${podId}`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchPodVendors = async () => {
    try {
      const response = await api.get(`/pods/${podId}/vendors`);
      setVendors(response.data.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
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
    }
  };

  const handleEditPod = () => {
    setEditForm({
      pod_name: pod.pod_name,
      company_id: pod.company_id,
      description: pod.description || '',
      budget_ceiling: pod.budget_ceiling,
      threshold_alert: pod.threshold_alert || 80
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/pods/${podId}`, editForm);
      fetchPodDetails();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating pod:', error);
      alert('Error updating pod. Please try again.');
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditForm({
      pod_name: '',
      company_id: '',
      description: '',
      budget_ceiling: '',
      threshold_alert: 80
    });
  };

  const handleDeletePod = async () => {
    if (window.confirm('Are you sure you want to delete this pod? This action cannot be undone.')) {
      try {
        await api.delete(`/pods/${podId}`);
        navigate('/pods');
      } catch (error) {
        console.error('Error deleting pod:', error);
        alert('Error deleting pod. Please try again.');
      }
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const invoiceData = {
        ...invoiceForm,
        pod_id: podId,
        amount: parseFloat(invoiceForm.amount)
      };

      if (editingInvoice) {
        await api.put(`/invoices/${editingInvoice.invoice_id}`, invoiceData);
      } else {
        await api.post('/invoices', invoiceData);
      }
      fetchPodInvoices();
      handleInvoiceModalClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await api.delete(`/invoices/${invoiceId}`);
        fetchPodInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false);
    setEditingInvoice(null);
    setInvoiceForm({
      invoice_number: '',
      amount: '',
      due_date: '',
      status: 'Pending',
      description: '',
      vendor_id: ''
    });
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      due_date: invoice.due_date,
      status: invoice.status,
      description: invoice.description,
      vendor_id: invoice.vendor_id
    });
    setShowInvoiceModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-50 text-yellow-700',
      'Paid': 'bg-green-50 text-green-700',
      'Overdue': 'bg-red-50 text-red-700',
      'Partially Paid': 'bg-blue-50 text-blue-700'
    };
    return colors[status] || 'bg-gray-50 text-gray-700';
  };

  const getBudgetStatus = () => {
    if (!pod || !pod.budget_ceiling) return { color: 'bg-gray-100 text-gray-700', text: 'No Budget' };

    const totalSpent = invoices
      .filter(inv => inv.status !== 'Pending')
      .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

    const percentage = (totalSpent / parseFloat(pod.budget_ceiling)) * 100;

    if (percentage < pod.threshold_alert) {
      return { color: 'bg-green-50 text-green-700', text: 'On Track' };
    } else if (percentage < 95) {
      return { color: 'bg-yellow-50 text-yellow-700', text: 'Warning' };
    } else {
      return { color: 'red-50 text-red-700', text: 'Over Budget' };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!pod) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Pod not found</h2>
          <Link to="/pods" className="text-blue-600 hover:text-blue-800">
            Back to Pods
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/pods')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pod.pod_name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${getBudgetStatus().color}`}>
                  {getBudgetStatus().text}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  pod.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {pod.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleEditPod}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDeletePod}
              className="flex items-center px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['about', 'invoices', 'vendors'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Company:</span>
                        {pod.company_name ? (
                          <Link to={`/companies/${pod.company_id}`} className="ml-1 text-blue-600 hover:underline">
                            {pod.company_name}
                          </Link>
                        ) : (
                          <span className="ml-1 text-gray-900">Not assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Budget Ceiling:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {pod.budget_ceiling ? formatCurrency(pod.budget_ceiling) : 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Alert Threshold:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {pod.threshold_alert}% of budget
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {pod.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{pod.description}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {pod.tags && pod.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {pod.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Budget Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview</h3>
                  <div className="space-y-3">
                    <div className={`${getBudgetStatus().color} rounded-lg p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Budget Status</span>
                        <ChartBarIcon className="h-5 w-5" />
                      </div>
                      <div className="text-2xl font-bold">{getBudgetStatus().text}</div>
                      {pod.budget_ceiling && (
                        <div className="text-sm mt-1">
                          {invoices
                            .filter(inv => inv.status !== 'Pending')
                            .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0)
                          .toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                        } / {parseFloat(pod.budget_ceiling).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </div>
                      )}
                    </div>
                    {pod.budget_ceiling && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Budget Used</span>
                          <span className="text-gray-900 font-medium">
                            {(
                              (invoices
                                .filter(inv => inv.status !== 'Pending')
                                .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0) /
                              parseFloat(pod.budget_ceiling)) * 100
                            ).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                (invoices
                                  .filter(inv => inv.status !== 'Pending')
                                  .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0) /
                                  parseFloat(pod.budget_ceiling)) * 100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900">{invoices.length}</p>
                          <p className="text-sm text-blue-700">Invoices</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-2xl font-bold text-green-900">{vendors.length}</p>
                          <p className="text-sm text-green-700">Vendors</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Invoices:</span>
                      <span className="font-medium text-gray-900">{invoices.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(
                          invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-medium text-yellow-600">
                        {invoices.filter(inv => inv.status === 'Pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overdue:</span>
                      <span className="font-medium text-red-600">
                        {invoices.filter(inv => inv.status === 'Overdue').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">
                        {new Date(pod.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="text-gray-900">
                        {new Date(pod.updated_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Invoice
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Invoice
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.vendor_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invoice.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice.invoice_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Associated Vendors</h3>
            </div>

            {vendors.length === 0 ? (
              <div className="text-center py-12">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors associated</h3>
                <p className="text-gray-500 mb-4">
                  This pod doesn't have any vendors assigned to it yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map((vendor) => (
                  <div key={vendor.vendor_id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{vendor.vendor_name}</h4>
                        <div className="flex space-x-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            vendor.vendor_type === 'Cloud' ? 'bg-blue-50 text-blue-700' :
                            vendor.vendor_type === 'SaaS' ? 'bg-green-50 text-green-700' :
                            vendor.vendor_type === 'Staff Augmentation' ? 'bg-purple-50 text-purple-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {vendor.vendor_type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            vendor.shared_status === 'Shared' ? 'bg-orange-50 text-orange-700' : 'bg-teal-50 text-teal-700'
                          }`}>
                            {vendor.shared_status}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/vendors/${vendor.vendor_id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Vendor Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
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
                          <p className="text text-gray-500">Due Days</p>
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
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <form onSubmit={handleInvoiceSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoice_number}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({...invoiceForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <select
                    value={invoiceForm.vendor_id}
                    onChange={(e) => setInvoiceForm({...invoiceForm, vendor_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleInvoiceModalClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingInvoice ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pod Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Pod</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pod Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.pod_name}
                    onChange={(e) => setEditForm({...editForm, pod_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    required
                    value={editForm.company_id}
                    onChange={(e) => setEditForm({...editForm, company_id: e.target.value})}
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
                    value={editForm.budget_ceiling}
                    onChange={(e) => setEditForm({...editForm, budget_ceiling: e.target.value})}
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
                    value={editForm.threshold_alert}
                    onChange={(e) => setEditForm({...editForm, threshold_alert: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleEditModalClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodDetail;