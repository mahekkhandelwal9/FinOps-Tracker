import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { companyAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumb from '../../components/UI/Breadcrumb';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeletedNotes, setShowDeletedNotes] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(() => {
    const savedState = localStorage.getItem('company-notes-collapsed');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [editFormData, setEditFormData] = useState({
    company_name: '',
    description: '',
    total_budget: '',
    financial_period: '',
    notes: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchCompanyDetails();
    fetchDashboard();
    fetchNotes();
  }, [id]);

  useEffect(() => {
    localStorage.setItem('company-notes-collapsed', JSON.stringify(isNotesCollapsed));
  }, [isNotesCollapsed]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await companyAPI.getById(id);
      setCompany(response.data.company);
      setEditFormData({
        company_name: response.data.company.company_name,
        description: response.data.company.description || '',
        total_budget: response.data.company.total_budget,
        financial_period: response.data.company.financial_period,
        notes: response.data.company.notes || '',
        status: response.data.company.status || 'Active'
      });
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      // Remove date filtering to get all-time data
      const response = await companyAPI.getDashboard(id, 'all_time');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await companyAPI.getNotes(id);
      console.log('Notes fetched:', response.data.notes);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      if (editingNote) {
        await companyAPI.updateNote(id, editingNote.note_id, { note_text: noteText });
      } else {
        await companyAPI.addNote(id, { note_text: noteText });
      }

      setNoteText('');
      setEditingNote(null);
      setShowNoteModal(false);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteText(note.note_text);
    setShowNoteModal(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await companyAPI.deleteNote(id, noteId);
        // Don't auto-toggle - let user decide when to view deleted notes
        await fetchNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleEditCompany = async (e) => {
    e.preventDefault();
    try {
      await companyAPI.update(id, editFormData);
      setIsEditing(false);
      fetchCompanyDetails();
    } catch (error) {
      console.error('Error updating company:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${amount ? amount.toLocaleString('en-IN') : '0'}`;
  };

  // Prepare monthly trend data for chart
  const prepareMonthlyTrendData = (monthlyTrend) => {
    if (!monthlyTrend || monthlyTrend.length === 0) return [];

    // Sort by date (ascending)
    const sortedData = [...monthlyTrend].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateA - dateB;
    });

    // Format month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return sortedData.map(item => ({
      month: `${monthNames[parseInt(item.month) - 1]} ${item.year}`,
      totalAmount: parseFloat(item.total_amount) || 0,
      paidAmount: parseFloat(item.paid_amount) || 0,
      invoiceCount: parseInt(item.invoice_count) || 0
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Check if the date string has timezone info (ends with Z or has timezone offset)
    const hasTimezone = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-') && (dateString.includes('T') && dateString.split('T')[1].includes('-') || dateString.includes('+'));

    if (!hasTimezone) {
      // If no timezone info, treat it as local time (database format)
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // If timezone info present, convert to IST
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    }
  };

  // Use real-time data from backend API with fallbacks
  const getRealTimeSummary = () => {
    if (!dashboard?.summary) return {};

    // Get backend data
    const backendData = dashboard.summary;

    // Debug log to check what data we're getting
    console.log('Dashboard Summary Data:', backendData);
    console.log('Company Budget:', company?.total_budget);
    console.log('Allocated Budget:', backendData.allocated_budget);

    // Calculate fallbacks if backend data is missing
    const totalInvoices = backendData.total_invoices || 0;
    const paidInvoices = backendData.paid_invoices || 0;
    const pendingInvoices = backendData.pending_invoices || 0;
    const usedBudget = backendData.total_invoice_amount || backendData.used_budget || 0;
    const totalBudget = company?.total_budget || 0;

    // Calculate percentages if not provided
    const paidPercentage = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;

    const summary = {
      ...backendData,
      // Use backend-calculated values with fallbacks
      total_pods: backendData.total_pods || 0,
      total_invoices: totalInvoices,
      total_vendors: backendData.total_vendors || 0,
      // Total spend comes from actual invoices (not pod budget_used)
      used_budget: usedBudget,
      // Budget utilization percentage from backend or calculate
      budget_utilization_percentage: backendData.invoice_utilization_percentage || budgetUtilization,
      // Additional real-time metrics
      allocated_budget: backendData.allocated_budget || 0,
      paid_amount: backendData.paid_amount || 0,
      pending_amount: backendData.pending_amount || 0,
      paid_invoices: paidInvoices,
      pending_invoices: pendingInvoices,
      active_pods: backendData.active_pods || 0
    };

    // Debug logging (remove in production)
    console.log('🔍 Dashboard Summary Debug:', {
      total_invoices: summary.total_invoices,
      paid_invoices: summary.paid_invoices,
      pending_invoices: summary.pending_invoices,
      budget_utilization_percentage: summary.budget_utilization_percentage,
      used_budget: summary.used_budget,
      paidPercentage: paidPercentage
    });

    return summary;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Company not found</h2>
          <button
            onClick={() => navigate('/companies')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Companies
          </button>
        </div>
      </div>
    );
  }

  const realTimeSummary = getRealTimeSummary();

  return (
    <div className={`min-h-screen bg-gray-50`}>
      <div className={`p-6 max-w-7xl transition-all duration-300 ${
        isNotesCollapsed ? 'pr-20' : 'pr-96'
      }`}>
        {/* Header with Breadcrumb */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <Breadcrumb companyName={company?.company_name} />
            </div>

            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                company.status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1">Company Overview & Analytics</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Company
            </button>
          </div>
        </div>

        {/* Edit Mode */}
        {isEditing && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Edit Company Details</h2>
            <form onSubmit={handleEditCompany}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.company_name}
                    onChange={(e) => setEditFormData({...editFormData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Budget (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editFormData.total_budget}
                    onChange={(e) => setEditFormData({...editFormData, total_budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Financial Period *
                  </label>
                  <select
                    value={editFormData.financial_period}
                    onChange={(e) => setEditFormData({...editFormData, financial_period: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description of the company..."
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about the company..."
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Key Metrics - Real-time Dashboard Cards with Progress Bars */}
        {dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Pods</p>
                  <p className="text-2xl font-bold text-gray-900">{realTimeSummary.total_pods || 0}</p>
                </div>
              </div>
              {/* Active Pods Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Active Pods</span>
                  <span className="font-medium text-gray-700">
                    {realTimeSummary.active_pods || 0} / {realTimeSummary.total_pods || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(realTimeSummary.total_pods || 0) > 0 ? ((realTimeSummary.active_pods || 0) / (realTimeSummary.total_pods || 0)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {((realTimeSummary.total_pods || 0) > 0 ? ((realTimeSummary.active_pods || 0) / (realTimeSummary.total_pods || 0)) * 100 : 0).toFixed(0)}% active
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(company.total_budget)}
                  </p>
                </div>
              </div>
              {/* Budget Allocation Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Allocated to Pods</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(realTimeSummary.allocated_budget || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${company.total_budget > 0 ? Math.min(((realTimeSummary.allocated_budget || 0) / company.total_budget) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {company.total_budget > 0 ? Math.min(((realTimeSummary.allocated_budget || 0) / company.total_budget * 100), 100).toFixed(1) : 0}% allocated
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{realTimeSummary.total_invoices || 0}</p>
                </div>
              </div>
              {/* Invoice Status Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Paid Invoices</span>
                  <span className="font-medium text-gray-700">
                    {realTimeSummary.paid_invoices || 0} / {realTimeSummary.total_invoices || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(realTimeSummary.total_invoices || 0) > 0 ? ((realTimeSummary.paid_invoices || 0) / (realTimeSummary.total_invoices || 0)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {((realTimeSummary.total_invoices || 0) > 0 ? ((realTimeSummary.paid_invoices || 0) / (realTimeSummary.total_invoices || 0)) * 100 : 0).toFixed(0)}% paid
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <ArrowTrendingUpIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Spend</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(realTimeSummary.used_budget || 0)}
                  </p>
                </div>
              </div>
              {/* Budget Used Progress Bar - MAIN FEATURE */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Budget Used</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(realTimeSummary.used_budget || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (realTimeSummary.budget_utilization_percentage || 0) > 90
                        ? 'bg-red-600'
                        : (realTimeSummary.budget_utilization_percentage || 0) > 70
                        ? 'bg-yellow-600'
                        : 'bg-orange-600'
                    }`}
                    style={{
                      width: `${Math.min(realTimeSummary.budget_utilization_percentage || 0, 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {realTimeSummary.budget_utilization_percentage || 0}% of budget used
                </p>
              </div>
            </div>
          </div>
        )}

        
        {/* Company Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-900">{company.description || 'No description provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Financial Period</p>
              <p className="text-gray-900">{company.financial_period}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created Date</p>
              <p className="text-gray-900">{formatDate(company.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pod Breakdown - Pie Chart Style */}
          {dashboard?.podBreakdown && dashboard.podBreakdown.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartPieIcon className="h-5 w-5 mr-2 text-blue-600" />
                Pod-wise Spending Distribution
              </h3>
              <div className="space-y-3">
                {dashboard.podBreakdown.map((pod, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                  const color = colors[index % colors.length];
                  const percentage = dashboard.podBreakdown.reduce((sum, p) => sum + (p.total_spend || 0), 0) > 0
                    ? ((pod.total_spend || 0) / dashboard.podBreakdown.reduce((sum, p) => sum + (p.total_spend || 0), 0)) * 100
                    : 0;

                  return (
                    <div key={pod.pod_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full ${color} mr-3`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{pod.pod_name}</span>
                            <span className="text-sm text-gray-900 font-semibold">{formatCurrency(pod.total_spend)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{pod.invoice_count || 0} invoices</span>
                            <span>{percentage.toFixed(1)}% of total spend</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Breakdown - Pie Chart Style */}
          {dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartPieIcon className="h-5 w-5 mr-2 text-green-600" />
                Category-wise Spending Distribution
              </h3>
              <div className="space-y-3">
                {dashboard.categoryBreakdown.map((category, index) => {
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                  const color = colors[index % colors.length];
                  const totalCategorySpend = dashboard.categoryBreakdown.reduce((sum, c) => sum + (c.total_spend || 0), 0);
                  const percentage = totalCategorySpend > 0 ? ((category.total_spend || 0) / totalCategorySpend) * 100 : 0;

                  return (
                    <div key={category.vendor_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center flex-1">
                        <div className={`w-4 h-4 rounded-full ${color} mr-3`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{category.vendor_type}</span>
                            <span className="text-sm text-gray-900 font-semibold">{formatCurrency(category.total_spend)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{category.invoice_count || 0} invoices</span>
                            <span>{percentage.toFixed(1)}% of total spend</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Invoices Table */}
        {dashboard?.recentInvoices && dashboard.recentInvoices.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pod</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboard.recentInvoices.map((invoice) => (
                    <tr key={invoice.invoice_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoice_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.vendor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.pod_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Spending Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-purple-600" />
            Monthly Spending Trend
          </h3>
          <div className="h-80">
            {dashboard?.monthlyTrend && dashboard.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareMonthlyTrendData(dashboard.monthlyTrend)}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), '']}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Total Invoiced"
                  />
                  <Line
                    type="monotone"
                    dataKey="paidAmount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Paid Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <ArrowTrendingUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm">No monthly spending data available</p>
                  <p className="text-gray-400 text-xs mt-1">Invoices will appear here once added</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Right Sidebar - Notes */}
      <div className={`fixed right-0 top-0 bg-white border-l border-gray-200 z-20 transition-all duration-300 ease-in-out ${
        isNotesCollapsed ? 'w-16' : 'w-96'
      }`}>
        <div className={`p-6 overflow-y-auto h-full pb-20 ${isNotesCollapsed ? 'px-2' : ''}`}>
          {/* Collapsible Header */}
          <div className="mb-4">
            <button
              onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              title={isNotesCollapsed ? 'Expand notes panel' : 'Collapse notes panel'}
            >
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftRightIcon className={`h-5 w-5 text-gray-600 group-hover:text-gray-800 transition-colors ${isNotesCollapsed ? 'h-6 w-6' : ''}`} />
                {!isNotesCollapsed && (
                  <h3 className="text-lg font-semibold text-gray-900">Company Notes</h3>
                )}
              </div>
              <div className="flex items-center space-x-1">
                {!isNotesCollapsed && (
                  <>
                    <label className="flex items-center cursor-pointer mr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={showDeletedNotes}
                        onChange={(e) => setShowDeletedNotes(e.target.checked)}
                        className="sr-only"
                      />
                      <div className="relative">
                        <div className={`block w-10 h-6 rounded-full ${showDeletedNotes ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${showDeletedNotes ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-700">Show deleted</span>
                    </label>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {notes.filter(note => showDeletedNotes || !note.deleted_at).length}
                    </div>
                  </>
                )}
                {isNotesCollapsed ? (
                  <ChevronLeftIcon className="h-4 w-4 text-gray-600 group-hover:text-gray-800 transition-colors" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover:text-gray-800 transition-colors" />
                )}
              </div>
            </button>
          </div>

          {/* Collapsible Content */}
          <div className={`transition-all duration-300 ease-in-out ${
            isNotesCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'
          }`}>
            <div className="mb-6">
              <button
                onClick={() => setShowNoteModal(true)}
                className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Note
              </button>
            </div>

            <div className="space-y-4">
          {notes.filter(note => showDeletedNotes || !note.deleted_at).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showDeletedNotes ? 'No deleted notes found.' : 'No notes yet. Click "Add Note" to create the first note.'}
            </div>
          ) : (
            notes.filter(note => showDeletedNotes || !note.deleted_at).map((note) => {
              const isDeleted = note.deleted_at !== null && note.deleted_at !== undefined;
              console.log(`Note ${note.note_id}: deleted_at=${note.deleted_at}, isDeleted=${isDeleted}`);
              return (
                <div
                  key={note.note_id}
                  className={`border rounded-lg p-4 ${
                    isDeleted
                      ? 'border-red-300 bg-red-50 opacity-80 shadow-sm'
                      : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm mb-2 break-words overflow-wrap-anywhere whitespace-pre-wrap ${
                        isDeleted ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {note.note_text}
                      </p>
                      <div className="flex flex-wrap items-center text-xs text-gray-500 gap-x-2 gap-y-1">
                        <span>By {note.created_by_name}</span>
                        <span>•</span>
                        <span>{formatDate(note.created_at)}</span>
                        {note.updated_at !== note.created_at && !isDeleted && (
                          <>
                            <span>•</span>
                            <span>Updated</span>
                          </>
                        )}
                        {isDeleted && (
                          <>
                            <span className="text-red-600 font-medium">•</span>
                            <span className="text-red-600 font-medium">
                              Deleted by {note.deleted_by_name || 'Unknown user'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {!isDeleted && (
                      <div className="flex space-x-1 ml-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit note"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.note_id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete note"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Note Modal */}
        {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingNote ? 'Edit Note' : 'Add Note'}
            </h3>
            <form onSubmit={handleAddNote}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your note here..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteModal(false);
                    setEditingNote(null);
                    setNoteText('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingNote ? 'Update' : 'Add'}
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