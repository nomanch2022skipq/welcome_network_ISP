import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import Pagination from '../components/Pagination';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Person,
  AdminPanelSettings,
  Badge,
} from '@mui/icons-material';

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    user_type: 'employee', // Default to employee
  });
  const [editPassword, setEditPassword] = useState('');

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
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin, pagination.currentPage, pagination.itemsPerPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page_size: 9999 // Fetch all users for inspection
      };
      const response = await userService.getUsers(params);
      
      // Handle paginated response
      if (response.results) {
        setUsers(response.results);
        console.log('User Management - Fetched Users Data (all):', response.results);
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
        setUsers(response);
        console.log('User Management - Fetched Users Data (all) (non-paginated):', response);
        setPagination(prev => ({
          ...prev,
          totalItems: response.length || 0,
          totalPages: Math.ceil((response.length || 0) / prev.itemsPerPage)
        }));
      }
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
      // Reset to first page after adding
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchUsers();
      showSuccess('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      showError('Error creating user');
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
      showSuccess('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Error updating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        fetchUsers();
        showSuccess('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Error deleting user');
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

  const openEditModal = (user) => {
    setSelectedUser({ ...user, user_type: user.is_staff || user.is_superuser ? 'admin' : 'employee' });
    setEditPassword(''); // Clear password field when opening modal
    setShowEditModal(true);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForMenu(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserForMenu(null);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // Use 24-hour format
      });
    } catch (e) {
      console.error("Error parsing date string in UserManagement:", dateString, e);
      return 'Invalid Date';
    }
  };

  const adminUsers = users.filter(user => user.is_staff || user.is_superuser);
  const employeeUsers = users.filter(user => !user.is_staff && !user.is_superuser);

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            }}
          >
            User Management
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Manage system users and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowAddModal(true)}
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          Add User
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' }, // Stack on small screens, row on larger
          gap: 3, // Spacing between cards
          mb: 3,
        }}
      >
        <Card
          sx={{
            flex: 1, // Distribute available space equally
            minWidth: { xs: '100%', sm: 'auto' }, // Ensure full width on extra-small screens
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            p: 3,
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
              <Person />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Total Users
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {pagination.totalItems}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card
          sx={{
            flex: 1, // Distribute available space equally
            minWidth: { xs: '100%', sm: 'auto' }, // Ensure full width on extra-small screens
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            p: 3,
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
              <AdminPanelSettings />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Administrators
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {adminUsers.length}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card
          sx={{
            flex: 1, // Distribute available space equally
            minWidth: { xs: '100%', sm: 'auto' }, // Ensure full width on extra-small screens
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            p: 3,
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
              <Badge />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Employees
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {employeeUsers.length}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Users Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
            User Records
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      {isAdmin() && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.username}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_staff || user.is_superuser ? 'Administrator' : 'Employee'}
                            color={user.is_staff || user.is_superuser ? 'secondary' : 'success'}
                            size="small"
                            icon={user.is_staff || user.is_superuser ? <AdminPanelSettings /> : <Badge />}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(user.date_joined)}
                          </Typography>
                        </TableCell>
                        {isAdmin() && (
                          <TableCell align="right">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, user)}
                              size="small"
                            >
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {users.map((user) => (
                  <Card
                    key={user.id}
                    variant="outlined"
                    sx={{ mb: 2, p: 2 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                      {isAdmin() && (
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, user)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={user.is_staff || user.is_superuser ? 'Administrator' : 'Employee'}
                        color={user.is_staff || user.is_superuser ? 'secondary' : 'success'}
                        size="small"
                        icon={user.is_staff || user.is_superuser ? <AdminPanelSettings /> : <Badge />}
                      />
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Created: {formatDateTime(user.date_joined)}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        hasPrevious={pagination.hasPrevious}
        onPageChange={handlePageChange}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          openEditModal(selectedUserForMenu);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeleteUser(selectedUserForMenu?.id);
          handleMenuClose();
        }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <Box component="form" onSubmit={handleAddUser}>
          <DialogContent>
            <TextField
              fullWidth
              label="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>User Type</InputLabel>
              <Select
                value={newUser.user_type}
                onChange={(e) => setNewUser({ ...newUser, user_type: e.target.value })}
                label="User Type"
                required
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add User</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <Box component="form" onSubmit={handleEditUser}>
          <DialogContent>
            <TextField
              fullWidth
              label="Username"
              value={selectedUser?.username || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={selectedUser?.email || ''}
              onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="New Password (leave blank to keep current)"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              margin="normal"
              helperText="Only fill this if you want to change the password"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>User Type</InputLabel>
              <Select
                value={selectedUser?.user_type || 'employee'}
                onChange={(e) => setSelectedUser({ ...selectedUser, user_type: e.target.value })}
                label="User Type"
                required
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Update User</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 