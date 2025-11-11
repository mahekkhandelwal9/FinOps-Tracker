import React from 'react';

const Logo = ({ className = "" }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-shrink-0">
        <svg
          className="h-8 w-8 text-primary-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-gray-900">FinOps</span>
        <span className="text-xs text-gray-500">Platform</span>
      </div>
    </div>
  );
};

export default Logo;