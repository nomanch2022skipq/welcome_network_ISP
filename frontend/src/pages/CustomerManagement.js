import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/api';

const CustomerManagement = () => {
  const { user, isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [activeMenuId, setActiveMenuId] = useState(null); // State to track which menu is open
  const menuButtonRefs = useRef({}); // Ref to store individual menu button elements
  const menuPosition = useRef({ top: 0, left: 0 }); // To store menu position

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

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
      const params = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      const data = await customerService.getCustomers(params);
      setCustomers(data);
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
      });
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.updateCustomer(selectedCustomer.id, selectedCustomer);
      setShowEditModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.deleteCustomer(customerId);
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const openEditModal = (customer) => {
    setSelectedCustomer({ ...customer });
    setShowEditModal(true);
    setActiveMenuId(null); // Close menu after selecting edit
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
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage customer information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex items-center space-x-4">
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
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1-283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm opacity-75">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
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
              <p className="text-sm opacity-75">Active Customers</p>
              <p className="text-2xl font-bold">{activeCustomers.length}</p>
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
              <p className="text-sm opacity-75">Inactive Customers</p>
              <p className="text-2xl font-bold">{inactiveCustomers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Customer Records</h3>
        
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
                    Contact Info
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.phone || 'N/A'}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{customer.address || 'No address'}</div>
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
                          ref={el => menuButtonRefs.current[customer.id] = el} // Assign ref to button
                          type="button"
                          className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
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
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                                role="menuitem"
                              >
                                <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                                Update
                              </button>
                            </div>
                            <div className="py-1">
                              <button
                                onClick={() => handleDeleteCustomer(customer.id)}
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Customer</h3>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Customer</h3>
              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={selectedCustomer.name}
                    onChange={(e) => setSelectedCustomer({...selectedCustomer, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={selectedCustomer.email}
                    onChange={(e) => setSelectedCustomer({...selectedCustomer, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    className="input-field"
                    value={selectedCustomer.phone || ''}
                    onChange={(e) => setSelectedCustomer({...selectedCustomer, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={selectedCustomer.address || ''}
                    onChange={(e) => setSelectedCustomer({...selectedCustomer, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      checked={selectedCustomer.is_active}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, is_active: e.target.checked})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
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
                    Update Customer
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