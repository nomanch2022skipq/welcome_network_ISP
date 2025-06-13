import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, customerService } from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Payments = () => {
  const { user, isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    customer_id: '',
  });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuButtonRefs = useRef({});
  const menuPosition = useRef({ top: 0, left: 0 });

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, [searchTerm, startDate, endDate]);

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
      const params = {};
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (startDate && endDate) {
        params.start_date = startDate.toISOString().split('T')[0];
        params.end_date = endDate.toISOString().split('T')[0];
      }
      
      const data = await paymentService.getPayments(params);
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentService.createPayment(newPayment);
      setShowAddModal(false);
      setNewPayment({ amount: '', description: '', customer_id: '' });
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
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
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentService.deletePayment(paymentId);
        fetchPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
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

  const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage and track all payments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          Add Payment
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by customer name or description..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              className="input-field"
              placeholderText="Select start date"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              className="input-field"
              placeholderText="Select end date"
              minDate={startDate}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStartDate(null);
                setEndDate(null);
              }}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm opacity-75">Total Payments</p>
              <p className="text-2xl font-bold">{payments.length}</p>
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
              <p className="text-sm opacity-75">Total Amount</p>
              <p className="text-2xl font-bold">{totalAmount} Rs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Payment Records</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    Created By
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.customer.name}</div>
                        <div className="text-sm text-gray-500">{payment.customer.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${payment.amount}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{payment.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.created_by ? payment.created_by.username : 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative flex justify-end items-center h-full">
                        <button
                          ref={el => menuButtonRefs.current[payment.id] = el}
                          type="button"
                          className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
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
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                                role="menuitem"
                              >
                                <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                                Update
                              </button>
                            </div>
                            <div className="py-1">
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
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