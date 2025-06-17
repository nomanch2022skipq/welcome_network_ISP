import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { customerService, paymentService } from '../services/api';
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
  useTheme,
  useMediaQuery,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add,
  Search,
  Clear,
  MoreVert,
  Payment,
  Edit,
  Delete,
  People,
  CheckCircle,
  Cancel,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

const CustomerManagement = () => {
  const { user, isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomerForMenu, setSelectedCustomerForMenu] = useState(null);
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
  }, [searchTerm, pagination.currentPage, pagination.itemsPerPage, showInactive]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page_size: 9999, // Fetch all customers for inspection
        is_active: !showInactive,
      };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await customerService.getCustomers(params);
      
      // Handle paginated response
      if (response.results) {
        setCustomers(response.results);
        console.log('Customer Management - Fetched Customers Data (all):', response.results);
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
        console.log('Customer Management - Fetched Customers Data (all) (non-paginated):', response);
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

  const handleDeactivateCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to deactivate this customer?')) {
      try {
        await customerService.deleteCustomer(customerId);
        fetchCustomers();
        showSuccess('Customer deactivated successfully');
      } catch (error) {
        console.error('Error deactivating customer:', error);
        showError('Error deactivating customer');
      }
    }
  };

  const handleReactivateCustomer = async (customer) => {
    try {
      await customerService.updateCustomer(customer.id, { ...customer, is_active: true });
      fetchCustomers();
      showSuccess('Customer reactivated successfully');
    } catch (error) {
      console.error('Error reactivating customer:', error);
      showError('Error reactivating customer');
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
    setAnchorEl(null);
  };

  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setNewPayment({
      amount: customer.package_fee || '',
      description: '',
    });
    setShowPaymentModal(true);
    setAnchorEl(null);
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

  const handleMenuOpen = (event, customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomerForMenu(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomerForMenu(null);
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
            Customer Management
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Manage customer information and payments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowAddModal(true)}
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          Add Customer
        </Button>
      </Box>

      {/* Search and Toggle */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
          />
          <Button
            variant="outlined"
            onClick={() => setSearchTerm('')}
            startIcon={<Clear />}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Clear
          </Button>
          <Button
            variant={showInactive ? 'contained' : 'outlined'}
            onClick={() => setShowInactive(!showInactive)}
            startIcon={showInactive ? <VisibilityOff /> : <Visibility />}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            {showInactive ? 'Show Active' : 'Show Inactive'}
          </Button>
        </Box>
      </Card>

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
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
              <People />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Total Customers
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
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Active Customers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {activeCustomers.length}
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
              <Cancel />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Inactive Customers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {inactiveCustomers.length}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Customers Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
            {showInactive ? 'Inactive Customer Records' : 'Active Customer Records'}
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
                      <TableCell>Customer</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Package Fee</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {customer.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {customer.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{customer.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.phone || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatAmount(customer.package_fee)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={customer.is_active ? 'Active' : 'Inactive'}
                            color={customer.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(customer.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, customer)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Card View */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {customers.map((customer) => (
                  <Card
                    key={customer.id}
                    variant="outlined"
                    sx={{ mb: 2, p: 2 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {customer.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {customer.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {customer.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.phone || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, customer)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatAmount(customer.package_fee)}
                      </Typography>
                      <Chip
                        label={customer.is_active ? 'Active' : 'Inactive'}
                        color={customer.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
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
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              ml: -4,
            },
          },
        }}
      >
        <MenuItem onClick={() => {
          openPaymentModal(selectedCustomerForMenu);
          handleMenuClose();
        }}>
          <Payment sx={{ mr: 1 }} />
          Add Payment
        </MenuItem>
        {isAdmin() && [
          <MenuItem key="edit" onClick={() => {
            openEditModal(selectedCustomerForMenu);
            handleMenuClose();
          }}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>,
          <MenuItem key="delete" onClick={() => {
            handleDeactivateCustomer(selectedCustomerForMenu?.id);
            handleMenuClose();
          }}>
            <Delete sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        ]}
        {selectedCustomerForMenu && !selectedCustomerForMenu.is_active && (
          <MenuItem onClick={() => {
            handleReactivateCustomer(selectedCustomerForMenu);
            handleMenuClose();
          }}>
            <CheckCircle sx={{ mr: 1 }} />
            Reactivate
          </MenuItem>
        )}
      </Menu>

      {/* Add Customer Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <Box component="form" onSubmit={handleAddCustomer}>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={3}
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Package Fee"
              type="number"
              value={newCustomer.package_fee}
              onChange={(e) => setNewCustomer({ ...newCustomer, package_fee: e.target.value })}
              margin="normal"
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Customer</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Customer</DialogTitle>
        <Box component="form" onSubmit={handleEditCustomer}>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={selectedCustomer?.name || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={selectedCustomer?.email || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={selectedCustomer?.phone || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={3}
              value={selectedCustomer?.address || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Package Fee"
              type="number"
              value={selectedCustomer?.package_fee || ''}
              onChange={(e) => setSelectedCustomer({ ...selectedCustomer, package_fee: e.target.value })}
              margin="normal"
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={selectedCustomer?.is_active || false}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, is_active: e.target.checked })
                  }
                  name="is_active"
                />
              }
              label="Active"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Update Customer</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Add Payment Modal */}
      <Dialog open={showPaymentModal} onClose={() => setShowPaymentModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Payment for {selectedCustomer?.name}</DialogTitle>
        <Box component="form" onSubmit={handleAddPayment}>
          <DialogContent>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={newPayment.amount}
              onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newPayment.description}
              onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Payment</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default CustomerManagement; 