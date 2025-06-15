
// File: src/Components/Common/ErrorAlert.jsx
import React from 'react';

const ErrorAlert = ({ message, error }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-red-900 border border-red-700 text-red-100 px-6 py-8 rounded-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-100">Error Loading Dashboard</h3>
            <div className="mt-2 text-sm text-red-200">
              <p>{message}</p>
              {error && (
                <details className="mt-3">
                  <summary className="text-red-300 cursor-pointer">See error details</summary>
                  <p className="mt-2 whitespace-pre-wrap bg-red-950 p-3 rounded text-red-200">
                    {error.toString()}
                  </p>
                </details>
              )}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-900 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;