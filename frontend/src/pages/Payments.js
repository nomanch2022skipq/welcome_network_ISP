import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, customerService, userService } from '../services/api';
import Pagination from '../components/Pagination';
import { useNotification } from '../contexts/NotificationContext';
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
  Search,
  Clear,
  MoreVert,
  Edit,
  Delete,
  Payment,
  TrendingUp,
  CalendarToday,
  Person,
} from '@mui/icons-material';

const Payments = () => {
  const { user, isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPaymentForMenu, setSelectedPaymentForMenu] = useState(null);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    customer_id: '',
  });

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
        params.start_date = startDate;
        params.end_date = endDate;
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
      const response = await customerService.getCustomers({ page_size: 9999 }); // Fetch all customers
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
    console.log('Opening edit modal for payment:', payment);
    setSelectedPayment({
      ...payment,
      customer_id: payment.customer.id, // Extract customer_id from nested customer object
    });
    setShowEditModal(true);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event, payment) => {
    setAnchorEl(event.currentTarget);
    setSelectedPaymentForMenu(payment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPaymentForMenu(null);
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
      console.error("Error parsing date string:", dateString, e);
      return 'Invalid Date';
    }
  };

  const getColorForUsername = (username) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const index = username.length % colors.length;
    return colors[index];
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const todayPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.date);
    const today = new Date();
    return paymentDate.toDateString() === today.toDateString();
  });
  const todayAmount = todayPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  useEffect(() => {
    console.log('Customers list:', customers);
  }, [customers]);

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
            Payment Management
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Track and manage customer payments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowAddModal(true)}
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          Add Payment
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          {isAdmin() && (
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>User</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="User"
                >
                  <MenuItem value="all">All Users</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setSelectedUser('all');
              }}
              startIcon={<Clear />}
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
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
              <Payment />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Total Payments
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
              <TrendingUp />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Total Amount
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatAmount(totalAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card
          sx={{
            flex: 1, // Distribute available space equally
            minWidth: { xs: '100%', sm: 'auto' }, // Ensure full width on extra-small screens
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
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
              <CalendarToday />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Today's Amount
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatAmount(todayAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Payments Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Records
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
                      <TableCell>Amount</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Created By</TableCell>
                      <TableCell>Date</TableCell>
                      {isAdmin() && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {payment.customer?.name.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {payment.customer?.name || 'Unknown Customer'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {payment.customer?.email || 'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {formatAmount(payment.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: getColorForUsername(payment.created_by_username),
                                fontSize: '0.75rem',
                              }}
                            >
                              {payment.created_by_username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2">
                              {payment.created_by_username || 'System'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(payment.date)}
                          </Typography>
                        </TableCell>
                        {isAdmin() && (
                          <TableCell align="right">
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, payment)}
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
                {payments.map((payment) => (
                  <Card
                    key={payment.id}
                    variant="outlined"
                    sx={{ mb: 2, p: 2 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {payment.customer?.name.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {payment.customer?.name || 'Unknown Customer'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {payment.customer?.email || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      {isAdmin() && (
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, payment)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatAmount(payment.amount)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: getColorForUsername(payment.created_by_username),
                            fontSize: '0.625rem',
                          }}
                        >
                          {payment.created_by_username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="caption">
                          {payment.created_by_username || 'System'}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {payment.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(payment.date)}
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
          openEditModal(selectedPaymentForMenu);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          handleDeletePayment(selectedPaymentForMenu?.id);
          handleMenuClose();
        }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Add Payment Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Payment</DialogTitle>
        <Box component="form" onSubmit={handleAddPayment}>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Customer</InputLabel>
              <Select
                value={newPayment.customer_id}
                onChange={(e) => {
                  const selectedCustomerId = e.target.value;
                  const selectedCustomer = customers.find(cust => cust.id === selectedCustomerId);
                  setNewPayment({
                    ...newPayment,
                    customer_id: selectedCustomerId,
                    amount: selectedCustomer ? selectedCustomer.package_fee : '',
                  });
                }}
                label="Customer"
                required
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Payment</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Payment</DialogTitle>
        <Box component="form" onSubmit={handleEditPayment}>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Customer</InputLabel>
              <Select
                value={selectedPayment?.customer_id || ''}
                onChange={(e) => setSelectedPayment({ ...selectedPayment, customer_id: e.target.value })}
                label="Customer"
                required
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={selectedPayment?.amount || ''}
              onChange={(e) => setSelectedPayment({ ...selectedPayment, amount: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={selectedPayment?.description || ''}
              onChange={(e) => setSelectedPayment({ ...selectedPayment, description: e.target.value })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Update Payment</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Payments; 