import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { paymentService, customerService, userService, logService } from '../services/api';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Grid,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Payment,
  People,
  AttachMoney,
  TrendingUp,
  Person,
  Activity,
} from '@mui/icons-material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    chartLabels: [],
    totalAmounts: [],
    recentPayments: [],
    users: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [selectedUser, setSelectedUser] = useState('all');

  // Helper to get start of the week (Monday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper to get week number within a year (ISO week date system)
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const processPaymentDataForChart = (payments, period) => {
    const now = new Date();
    let labels = [];
    const totalPeriodData = {};

    if (period === 'daily') {
      const currentWeekStart = getStartOfWeek(now);

      labels = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })); // e.g., Jun 10
      }

      payments.forEach(p => {
        const pDate = new Date(p.date);
        pDate.setHours(0, 0, 0, 0);

        if (pDate >= currentWeekStart && pDate <= now) {
          const label = pDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          totalPeriodData[label] = (totalPeriodData[label] || 0) + parseFloat(p.amount);
        }
      });

    } else if (period === 'weekly') {
      labels = Array.from({ length: 5 }, (_, i) => `Week ${i + 1}`);

      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      payments.forEach(p => {
        const pDate = new Date(p.date);
        if (pDate >= currentMonthStart && pDate <= currentMonthEnd) {
          const weekNum = getWeekNumber(pDate) - getWeekNumber(currentMonthStart) + 1;
          if (weekNum <= 5) {
            totalPeriodData[labels[weekNum - 1]] = (totalPeriodData[labels[weekNum - 1]] || 0) + parseFloat(p.amount);
          }
        }
      });

    } else if (period === 'monthly' || period === 'yearly') {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = now.getFullYear();

      payments.forEach(p => {
        const pDate = new Date(p.date);
        if (pDate.getFullYear() === currentYear) {
          totalPeriodData[labels[pDate.getMonth()]] = (totalPeriodData[labels[pDate.getMonth()]] || 0) + parseFloat(p.amount);
        }
      });
    }

    const totalAmounts = labels.map(label => totalPeriodData[label] || 0);

    return { labels, totalAmounts };
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line
  }, [timePeriod, selectedUser]);

  const fetchDashboardData = async () => {
    try {
      let startDateParam = null;
      let endDateParam = null;
      const now = new Date();

      if (timePeriod === 'daily') {
        const currentWeekStart = getStartOfWeek(now);
        startDateParam = currentWeekStart.toISOString().split('T')[0];
        endDateParam = now.toISOString().split('T')[0];
      } else if (timePeriod === 'weekly') {
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateParam = currentMonthStart.toISOString().split('T')[0];
        endDateParam = now.toISOString().split('T')[0];
      } else if (timePeriod === 'monthly') {
        const currentYearStart = new Date(now.getFullYear(), 0, 1);
        startDateParam = currentYearStart.toISOString().split('T')[0];
        endDateParam = now.toISOString().split('T')[0];
      } else if (timePeriod === 'yearly') {
        const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
        startDateParam = fiveYearsAgo.toISOString().split('T')[0];
        endDateParam = now.toISOString().split('T')[0];
      }

      const paymentParams = {};
      if (startDateParam && endDateParam) {
        paymentParams.start_date = startDateParam;
        paymentParams.end_date = endDateParam;
        paymentParams.page_size = 9999; // Request all data for charting
      }

      const [paymentsResponse, customersResponse, logsResponse] = await Promise.all([
        paymentService.getPayments(paymentParams),
        customerService.getCustomers(),
        logService.getLogs(),
      ]);
      
      // Try to fetch users separately with error handling
      let usersResponse = null;
      try {
        usersResponse = await userService.getUsers();
      } catch (error) {
        console.warn('Could not fetch users (this is normal for employees):', error);
        usersResponse = null;
      }
      
      const payments = paymentsResponse.results || paymentsResponse;
      const customers = customersResponse.results || customersResponse;
      const usersData = usersResponse ? (usersResponse.results || usersResponse) : null;
      const logsData = logsResponse.results || logsResponse;
      
      console.log('Fetched Payments:', payments);
      console.log('Fetched Customers:', customers);
      console.log('Fetched Users:', usersData);
      console.log('Fetched Logs:', logsData);
      
      // Backend now properly filters data based on user role, so no need for client-side filtering
      const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const activeCustomers = customers.filter(customer => customer.is_active).length;
      
      // For user stats, employees might not have access to all users, so handle gracefully
      const activeUsers = usersData ? usersData.filter(user => user.is_active).length : 0;
      const inactiveUsers = usersData ? usersData.filter(user => !user.is_active).length : 0;

      // Apply user filter if admin and specific user selected
      const chartPayments = (!isAdmin() || selectedUser === 'all') 
        ? payments 
        : payments.filter(p => p.customer && p.customer.created_by && p.customer.created_by.id === selectedUser);
      
      console.log('Chart Payments:', chartPayments);

      const { labels, totalAmounts } = processPaymentDataForChart(chartPayments, timePeriod);
      console.log('Processed Chart Labels:', labels);
      console.log('Processed Total Amounts:', totalAmounts);

      setStats({
        totalPayments: payments.length,
        totalAmount,
        totalCustomers: customers.length,
        activeCustomers,
        totalUsers: usersData ? usersData.length : 0,
        activeUsers,
        inactiveUsers,
        chartLabels: labels,
        totalAmounts: totalAmounts,
        recentPayments: payments.slice(0, 10),
        users: usersData || [], // Populate users for the dropdown
        logs: logsData ? logsData.slice(0, 10) : [], // Store top 10 filtered logs
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartTitle = selectedUser !== 'all'
    ? `${stats.users.find(u => u.id === selectedUser)?.username || 'Selected User'} Fees vs Payments`
    : 'Payments';

  const chartData = {
    labels: stats.chartLabels,
    datasets: [
      {
        label: 'Total Payments',
        data: stats.totalAmounts,
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Payment Trends`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatAmount(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1),
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amount (PKR)',
        },
        ticks: {
          callback: function(value) {
            return formatLargeNumber(value);
          },
        },
        grid: {
          borderDash: [5, 5],
          color: theme.palette.divider,
        },
      },
    },
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLargeNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Helper function to get color for username
  const getColorForUsername = (username) => {
    if (!username) {
      return 'default';
    }

    const colors = [
      'primary',
      'secondary',
      'success',
      'warning',
      'error',
      'info',
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

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
            Dashboard
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Welcome back, {user?.username}!
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Role:{' '}
            <Typography
              component="span"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {isAdmin() ? 'Administrator' : 'Employee'}
            </Typography>
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 3, mb: 3 }}>
        <Card
          sx={{
            flex: '1 1 calc(25% - 24px)', // Approx 25% width minus gap
            minWidth: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 24px)' },
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                p: 1,
              }}
            >
              <AttachMoney />
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Total Amount
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mt: 0.5,
                }}
              >
                {formatLargeNumber(stats.totalAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>

        {isAdmin() && (
          <Card
            sx={{
              flex: '1 1 calc(25% - 24px)', // Approx 25% width minus gap
              minWidth: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 24px)' },
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              boxShadow: 3,
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  p: 1,
                }}
              >
                <Person />
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  Total Users
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                    mt: 0.5,
                  }}
                >
                  {stats.totalUsers}
                </Typography>
              </Box>
            </Box>
          </Card>
        )}

        <Card
          sx={{
            flex: '1 1 calc(25% - 24px)', // Approx 25% width minus gap
            minWidth: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 24px)' },
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                p: 1,
              }}
            >
              <Payment />
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Total Payments
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mt: 0.5,
                }}
              >
                {stats.totalPayments}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card
          sx={{
            flex: '1 1 calc(25% - 24px)', // Approx 25% width minus gap
            minWidth: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 24px)' },
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            boxShadow: 3,
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                p: 1,
              }}
            >
              <People />
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{ opacity: 0.8, fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Total Customers
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mt: 0.5,
                }}
              >
                {stats.totalCustomers}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Charts and Recent Payments */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' }, // Stack vertically on small screens, side-by-side on large
        gap: 3,
        mb: 3,
        width: '100%',
      }}>
        <Card sx={{ flex: 1, p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: { xs: 450, sm: 500, md: 550 }, boxSizing: 'border-box', overflow: 'hidden' }}>
            <Box sx={{ height: { xs: 170, sm: 180, md: 190 } }}> {/* Fixed height for controls container */}
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                  mb: 2,
                }}
              >
                Payments
              </Typography>
              
              {/* Time Period buttons */}
              <ButtonGroup
                variant="outlined"
                size="small"
                sx={{ flexWrap: 'wrap', mb: 2 }}
              >
                {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
                  <Button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    variant={timePeriod === period ? 'contained' : 'outlined'}
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {period}
                  </Button>
                ))}
              </ButtonGroup>

              {/* User dropdown only for admins */}
              {isAdmin() && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    component="label"
                    sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, mb: 1, display: 'block' }}
                  >
                    User:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                    <Select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="all">All Users</MenuItem>
                      {stats.totalUsers > 0 && Array.isArray(stats.users) && stats.users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.username}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>

            {/* The Chart itself */}
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
              <Bar data={chartData} options={chartOptions} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: { xs: 450, sm: 500, md: 550 }, boxSizing: 'border-box', overflow: 'hidden' }}>
            <Box sx={{ height: { xs: 170, sm: 180, md: 190 } }}> {/* Fixed height for spacer */}
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '1rem', sm: '1.25rem' },
                }}
              >
                Recent Payments
              </Typography>
            </Box>
            
            <Box
              sx={{
                flexGrow: 1, minHeight: 0,
                overflowY: 'auto',
              }}
            >
              {stats.recentPayments.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.recentPayments.map((payment) => (
                    <Card
                      key={payment.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderColor: 'grey.200',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 1,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {payment.customer.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                          >
                            {payment.description || 'No description'}
                          </Typography>
                          {isAdmin() && payment.created_by && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                              >
                                Submitted by:{' '}
                                <Chip
                                  label={payment.created_by.username}
                                  size="small"
                                  color={getColorForUsername(payment.created_by.username)}
                                  variant="outlined"
                                />
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: 'success.main',
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {formatAmount(payment.amount)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                          >
                            {new Date(payment.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    No recent payments to display.
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Activities Section */}
      <Grid container spacing={3} sx={{ mb: 3, width: '100%' }}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 2 }}>
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: { xs: 450, sm: 500, md: 550 }, boxSizing: 'border-box', overflow: 'hidden' }}>
              <Box sx={{ height: { xs: 170, sm: 180, md: 190 } }}> {/* Fixed height for title container */}
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                  }}
                >
                  Recent Activities
                </Typography>
              </Box>
              <Box
                sx={{
                  flexGrow: 1, minHeight: 0,
                  overflowY: 'auto',
                }}
              >
                {stats.logs.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {stats.logs.map((log) => (
                      <Card
                        key={log.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: 'grey.50',
                          borderColor: 'grey.200',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 1,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                              }}
                            >
                              {log.description}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            >
                              {new Date(log.created_at).toLocaleString()}
                            </Typography>
                            {log.user_username && (
                              <Box sx={{ mt: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  By:{' '}
                                  <Chip
                                    label={log.user_username}
                                    size="small"
                                    color={getColorForUsername(log.user_username)}
                                    variant="outlined"
                                  />
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      No recent activities to display.
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 