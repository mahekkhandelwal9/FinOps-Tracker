import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

const Breadcrumb = ({ companyName, podName, vendorName }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const getRouteInfo = (pathname, index, allPaths) => {
    const routeMap = {
      'dashboard': { name: 'Dashboard', path: '/dashboard' },
      'companies': { name: 'Companies', path: '/companies' },
      'pods': { name: 'Pods', path: '/pods' },
      'vendors': { name: 'Vendors', path: '/vendors' },
      'invoices': { name: 'Invoices', path: '/invoices' },
      'payments': { name: 'Payments', path: '/payments' },
      'alerts': { name: 'Alerts', path: '/alerts' },
      'profile': { name: 'Profile', path: '/profile' }
    };

    // Handle dynamic routes (like company detail pages)
    if (allPaths[index - 1] === 'companies' && index > 0) {
      // Use provided company name if available, otherwise fall back to the pathname
      const displayName = companyName || pathname;
      return { name: displayName, path: `/${allPaths.slice(0, index + 1).join('/')}`, isDynamic: true };
    }

    if (allPaths[index - 1] === 'pods' && index > 0) {
      const displayName = podName || pathname;
      return { name: displayName, path: `/${allPaths.slice(0, index + 1).join('/')}`, isDynamic: true };
    }

    if (allPaths[index - 1] === 'vendors' && index > 0) {
      const displayName = vendorName || pathname;
      return { name: displayName, path: `/${allPaths.slice(0, index + 1).join('/')}`, isDynamic: true };
    }

    return routeMap[pathname] || { name: pathname, path: `/${pathname}` };
  };

  const generateBreadcrumbs = () => {
    const breadcrumbs = [];

    pathnames.forEach((name, index) => {
      const routeInfo = getRouteInfo(name, index, pathnames);
      const isLast = index === pathnames.length - 1;

      breadcrumbs.push({
        ...routeInfo,
        isLast,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => {
        const isFirst = index === 0;
        const isLast = breadcrumb.isLast;

        return (
          <React.Fragment key={`${breadcrumb.path}-${index}`}>
            {!isFirst && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-1" />
            )}

            {isLast ? (
              <span className="font-medium text-blue-600 underline decoration-2 underline-offset-4">
                {breadcrumb.name}
              </span>
            ) : (
              <Link
                to={breadcrumb.path}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200 font-medium"
              >
                {breadcrumb.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;