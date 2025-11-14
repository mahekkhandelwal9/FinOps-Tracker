import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  TagIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const CompanyDetail = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [pods, setPods] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Form states
  const [editForm, setEditForm] = useState({
    company_name: '',
    total_budget: '',
    currency: 'INR',
    financial_period: 'Yearly',
    description: '',
    notes: ''
  });

  const [noteForm, setNoteForm] = useState({
    note_title: '',
    note_content: '',
    note_type: 'General'
  });

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
      fetchCompanyNotes();
    }
  }, [companyId]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      const companyData = response.data.company;
      setCompany(companyData);
      // Set pods and vendors from the company detail response
      setPods(companyData.pods || []);
      // Generate analytics from the available data
      generateAnalytics(companyData);
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = (companyData) => {
    const pods = companyData.pods || [];
    const stats = companyData.stats || {};

    const analyticsData = {
      totalPods: pods.length,
      activePods: pods.filter(pod => pod.status === 'Active').length,
      totalBudgetAllocated: stats.total_budget_allocated || 0,
      totalBudgetUsed: stats.total_budget_used || 0,
      budgetUtilization: stats.total_budget_allocated > 0
        ? ((stats.total_budget_used / stats.total_budget_allocated) * 100).toFixed(1)
        : 0,
      totalVendors: stats.total_vendors || 0,
      totalInvoices: stats.total_invoices || 0,
      avgPodBudget: pods.length > 0
        ? Math.round(pods.reduce((sum, pod) => sum + (pod.budget_ceiling || 0), 0) / pods.length)
        : 0,
      topPerformingPods: pods
        .filter(pod => pod.budget_ceiling > 0)
        .sort((a, b) => (b.budget_used / b.budget_ceiling) - (a.budget_used / a.budget_ceiling))
        .slice(0, 3),
      budgetStatusDistribution: {
        onTrack: pods.filter(pod => {
          const utilization = pod.budget_ceiling > 0 ? (pod.budget_used / pod.budget_ceiling) * 100 : 0;
          return utilization < 80;
        }).length,
        warning: pods.filter(pod => {
          const utilization = pod.budget_ceiling > 0 ? (pod.budget_used / pod.budget_ceiling) * 100 : 0;
          return utilization >= 80 && utilization < 95;
        }).length,
        critical: pods.filter(pod => {
          const utilization = pod.budget_ceiling > 0 ? (pod.budget_used / pod.budget_ceiling) * 100 : 0;
          return utilization >= 95;
        }).length
      }
    };

    setAnalytics(analyticsData);
  };

  const fetchCompanyNotes = async () => {
    try {
      const response = await api.get(`/companies/${companyId}/notes`);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching company notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = () => {
    setEditForm({
      company_name: company.company_name,
      total_budget: company.total_budget || '',
      currency: company.currency || 'INR',
      financial_period: company.financial_period || 'Yearly',
      description: company.description || '',
      notes: company.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/companies/${companyId}`, editForm);
      fetchCompanyDetails();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Error updating company. Please try again.');
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditForm({
      company_name: '',
      total_budget: '',
      currency: 'INR',
      financial_period: 'Yearly',
      description: '',
      notes: ''
    });
  };

  const handleDeleteCompany = async () => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        await api.delete(`/companies/${companyId}`);
        navigate('/companies');
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('Error deleting company. Please try again.');
      }
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingNote) {
        await api.put(`/companies/${companyId}/notes/${editingNote.note_id}`, noteForm);
      } else {
        await api.post(`/companies/${companyId}/notes`, noteForm);
      }
      fetchCompanyNotes();
      handleNoteModalClose();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      note_title: note.note_title,
      note_content: note.note_content,
      note_type: note.note_type
    });
    setShowNoteModal(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await api.delete(`/companies/${companyId}/notes/${noteId}`);
        fetchCompanyNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleNoteModalClose = () => {
    setShowNoteModal(false);
    setEditingNote(null);
    setNoteForm({
      note_title: '',
      note_content: '',
      note_type: 'General'
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
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/companies')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company?.company_name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  company?.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                }`}>
                  {company?.status || 'Active'}
                </span>
                {company?.industry && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                    {company.industry}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleEditCompany}
              className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDeleteCompany}
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
          {[
            { id: 'about', name: 'About', icon: BuildingOfficeIcon },
            { id: 'pods', name: 'Pods', icon: UserGroupIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
            { id: 'notes', name: 'Notes', icon: DocumentTextIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <p className="text-gray-900">{company?.company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Industry</label>
                    <p className="text-gray-900">{company?.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <p className="text-gray-900">{company?.contact_email || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <p className="text-gray-900">{company?.contact_phone || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <p className="text-gray-900">
                      {company?.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          {company.website}
                        </a>
                      ) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="text-gray-900">{company?.address || 'Not specified'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <p className="text-gray-900">{company?.city || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <p className="text-gray-900">{company?.state || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <p className="text-gray-900">{company?.country || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pincode</label>
                      <p className="text-gray-900">{company?.pincode || 'Not specified'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900">{company?.description || 'No description available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Pods</p>
                  <p className="text-2xl font-semibold text-gray-900">{pods.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Vendors</p>
                  <p className="text-2xl font-semibold text-gray-900">{vendors.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Notes</p>
                  <p className="text-2xl font-semibold text-gray-900">{notes.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pods Tab */}
      {activeTab === 'pods' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Company Pods</h3>
            <Link
              to="/pods"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Pod
            </Link>
          </div>

          {pods.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pods yet</h3>
              <p className="text-gray-500 mb-4">Create your first pod to get started</p>
              <Link
                to="/pods"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Pod
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pods.map((pod) => {
                const utilization = getBudgetUtilization(pod);
                const statusColor = getBudgetStatusColor(pod);

                return (
                  <Link
                    key={pod.pod_id}
                    to={`/pods/${pod.pod_id}`}
                    className="block bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{pod.pod_name}</h3>
                        <p className="text-sm text-gray-500">{company?.company_name}</p>
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
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Company Analytics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Budget</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{analytics?.total_budget ? analytics.total_budget.toLocaleString('en-IN') : '0'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Spent</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{analytics?.total_spent ? analytics.total_spent.toLocaleString('en-IN') : '0'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Vendors</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.active_vendors || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics?.total_invoices || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Budget Utilization</h4>
              <div className="space-y-4">
                {pods.slice(0, 5).map((pod) => {
                  const utilization = getBudgetUtilization(pod);
                  return (
                    <div key={pod.pod_id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{pod.pod_name}</span>
                        <span className="text-sm font-medium text-gray-900">{utilization.toFixed(1)}%</span>
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
                  );
                })}
                {pods.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No pods to display</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Top Vendors by Spend</h4>
              <div className="space-y-4">
                {vendors.slice(0, 5).map((vendor) => (
                  <div key={vendor.vendor_id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vendor.vendor_name}</p>
                      <p className="text-xs text-gray-500">{vendor.total_invoices || 0} invoices</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{vendor.total_spend ? vendor.total_spend.toLocaleString('en-IN') : '0'}
                    </p>
                  </div>
                ))}
                {vendors.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No vendors to display</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Company Notes</h3>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Note
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-500 mb-4">Add your first note to get started</p>
              <button
                onClick={() => setShowNoteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <div key={note.note_id} className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-md font-semibold text-gray-900">{note.note_title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(note.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.note_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      note.note_type === 'Important' ? 'bg-red-50 text-red-700' :
                      note.note_type === 'Meeting' ? 'bg-blue-50 text-blue-700' :
                      note.note_type === 'Financial' ? 'bg-green-50 text-green-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {note.note_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{note.note_content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Company</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({...editForm, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Budget (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.total_budget}
                    onChange={(e) => setEditForm({...editForm, total_budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Financial Period
                  </label>
                  <select
                    value={editForm.financial_period}
                    onChange={(e) => setEditForm({...editForm, financial_period: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
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

      {/* Add/Edit Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingNote ? 'Edit Note' : 'Add Note'}
            </h2>
            <form onSubmit={handleNoteSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    required
                    value={noteForm.note_title}
                    onChange={(e) => setNoteForm({...noteForm, note_title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Type
                  </label>
                  <select
                    value={noteForm.note_type}
                    onChange={(e) => setNoteForm({...noteForm, note_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Important">Important</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Financial">Financial</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Content
                  </label>
                  <textarea
                    required
                    value={noteForm.note_content}
                    onChange={(e) => setNoteForm({...noteForm, note_content: e.target.value})}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleNoteModalClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingNote ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetail;