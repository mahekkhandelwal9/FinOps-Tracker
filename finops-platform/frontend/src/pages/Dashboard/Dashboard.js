import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Manage Pods',
      description: 'Create and manage your pods',
      icon: UserGroupIcon,
      to: '/pods',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Vendors',
      description: 'Add and configure vendors',
      icon: ArchiveBoxIcon,
      to: '/vendors',
      color: 'bg-purple-500',
    },
    {
      title: 'Manage Invoices',
      description: 'Track and process invoices',
      icon: DocumentTextIcon,
      to: '/invoices',
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Your FinOps platform is ready. Use the quick actions below to get started.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.to}
            className="group relative bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-gray-300"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-md ${action.color} bg-opacity-10`}>
                <action.icon className={`h-6 w-6 text-${action.color.replace('bg-', '').replace('-500', '-500')}`} />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-700">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600 group-hover:text-blue-500">
              <span>Get started</span>
              <PlusIcon className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State Message */}
      <div className="mt-12 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Your dashboard is ready for configuration
          </h2>
          <p className="text-gray-500 mb-6">
            Start by adding pods, vendors, and invoices to build your FinOps workflow.
            Data will appear here as you populate the system.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/pods"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Pod
            </Link>
            <Link
              to="/vendors"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Vendor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;