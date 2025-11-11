import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { companyAPI, podAPI, invoiceAPI, alertAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ title, value, icon: Icon, change, changeType, color = 'blue', showProgress = false, progressValue = 0, progressTotal = 0, progressLabel = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const progressBarColors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  };

  const progressPercentage = progressTotal > 0 ? Math.min((progressValue / progressTotal) * 100, 100) : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-4">
        <div className={`flex-shrink-0 p-3 rounded-md ${colorClasses[color]} bg-opacity-10`}>
          <Icon className={`h-6 w-6 text-${color}-500`} />
        </div>
        <div className="ml-4 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              {change && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <ArrowTrendingUpIcon className="self-center h-4 w-4 mr-1" />
                  {change}
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{progressLabel}</span>
            <span className="font-medium text-gray-700">
              {progressValue} / {progressTotal}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${progressBarColors[color]} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            {progressPercentage.toFixed(0)}% paid
          </p>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    companies: 0,
    pods: 0,
    activePods: 0,
    vendors: 0,
    invoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    pendingPayments: 0,
    overdueInvoices: 0,
    totalBudget: 0,
    allocatedBudget: 0,
    usedBudget: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch summary data
      const [companiesData, podsData, invoicesData, alertsData] = await Promise.all([
        companyAPI.getAll().catch(() => ({ data: { companies: [] } })),
        podAPI.getAll().catch(() => ({ data: { pods: [] } })),
        invoiceAPI.getAll({ limit: 20, _cacheBust: Date.now() }).catch(() => ({ data: { invoices: [] } })),
        alertAPI.getSummary({ _cacheBust: Date.now() }).catch(() => ({ data: { summary: {}, recentAlerts: [] } })),
      ]);

      const companies = companiesData.data.companies || [];
      const pods = podsData.data.pods || [];
      const invoices = invoicesData.data.invoices || [];

      // Calculate stats
      const totalBudget = companies.reduce((sum, company) => sum + (company.total_budget || 0), 0);
      const allocatedBudget = pods.reduce((sum, pod) => sum + (pod.budget_ceiling || 0), 0);
      const usedBudget = pods.reduce((sum, pod) => sum + (pod.budget_used || 0), 0);
      const activePods = pods.filter(pod => pod.status === 'Active').length;

      // Invoice status counts from actual invoice data
      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
      const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;

  
      setStats({
        companies: companies.length,
        pods: pods.length,
        activePods: activePods,
        vendors: new Set(pods.flatMap(pod => pod.vendors || [])).size,
        invoices: totalInvoices,
        paidInvoices: paidInvoices,
        pendingInvoices: pendingInvoices,
        pendingPayments: pendingInvoices,
        overdueInvoices: overdueInvoices,
        totalBudget,
        allocatedBudget,
        usedBudget,
      });

      // Sort invoices by date (newest to oldest) before taking recent ones
      const sortedInvoices = invoices.sort((a, b) => new Date(b.invoice_date || b.created_at) - new Date(a.invoice_date || a.created_at));
      setRecentInvoices(sortedInvoices.slice(0, 5));
      setAlerts(alertsData.data.recentAlerts || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'badge-green';
      case 'Pending':
        return 'badge-yellow';
      case 'Overdue':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening with your FinOps platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Companies"
          value={stats.companies}
          icon={BuildingOfficeIcon}
          color="blue"
        />
        <StatCard
          title="Active Pods"
          value={stats.pods}
          icon={UserGroupIcon}
          color="green"
          showProgress={true}
          progressValue={stats.activePods}
          progressTotal={stats.pods}
          progressLabel="Active"
        />
        <StatCard
          title="Total Vendors"
          value={stats.vendors}
          icon={ArchiveBoxIcon}
          color="purple"
        />
        <StatCard
          title="Total Invoices"
          value={stats.invoices}
          icon={DocumentTextIcon}
          color="yellow"
          showProgress={true}
          progressValue={stats.paidInvoices}
          progressTotal={stats.invoices}
          progressLabel={`Paid (${stats.paidInvoices})`}
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          icon={CurrencyDollarIcon}
          color="blue"
          showProgress={true}
          progressValue={stats.allocatedBudget}
          progressTotal={stats.totalBudget}
          progressLabel="Allocated"
        />
        <StatCard
          title="Used Budget"
          value={formatCurrency(stats.usedBudget)}
          icon={ChartBarIcon}
          color="green"
          showProgress={true}
          progressValue={stats.usedBudget}
          progressTotal={stats.allocatedBudget}
          progressLabel="Used of Allocated"
        />
        <StatCard
          title="Pending Payments"
          value={stats.pendingPayments}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <StatCard
          title="Overdue Invoices"
          value={stats.overdueInvoices}
          icon={ExclamationTriangleIcon}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Invoices
            </h3>
            <Link
              to="/invoices"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          <div className="card-body">
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.invoice_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoice_title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invoice.vendor_name} • {formatDate(invoice.invoice_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new invoice.
                </p>
                <div className="mt-6">
                  <Link
                    to="/invoices"
                    className="btn-primary"
                  >
                    Add Invoice
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Alerts
            </h3>
            <Link
              to="/alerts"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          <div className="card-body">
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.alert_id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <ExclamationTriangleIcon className="flex-shrink-0 h-5 w-5 text-yellow-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.alert_type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {alert.alert_message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All systems are running smoothly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;