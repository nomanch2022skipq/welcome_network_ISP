import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, customerService, userService } from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Pagination from '../components/Pagination';
import { useNotification } from '../contexts/NotificationContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const Payments = () => {
  const { user, isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [selectedUser, setSelectedUser] = useState('all');
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    customer_id: '',
  });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuButtonRefs = useRef({});
  const menuPosition = useRef({ top: 0, left: 0 });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    totalItems: 0,
    itemsPerPage: 10
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    if (isAdmin()) {
      fetchUsers();
    }
  }, [searchTerm, startDate, endDate, pagination.currentPage, pagination.itemsPerPage, selectedUser]);

  // Auto refresh data every 30 seconds
  useAutoRefresh(() => {
    fetchPayments();
    fetchCustomers();
    if (isAdmin()) {
      fetchUsers();
    }
  }, [searchTerm, startDate, endDate, pagination.currentPage, pagination.itemsPerPage, selectedUser], 30000);

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        page_size: pagination.itemsPerPage
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (startDate && endDate) {
        const yearStart = startDate.getFullYear();
        const monthStart = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const dayStart = startDate.getDate().toString().padStart(2, '0');
        params.start_date = `${yearStart}-${monthStart}-${dayStart}`;

        const yearEnd = endDate.getFullYear();
        const monthEnd = (endDate.getMonth() + 1).toString().padStart(2, '0');
        const dayEnd = endDate.getDate().toString().padStart(2, '0');
        params.end_date = `${yearEnd}-${monthEnd}-${dayEnd}`;
      }

      if (selectedUser && selectedUser !== 'all') {
        params.created_by = selectedUser;
      }

      console.log('Fetching payments with params:', params);
      
      const response = await paymentService.getPayments(params);
      
      // Handle paginated response
      if (response.results) {
        setPayments(response.results);
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
        setPayments(response);
        setPagination(prev => ({
          ...prev,
          totalItems: response.length || 0,
          totalPages: Math.ceil((response.length || 0) / prev.itemsPerPage)
        }));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getCustomers();
      // Handle paginated response
      const customersData = response.results || response;
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userService.getUsers();
      const usersData = response.results || response;
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentService.createPayment(newPayment);
      setShowAddModal(false);
      setNewPayment({ amount: '', description: '', customer_id: '' });
      // Reset to first page after adding
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchPayments();
      showNotification('Payment added successfully', 'success');
    } catch (error) {
      console.error('Error creating payment:', error);
      showNotification('Error creating payment', 'error');
    }
  };

  const handleEditPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentService.updatePayment(selectedPayment.id, {
        amount: selectedPayment.amount,
        description: selectedPayment.description,
        customer_id: selectedPayment.customer_id,
      });
      setShowEditModal(false);
      setSelectedPayment(null);
      fetchPayments();
      showNotification('Payment updated successfully', 'success');
    } catch (error) {
      console.error('Error updating payment:', error);
      showNotification('Error updating payment', 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentService.deletePayment(paymentId);
        fetchPayments();
        showNotification('Payment deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting payment:', error);
        showNotification('Error deleting payment', 'error');
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

  const openEditModal = (payment) => {
    setSelectedPayment({
      ...payment,
      customer_id: payment.customer.id,
    });
    setShowEditModal(true);
    setActiveMenuId(null);
  };

  const toggleMenu = (paymentId, buttonElement) => {
    if (activeMenuId === paymentId) {
      setActiveMenuId(null);
    } else {
      const rect = buttonElement.getBoundingClientRect();
      menuPosition.current = {
        top: rect.top + window.scrollY + rect.height,
        left: rect.right + window.scrollX - 200,
      };
      setActiveMenuId(paymentId);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper function to get a consistent color for each username
  const getColorForUsername = (username) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
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

  // Get selected customer's package fee
  const selectedCustomer = Array.isArray(customers) ? customers.find(customer => customer.id == newPayment.customer_id) : null;

  const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  return (
    <div className="container-responsive">
      {/* Header */}
      <div className="flex-responsive justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-responsive-3xl font-extrabold text-gray-900">Payments</h1>
          <p className="text-responsive-base text-gray-600 mt-1">Manage and track all payments</p>
        </div>
        <div className="action-buttons">
          <button
            onClick={() => setShowAddModal(true)}
            className="action-button btn-primary"
          >
            Add Payment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-responsive-lg font-semibold mb-4">Filters</h3>
        <div className="grid-responsive-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by customer name or description..."
              className="input-field touch-target"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              className="input-field w-full touch-target"
              placeholderText="Select date range"
              isClearable={false}
              dateFormat="dd/MM/yyyy"
              showYearDropdown={true}
              scrollableYearDropdown={true}
              yearDropdownItemNumber={15}
            />
          </div>

          {isAdmin() && (
            <div>
              <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                Created By
              </label>
              <select
                className="input-field touch-target"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="all">All Users</option>
                {users.map((userOption) => (
                  <option key={userOption.id} value={userOption.id}>
                    {userOption.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setDateRange([null, null]);
                setSelectedUser('all');
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="btn-secondary w-full touch-target"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid mb-6">
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-responsive-sm opacity-75">Total Payments</p>
              <p className="text-responsive-2xl font-bold">{pagination.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-success-500 to-success-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-responsive-sm opacity-75">Total Amount</p>
              <p className="text-responsive-2xl font-bold">{totalAmount} Rs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card mb-6">
        <h3 className="text-responsive-lg font-semibold mb-4">Payment Records</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {payment.customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.customer.email}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        ref={el => menuButtonRefs.current[payment.id] = el}
                        type="button"
                        className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 touch-target"
                        onClick={(e) => toggleMenu(payment.id, e.currentTarget)}
                        aria-expanded={activeMenuId === payment.id ? 'true' : 'false'}
                        aria-haspopup="true"
                      >
                        <span className="material-icons text-xl">more_vert</span>
                      </button>

                      {activeMenuId === payment.id && ReactDOM.createPortal(
                        <div
                          className="menu-dropdown-content origin-top-right absolute right-0 mt-2 rounded-md shadow-lg bg-white border-0 focus:outline-none z-50 min-w-[120px]"
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby={`options-menu-${payment.id}`}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => openEditModal(payment)}
                              className="group flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                              role="menuitem"
                            >
                              <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                              Update
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
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
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Amount</span>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {formatAmount(payment.amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Date</span>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {formatDate(payment.date)}
                      </div>
                    </div>
                  </div>
                  
                  {payment.description && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Description</span>
                      <div className="mt-1 text-sm text-gray-900">
                        {payment.description}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div>
                        <span className="block">Created by:</span>
                        <span className="font-medium">
                          {payment.created_by ? payment.created_by.username : 'System'}
                        </span>
                      </div>
                      {payment.created_by && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getColorForUsername(payment.created_by.username)}`}>
                          {payment.created_by.username}
                        </span>
                      )}
                    </div>
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
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {payment.customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payment.customer.name}</div>
                            <div className="text-sm text-gray-500">{payment.customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatAmount(payment.amount)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{payment.description || 'No description'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.created_by ? (
                          <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium ${getColorForUsername(payment.created_by.username)}`}>
                            {payment.created_by.username}
                          </span>
                        ) : (
                          <span className="text-gray-500">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="relative flex justify-end items-center h-full">
                          <button
                            ref={el => menuButtonRefs.current[payment.id] = el}
                            type="button"
                            className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 touch-target"
                            onClick={(e) => toggleMenu(payment.id, e.currentTarget)}
                            aria-expanded={activeMenuId === payment.id ? 'true' : 'false'}
                            aria-haspopup="true"
                          >
                            <span className="material-icons text-xl">more_vert</span>
                          </button>

                          {activeMenuId === payment.id && ReactDOM.createPortal(
                            <div
                              className="menu-dropdown-content origin-top-right absolute rounded-md shadow-lg bg-white border-0 focus:outline-none z-50"
                              role="menu"
                              aria-orientation="vertical"
                              aria-labelledby={`options-menu-${payment.id}`}
                              style={{ top: `${menuPosition.current.top}px`, left: `${menuPosition.current.left}px` }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => openEditModal(payment)}
                                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left touch-target"
                                  role="menuitem"
                                >
                                  <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                                  Update
                                </button>
                              </div>
                              <div className="py-1">
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
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
            
            {payments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No payments found</p>
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

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    required
                    className="input-field"
                    value={newPayment.customer_id}
                    onChange={(e) => setNewPayment({...newPayment, customer_id: e.target.value})}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Package Fee:</span> {formatAmount(selectedCustomer.package_fee)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input-field"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Payment</h3>
              <form onSubmit={handleEditPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    required
                    className="input-field"
                    value={selectedPayment.customer_id}
                    onChange={(e) => setSelectedPayment({...selectedPayment, customer_id: e.target.value})}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input-field"
                    value={selectedPayment.amount}
                    onChange={(e) => setSelectedPayment({...selectedPayment, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={selectedPayment.description}
                    onChange={(e) => setSelectedPayment({...selectedPayment, description: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
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

export default Payments; 