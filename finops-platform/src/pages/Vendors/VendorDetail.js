import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentIcon,
  EyeIcon,
  ShareIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TagIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const VendorDetail = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [uploadMode, setUploadMode] = useState('link'); // 'link' or 'upload'
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [documentForm, setDocumentForm] = useState({
    document_name: '',
    document_type: 'Agreement',
    file_path: '',
    description: '',
    tags: []
  });

  const [fileForm, setFileForm] = useState({
    document_name: '',
    document_type: 'Agreement',
    description: '',
    tags: [],
    file: null
  });

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: '',
    amount: '',
    due_date: '',
    status: 'Pending',
    description: '',
    pod_id: ''
  });

  const [editForm, setEditForm] = useState({
    vendor_name: '',
    contact_person: '',
    email: '',
    phone: '',
    vendor_type: 'Shared',
    shared_status: 'Not Shared',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    if (vendorId) {
      fetchVendorDetails();
      fetchVendorInvoices();
      fetchVendorDocuments();
    }
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const response = await api.get(`/vendors/${vendorId}`);
      setVendor(response.data.vendor);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    }
  };

  const fetchVendorInvoices = async () => {
    try {
      const response = await api.get(`/invoices?vendor_id=${vendorId}`);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchVendorDocuments = async () => {
    try {
      const response = await api.get(`/vendors/${vendorId}/documents`);
      const documents = response.data.documents || [];
      // Parse tags JSON for each document
      const processedDocuments = documents.map(doc => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : []
      }));
      setDocuments(processedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVendor = () => {
    setEditForm({
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      vendor_type: vendor.vendor_type || 'Shared',
      shared_status: vendor.shared_status || 'Not Shared',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/vendors/${vendorId}`, editForm);
      fetchVendorDetails();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Error updating vendor. Please try again.');
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditForm({
      vendor_name: '',
      contact_person: '',
      email: '',
      phone: '',
      vendor_type: 'Shared',
      shared_status: 'Not Shared',
      address: '',
      city: '',
      state: '',
      pincode: ''
    });
  };

  const handleDeleteVendor = async () => {
    if (window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      try {
        await api.delete(`/vendors/${vendorId}`);
        navigate('/vendors');
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('Error deleting vendor. Please try again.');
      }
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (uploadMode === 'upload') {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', fileForm.file);
        formData.append('document_name', fileForm.document_name);
        formData.append('document_type', fileForm.document_type);
        formData.append('description', fileForm.description);
        formData.append('tags', JSON.stringify(fileForm.tags));

        await api.post(`/vendors/${vendorId}/documents/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Handle link-based document
        if (editingDocument) {
          await api.put(`/vendors/${vendorId}/documents/${editingDocument.document_id}`, documentForm);
        } else {
          await api.post(`/vendors/${vendorId}/documents`, documentForm);
        }
      }
      fetchVendorDocuments();
      handleDocumentModalClose();
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/vendors/${vendorId}/documents/${documentId}`);
        fetchVendorDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const invoiceData = {
        ...invoiceForm,
        vendor_id: vendorId,
        amount: parseFloat(invoiceForm.amount)
      };

      if (editingInvoice) {
        await api.put(`/invoices/${editingInvoice.invoice_id}`, invoiceData);
      } else {
        await api.post('/invoices', invoiceData);
      }
      fetchVendorInvoices();
      handleInvoiceModalClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await api.delete(`/invoices/${invoiceId}`);
        fetchVendorInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  };

  const handleDocumentModalClose = () => {
    setShowDocumentModal(false);
    setEditingDocument(null);
    setUploadMode('link');
    setDocumentForm({
      document_name: '',
      document_type: 'Agreement',
      file_path: '',
      description: '',
      tags: []
    });
    setFileForm({
      document_name: '',
      document_type: 'Agreement',
      description: '',
      tags: [],
      file: null
    });
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
      pod_id: ''
    });
  };

  const handleEditDocument = (document) => {
    setEditingDocument(document);
    setDocumentForm({
      document_name: document.document_name,
      document_type: document.document_type,
      file_path: document.file_path,
      description: document.description,
      tags: document.tags || []
    });
    setShowDocumentModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceForm({
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      due_date: invoice.due_date,
      status: invoice.status,
      description: invoice.description,
      pod_id: invoice.pod_id
    });
    setShowInvoiceModal(true);
  };

  const openDocument = (document) => {
    if (document.file_path) {
      // For PDF files, open in new tab
      if (document.file_path.toLowerCase().endsWith('.pdf')) {
        window.open(document.file_path, '_blank');
      } else {
        // For other files, create download link
        const link = document.createElement('a');
        link.href = document.file_path;
        link.download = document.document_name;
        link.click();
      }
    }
  };

  const shareDocument = (document) => {
    if (document.file_path) {
      navigator.clipboard.writeText(document.file_path);
      alert('Document link copied to clipboard!');
    }
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

  const getDocumentTypeColor = (type) => {
    const colors = {
      'Agreement': 'bg-blue-50 text-blue-700',
      'Contract': 'bg-purple-50 text-purple-700',
      'Invoice': 'bg-green-50 text-green-700',
      'Other': 'bg-gray-50 text-gray-700'
    };
    return colors[type] || 'bg-gray-50 text-gray-700';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vendor not found</h2>
          <Link to="/vendors" className="text-blue-600 hover:text-blue-800">
            Back to Vendors
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
              onClick={() => navigate('/vendors')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.vendor_name}</h1>
              <div className="flex items-center space-x-2 mt-1">
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
                <span className={`text-xs px-2 py-1 rounded-full ${
                  vendor.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {vendor.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleEditVendor}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDeleteVendor}
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
          {['about', 'documents', 'invoices'].map((tab) => (
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
                      {vendor.poc_email && (
                        <div className="flex items-center text-sm">
                          <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">Email:</span>
                          <a href={`mailto:${vendor.poc_email}`} className="ml-1 text-blue-600 hover:underline">
                            {vendor.poc_email}
                          </a>
                        </div>
                      )}
                      {vendor.poc_phone && (
                        <div className="flex items-center text-sm">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">Phone:</span>
                          <a href={`tel:${vendor.poc_phone}`} className="ml-1 text-blue-600 hover:underline">
                            {vendor.poc_phone}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Payment Terms:</span>
                        <span className="ml-1 font-medium text-gray-900">{vendor.payment_terms || 'N/A'}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Due Days:</span>
                        <span className="ml-1 font-medium text-gray-900">{vendor.default_due_days || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {vendor.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                    </div>
                  </div>
                )}

                {/* Pod Information */}
                {vendor.pod_names && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Associated Pods</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{vendor.pod_names}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900">{documents.length}</p>
                          <p className="text-sm text-blue-700">Documents</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-2xl font-bold text-green-900">{invoices.length}</p>
                          <p className="text-sm text-green-700">Invoices</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {vendor.tags && vendor.tags.length > 0 ? (
                      vendor.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No tags assigned</p>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">
                        {new Date(vendor.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="text-gray-900">
                        {new Date(vendor.updated_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <button
                onClick={() => setShowDocumentModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Document
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-4">Add your first document to get started</p>
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Document
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div key={document.document_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">{document.document_name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getDocumentTypeColor(document.document_type)}`}>
                            {document.document_type}
                          </span>
                        </div>
                        {document.description && (
                          <p className="text-sm text-gray-600 mb-3">{document.description}</p>
                        )}
                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {document.tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Added: {new Date(document.created_at).toLocaleDateString('en-IN')}</span>
                          {document.file_path && (
                            <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                              {document.file_path.split('/').pop()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {document.file_path && (
                          <>
                            <button
                              onClick={() => openDocument(document)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Document"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => shareDocument(document)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share Link"
                            >
                              <ShareIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEditDocument(document)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Document"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(document.document_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Document"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          ₹{parseFloat(invoice.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
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
      </div>

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingDocument ? 'Edit Document' : 'Add Document'}
            </h2>
            {!editingDocument && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to add this document?
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setUploadMode('link')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      uploadMode === 'link'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🔗 Add Link/URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('upload')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      uploadMode === 'upload'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📁 Upload File
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleDocumentSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadMode === 'upload' ? fileForm.document_name : documentForm.document_name}
                    onChange={(e) => uploadMode === 'upload'
                      ? setFileForm({...fileForm, document_name: e.target.value})
                      : setDocumentForm({...documentForm, document_name: e.target.value})
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadMode === 'upload' ? fileForm.document_type : documentForm.document_type}
                    onChange={(e) => uploadMode === 'upload'
                      ? setFileForm({...fileForm, document_type: e.target.value})
                      : setDocumentForm({...documentForm, document_type: e.target.value})
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Agreement">Agreement</option>
                    <option value="Contract">Contract</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {uploadMode === 'upload' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        required={!editingDocument}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFileForm({
                              ...fileForm,
                              file: file,
                              document_name: fileForm.document_name || file.name.replace(/\.[^/.]+$/, "")
                            });
                          }
                        }}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {fileForm.file ? (
                          <div className="space-y-2">
                            <div className="text-green-600 font-medium">✓ File Selected</div>
                            <div className="text-sm text-gray-600 truncate">{fileForm.file.name}</div>
                            <div className="text-xs text-gray-500">
                              {(fileForm.file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-gray-600">
                              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                            </div>
                            <div className="text-xs text-gray-500">
                              PDF, Word, Excel, PowerPoint, text, images (MAX. 10MB)
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Path / URL
                    </label>
                    <input
                      type="text"
                      value={documentForm.file_path}
                      onChange={(e) => setDocumentForm({...documentForm, file_path: e.target.value})}
                      placeholder="https://example.com/document.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadMode === 'upload' ? fileForm.description : documentForm.description}
                    onChange={(e) => uploadMode === 'upload'
                      ? setFileForm({...fileForm, description: e.target.value})
                      : setDocumentForm({...documentForm, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={uploadMode === 'upload' ? fileForm.tags.join(', ') : documentForm.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                      if (uploadMode === 'upload') {
                        setFileForm({...fileForm, tags});
                      } else {
                        setDocumentForm({...documentForm, tags});
                      }
                    }}
                    placeholder="important, legal, 2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleDocumentModalClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingDocument ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Edit Vendor Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Vendor</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.vendor_name}
                    onChange={(e) => setEditForm({...editForm, vendor_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editForm.contact_person}
                    onChange={(e) => setEditForm({...editForm, contact_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Type
                  </label>
                  <select
                    value={editForm.vendor_type}
                    onChange={(e) => setEditForm({...editForm, vendor_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Shared">Shared</option>
                    <option value="Dedicated">Dedicated</option>
                    <option value="Consultant">Consultant</option>
                    <option value="Freelancer">Freelancer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shared Status
                  </label>
                  <select
                    value={editForm.shared_status}
                    onChange={(e) => setEditForm({...editForm, shared_status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Shared">Shared</option>
                    <option value="Not Shared">Not Shared</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={editForm.state}
                      onChange={(e) => setEditForm({...editForm, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={editForm.pincode}
                      onChange={(e) => setEditForm({...editForm, pincode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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

export default VendorDetail;