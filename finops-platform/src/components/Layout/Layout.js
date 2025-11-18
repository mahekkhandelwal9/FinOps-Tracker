import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Logo from '../UI/Logo';
import DemoBanner from '../UI/DemoBanner';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
    { name: 'Pods', href: '/pods', icon: UserGroupIcon },
    { name: 'Vendors', href: '/vendors', icon: ArchiveBoxIcon },
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Alerts', href: '/alerts', icon: BellIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActiveLink = (href) => {
    // Check for exact match or if the current path starts with the href (for detail pages)
    if (location.pathname === href) return true;

    // Special handling for company detail pages
    if (href === '/companies' && location.pathname.startsWith('/companies/') && location.pathname !== '/companies') return true;

    // Special handling for pod detail pages
    if (href === '/pods' && location.pathname.startsWith('/pods/') && location.pathname !== '/pods') return true;

    // Special handling for vendor detail pages
    if (href === '/vendors' && location.pathname.startsWith('/vendors/') && location.pathname !== '/vendors') return true;

    // Special handling for invoice detail pages
    if (href === '/invoices' && location.pathname.startsWith('/invoices/') && location.pathname !== '/invoices') return true;

    // Special handling for payment detail pages
    if (href === '/payments' && location.pathname.startsWith('/payments/') && location.pathname !== '/payments') return true;

    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-gray-600 transition-opacity ${sidebarOpen ? 'opacity-75' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`relative flex w-64 flex-1 flex-col bg-white transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
            <Logo />
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActiveLink(item.href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActiveLink(item.href) ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:bg-white lg:border-r lg:border-gray-200 transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
          {!isSidebarCollapsed && <Logo />}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActiveLink(item.href)
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isSidebarCollapsed ? item.name : undefined}
            >
              <item.icon
                className={`flex-shrink-0 ${
                  isSidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'
                } ${
                  isActiveLink(item.href) ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {!isSidebarCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Top header */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-gray-200">
          <button
            type="button"
            className="lg:hidden px-4 text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-between px-4 lg:px-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {navigation.find(item => isActiveLink(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="ml-4 flex items-center lg:ml-6 space-x-4">
              {/* Notifications */}
              <button
                type="button"
                className="relative p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                    <UserCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="hidden md:block font-medium text-gray-700">
                    {user?.name}
                  </span>
                </button>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;