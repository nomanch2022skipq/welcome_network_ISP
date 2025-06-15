import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { customerService, paymentService } from '../services/api';
import Pagination from '../components/Pagination';

const CustomerManagement = () => {
  const { user, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    package_fee: '',
  });
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
  });
  const [activeMenuId, setActiveMenuId] = useState(null); // State to track which menu is open
  const menuButtonRefs = useRef({}); // Ref to store individual menu button elements
  const menuPosition = useRef({ top: 0, left: 0 }); // To store menu position

  const { showSuccess, showError } = useNotification();

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    totalItems: 0,
    itemsPerPage: 10
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, pagination.currentPage, pagination.itemsPerPage]);

  // Auto refresh data every 30 seconds
  useAutoRefresh(() => {
    fetchCustomers();
  }, [searchTerm, pagination.currentPage, pagination.itemsPerPage], 30000);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside any active menu and not on a menu button
      const clickedOutsideMenu = activeMenuId && !event.target.closest('.menu-dropdown-content');
      const clickedOnDifferentButton = activeMenuId && menuButtonRefs.current[activeMenuId] && !menuButtonRefs.current[activeMenuId].contains(event.target);

      if (clickedOutsideMenu && clickedOnDifferentButton) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        page_size: pagination.itemsPerPage
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await customerService.getCustomers(params);
      
      // Handle paginated response
      if (response.results) {
        setCustomers(response.results);
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
        setCustomers(response);
        setPagination(prev => ({
          ...prev,
          totalItems: response.length || 0,
          totalPages: Math.ceil((response.length || 0) / prev.itemsPerPage)
        }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.createCustomer(newCustomer);
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        package_fee: '',
      });
      // Reset to first page after adding
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchCustomers();
      showSuccess('Customer added successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      showError('Error creating customer');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.updateCustomer(selectedCustomer.id, selectedCustomer);
      setShowEditModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
      showSuccess('Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      showError('Error updating customer');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.deleteCustomer(customerId);
        fetchCustomers();
        showSuccess('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        showError('Error deleting customer');
      }
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

  const openEditModal = (customer) => {
    setSelectedCustomer({ ...customer });
    setShowEditModal(true);
    setActiveMenuId(null); // Close menu after selecting edit
  };

  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setNewPayment({
      amount: customer.package_fee || '',
      description: '',
    });
    setShowPaymentModal(true);
    setActiveMenuId(null); // Close menu after selecting add payment
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        customer_id: selectedCustomer.id,
        amount: newPayment.amount,
        description: newPayment.description,
      };
      await paymentService.createPayment(paymentData);
      setShowPaymentModal(false);
      setNewPayment({ amount: '', description: '' });
      setSelectedCustomer(null);
      fetchCustomers(); // Refresh customers data after adding payment
      showSuccess('Payment added successfully');
    } catch (error) {
      console.error('Error creating payment:', error);
      showError('Error creating payment');
    }
  };

  // Helper function to format currency
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleMenu = (customerId, buttonElement) => {
    if (activeMenuId === customerId) {
      setActiveMenuId(null);
    } else {
      // Calculate position of the button to place the menu
      const rect = buttonElement.getBoundingClientRect();
      menuPosition.current = {
        top: rect.top + window.scrollY + rect.height, // Position below button
        left: rect.right + window.scrollX - 200, // Align right side of menu with right side of button, shifted left for clearance
      };
      setActiveMenuId(customerId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeCustomers = customers.filter(customer => customer.is_active);
  const inactiveCustomers = customers.filter(customer => !customer.is_active);

  return (
    <div className="container-responsive">
      {/* Header */}
      <div className="flex-responsive justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-responsive-3xl font-extrabold text-gray-900">Customer Management</h1>
          <p className="text-responsive-base text-gray-600 mt-1">Manage customer information and payments</p>
        </div>
        <div className="action-buttons">
          <button
            onClick={() => setShowAddModal(true)}
            className="action-button btn-primary"
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex-responsive items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setSearchTerm('')}
            className="btn-secondary touch-target"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid mb-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1-283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-responsive-sm opacity-75">Total Customers</p>
              <p className="text-responsive-2xl font-bold">{pagination.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-responsive-sm opacity-75">Active Customers</p>
              <p className="text-responsive-2xl font-bold">{activeCustomers.length}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-responsive-sm opacity-75">Inactive Customers</p>
              <p className="text-responsive-2xl font-bold">{inactiveCustomers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card mb-6">
        <h3 className="text-responsive-lg font-semibold mb-4">Customer Records</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {customers.map((customer) => (
                <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.phone || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        ref={el => menuButtonRefs.current[customer.id] = el}
                        type="button"
                        className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 touch-target"
                        onClick={(e) => toggleMenu(customer.id, e.currentTarget)}
                        aria-expanded={activeMenuId === customer.id ? 'true' : 'false'}
                        aria-haspopup="true"
                      >
                        <span className="material-icons text-xl">more_vert</span>
                      </button>

                      {activeMenuId === customer.id && ReactDOM.createPortal(
                        <div
                          className="menu-dropdown-content origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white border-0 focus:outline-none z-50 min-w-[140px]"
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby={`options-menu-${customer.id}`}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => openEditModal(customer)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                              role="menuitem"
                            >
                              <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                              Edit
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => openPaymentModal(customer)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                              role="menuitem"
                            >
                              <span className="material-icons mr-3 text-lg group-hover:text-green-600">payment</span>
                              Add Payment
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                              role="menuitem"
                            >
                              <span className="material-icons mr-3 text-lg group-hover:text-red-600">delete</span>
                              Delete
                            </button>
                          </div>
                        </div>,
                        document.getElementById('portal-root')
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Package Fee</span>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {formatAmount(customer.package_fee)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="block">Created:</span>
                        <span className="font-medium">{formatDate(customer.created_at)}</span>
                      </div>
                      <div>
                        <span className="block">By:</span>
                        <span className="font-medium">
                          {customer.created_by ? customer.created_by.username : 'System'}
                        </span>
                      </div>
                    </div>
                    {customer.address && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="block">Address:</span>
                        <span className="font-medium">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block table-responsive">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.phone || 'N/A'}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">{customer.address || 'No address'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatAmount(customer.package_fee)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.created_by ? customer.created_by.username : 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(customer.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="relative flex justify-end items-center h-full">
                          <button
                            ref={el => menuButtonRefs.current[customer.id] = el}
                            type="button"
                            className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 touch-target"
                            onClick={(e) => toggleMenu(customer.id, e.currentTarget)}
                            aria-expanded={activeMenuId === customer.id ? 'true' : 'false'}
                            aria-haspopup="true"
                          >
                            <span className="material-icons text-xl">more_vert</span>
                          </button>

                          {activeMenuId === customer.id && ReactDOM.createPortal(
                            <div
                              className="menu-dropdown-content origin-top-right absolute rounded-md shadow-lg bg-white border-0 focus:outline-none z-50"
                              role="menu"
                              aria-orientation="vertical"
                              aria-labelledby={`options-menu-${customer.id}`}
                              style={{ top: `${menuPosition.current.top}px`, left: `${menuPosition.current.left}px` }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => openEditModal(customer)}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                                  role="menuitem"
                                >
                                  <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                                  Edit
                                </button>
                              </div>
                              <div className="py-1">
                                <button
                                  onClick={() => openPaymentModal(customer)}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                                  role="menuitem"
                                >
                                  <span className="material-icons mr-3 text-lg group-hover:text-green-600">payment</span>
                                  Add Payment
                                </button>
                              </div>
                              <div className="py-1">
                                <button
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                                  role="menuitem"
                                >
                                  <span className="material-icons mr-3 text-lg group-hover:text-red-600">delete</span>
                                  Delete
                                </button>
                              </div>
                            </div>,
                            document.getElementById('portal-root')
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {customers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No customers found</p>
              </div>
            )}
            
            {/* Pagination */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              hasNext={pagination.hasNext}
              hasPrevious={pagination.hasPrevious}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
            />
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="mt-3">
              <h3 className="text-responsive-lg font-medium text-gray-900 mb-4">Add New Customer</h3>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="form-grid">
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      className="input-field touch-target"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      className="input-field touch-target"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      className="input-field touch-target"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Package Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field touch-target"
                      value={newCustomer.package_fee}
                      onChange={(e) => setNewCustomer({...newCustomer, package_fee: e.target.value})}
                    />
                  </div>
                  <div className="form-full-width">
                    <label className="block text-responsive-sm font-medium text-gray-700">Address</label>
                    <textarea
                      className="input-field touch-target"
                      rows="3"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    />
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="action-button btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="action-button btn-primary">
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="mt-3">
              <h3 className="text-responsive-lg font-medium text-gray-900 mb-4">Edit Customer</h3>
              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div className="form-grid">
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      className="input-field touch-target"
                      value={selectedCustomer.name}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      className="input-field touch-target"
                      value={selectedCustomer.email}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      className="input-field touch-target"
                      value={selectedCustomer.phone || ''}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700">Package Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field touch-target"
                      value={selectedCustomer.package_fee || ''}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, package_fee: e.target.value})}
                    />
                  </div>
                  <div className="form-full-width">
                    <label className="block text-responsive-sm font-medium text-gray-700">Address</label>
                    <textarea
                      className="input-field touch-target"
                      rows="3"
                      value={selectedCustomer.address || ''}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, address: e.target.value})}
                    />
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="action-button btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="action-button btn-primary">
                    Update Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="mt-3">
              <h3 className="text-responsive-lg font-medium text-gray-900 mb-4">Add Payment for {selectedCustomer.name}</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-responsive-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input-field touch-target"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-responsive-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input-field touch-target"
                    rows="3"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                  />
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="action-button btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="action-button btn-primary">
                    Add Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement; 