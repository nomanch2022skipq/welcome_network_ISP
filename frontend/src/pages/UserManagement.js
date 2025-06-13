import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    user_type: 'employee', // Default to employee
  });
  const [editPassword, setEditPassword] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null); // State to track which menu is open
  const menuButtonRefs = useRef({}); // Ref to store individual menu button elements
  const menuPosition = useRef({ top: 0, left: 0 }); // To store menu position

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        user_type: newUser.user_type,
        is_staff: newUser.user_type === 'admin',
        is_superuser: newUser.user_type === 'admin',
      };
      await userService.createUser(userData);
      setShowAddModal(false);
      setNewUser({ username: '', email: '', password: '', user_type: 'employee' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    console.log('handleEditUser function triggered');
    try {
      const userData = {
        ...selectedUser,
      };
      if (editPassword) {
        userData.password = editPassword;
      }
      // Ensure user_type, is_staff, is_superuser are correctly mapped
      userData.is_staff = selectedUser.user_type === 'admin';
      userData.is_superuser = selectedUser.user_type === 'admin';
      
      await userService.updateUser(selectedUser.id, userData);
      setShowEditModal(false);
      setSelectedUser(null);
      setEditPassword(''); // Clear password field
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const openEditModal = (user) => {
    setSelectedUser({ ...user, user_type: user.is_staff || user.is_superuser ? 'admin' : 'employee' });
    setEditPassword(''); // Clear password field when opening modal
    setShowEditModal(true);
    setActiveMenuId(null); // Close menu after selecting edit
  };

  const toggleMenu = (userId, buttonElement) => {
    if (activeMenuId === userId) {
      setActiveMenuId(null);
    } else {
      // Calculate position of the button to place the menu
      const rect = buttonElement.getBoundingClientRect();
      menuPosition.current = {
        top: rect.top + window.scrollY + rect.height, // Position below button
        left: rect.right + window.scrollX - 200, // Align right side of menu with right side of button, shifted left for clearance
      };
      setActiveMenuId(userId);
    }
  };

  const activeUsers = users.filter(user => user.is_active).length;
  const inactiveUsers = users.filter(user => !user.is_active).length;

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          Add User
        </button>
      </div>

      {/* User Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Total Users</p>
              <p className="text-3xl font-bold mt-1">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Active Users</p>
              <p className="text-3xl font-bold mt-1">{activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Inactive Users</p>
              <p className="text-3xl font-bold mt-1">{inactiveUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">System Users</h3>
        
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
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_staff || user.is_superuser
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.is_staff || user.is_superuser ? 'Admin' : 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative flex justify-end items-center h-full">
                        <button
                          ref={el => menuButtonRefs.current[user.id] = el} // Assign ref to button
                          type="button"
                          className="flex items-center justify-center p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                          onClick={(e) => toggleMenu(user.id, e.currentTarget)}
                          aria-expanded={activeMenuId === user.id ? 'true' : 'false'}
                          aria-haspopup="true"
                        >
                          <span className="material-icons text-xl">more_vert</span>
                        </button>

                        {activeMenuId === user.id && ReactDOM.createPortal(
                          <div
                            className="menu-dropdown-content origin-top-right absolute rounded-md shadow-lg bg-white border-0 focus:outline-none z-50"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby={`options-menu-${user.id}`}
                            style={{ top: `${menuPosition.current.top}px`, left: `${menuPosition.current.left}px` }}
                          >
                            <div className="py-1">
                              <button
                                onClick={() => openEditModal(user)}
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                                role="menuitem"
                              >
                                <span className="material-icons mr-3 text-lg group-hover:text-indigo-600">edit</span>
                                Update
                              </button>
                            </div>
                            <div className="py-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
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
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <select
                  id="user_type"
                  className="input-field"
                  value={newUser.user_type}
                  onChange={(e) => setNewUser({...newUser, user_type: e.target.value})}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="edit_user_type" className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <select
                  id="edit_user_type"
                  className="input-field"
                  value={selectedUser.user_type}
                  onChange={(e) => setSelectedUser({...selectedUser, user_type: e.target.value})}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    checked={selectedUser.is_active}
                    onChange={(e) => setSelectedUser({...selectedUser, is_active: e.target.checked})}
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 