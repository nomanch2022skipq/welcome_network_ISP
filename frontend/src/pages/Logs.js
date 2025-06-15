import React, { useEffect, useState } from 'react';
import { logService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import Pagination from '../components/Pagination';

const Logs = () => {
  const { isAdmin } = useAuth();
  const { showSuccess } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    totalItems: 0,
    itemsPerPage: 10
  });

  useEffect(() => {
    if (isAdmin && isAdmin()) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [pagination.currentPage, pagination.itemsPerPage]);

  // Auto refresh data every 30 seconds
  useAutoRefresh(() => {
    if (isAdmin && isAdmin()) {
      fetchLogs();
    }
  }, [isAdmin, pagination.currentPage, pagination.itemsPerPage], 30000);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.currentPage,
        page_size: pagination.itemsPerPage
      };
      const response = await logService.getLogs(params);
      
      // Handle paginated response
      if (response.results) {
        setLogs(response.results);
        setPagination(prev => ({
          ...prev,
          currentPage: response.current_page || 1,
          totalPages: response.total_pages || 1,
          hasNext: response.has_next || false,
          hasPrevious: response.has_previous || false,
          totalItems: response.count || 0,
          itemsPerPage: response.page_size || prev.itemsPerPage
        }));
      } else {
        // Fallback for non-paginated response
        setLogs(response);
        setPagination(prev => ({
          ...prev,
          totalItems: response.length || 0,
          totalPages: Math.ceil((response.length || 0) / prev.itemsPerPage)
        }));
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      if (err.response?.data) {
        // Handle validation errors from backend
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          setError(`Validation Error: ${errorMessages}`);
        } else {
          setError(errorData);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to fetch logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ 
      ...prev, 
      itemsPerPage: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    }));
  };

  if (!isAdmin || !isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-responsive-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-responsive-base text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive">
      <div className="mb-6">
        <div className="flex-responsive justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-responsive-3xl font-extrabold text-gray-900">System Logs</h1>
            <p className="text-responsive-base text-gray-600 mt-1">All actions performed in the system are listed below.</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-responsive-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-responsive-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-responsive-lg font-semibold mb-4">Activity Logs</h3>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No logs found.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {log.user_username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.user_username || 'Unknown User'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.action?.includes('created') ? 'bg-green-100 text-green-800' :
                        log.action?.includes('updated') ? 'bg-blue-100 text-blue-800' :
                        log.action?.includes('deleted') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action_display || log.action}
                      </span>
                    </div>
                  </div>
                  
                  {log.description && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Description</span>
                      <div className="mt-1 text-sm text-gray-900">
                        {log.description}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div>
                        <span className="block">Date:</span>
                        <span className="font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block">Time:</span>
                        <span className="font-medium">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block table-responsive">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">No logs found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {log.user_username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{log.user_username || 'Unknown User'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.action?.includes('created') ? 'bg-green-100 text-green-800' :
                          log.action?.includes('updated') ? 'bg-blue-100 text-blue-800' :
                          log.action?.includes('deleted') ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action_display || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate" title={log.description}>
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            hasNext={pagination.hasNext}
            hasPrevious={pagination.hasPrevious}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default Logs; 