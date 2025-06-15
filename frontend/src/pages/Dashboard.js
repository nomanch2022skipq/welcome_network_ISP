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
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

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

  // Auto refresh data every 30 seconds
  useAutoRefresh(() => {
    fetchDashboardData();
  }, [timePeriod, selectedUser], 30000);

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
        borderColor: 'rgb(96, 165, 250)',
        backgroundColor: 'rgb(96, 165, 250)',
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
          color: '#e5e7eb',
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
    // Return a default color if username is not provided
    if (!username) {
      return 'bg-gray-100 text-gray-800'; // A neutral color
    }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container-responsive">
      {/* Header */}
      <div className="flex-responsive justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-responsive-3xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-responsive-base text-gray-600 mt-1">Welcome back, {user?.username}!</p>
        </div>
        <div className="text-right">
          <p className="text-responsive-sm text-gray-500">Role: <span className="font-semibold text-primary-700">{isAdmin() ? 'Administrator' : 'Employee'}</span></p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid mb-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-4 sm:p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-3 sm:p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-responsive-sm opacity-80">Total Amount</p>
              <p className="text-responsive-2xl sm:text-3xl font-bold mt-1">{formatLargeNumber(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* New User Stats Cards */}
        {isAdmin() && (
          <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-4 sm:p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-3 sm:p-4 rounded-full bg-white bg-opacity-20">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-responsive-sm opacity-80">Total Users</p>
                <p className="text-responsive-2xl sm:text-3xl font-bold mt-1">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-3 sm:p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-responsive-sm opacity-80">Total Payments</p>
              <p className="text-responsive-2xl sm:text-3xl font-bold mt-1">{stats.totalPayments}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 sm:p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-3 sm:p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-responsive-sm opacity-80">Total Customers</p>
              <p className="text-responsive-2xl sm:text-3xl font-bold mt-1">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Payments */}
      <div className="grid-responsive-2 gap-responsive mb-6">
        <Card className="p-4 sm:p-6 rounded-xl shadow-lg">
          <CardContent className="p-0 sm:p-2">
            <Box display="flex" flexDirection="column" sx={{ gap: 2, mb: 2 }}>
              {/* Title and controls */}
              <Box display="flex" flexDirection="column" sx={{ gap: 1 }}>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Payments
                </Typography>
                
                {/* Time Period buttons - responsive */}
                <Box display="flex" flexWrap="wrap" sx={{ gap: 0.5, mt: 1 }}>
                  <button
                    onClick={() => setTimePeriod('daily')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-responsive-sm font-medium transition-colors touch-target ${
                      timePeriod === 'daily' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTimePeriod('weekly')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-responsive-sm font-medium transition-colors touch-target ${
                      timePeriod === 'weekly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-responsive-sm font-medium transition-colors touch-target ${
                      timePeriod === 'monthly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTimePeriod('yearly')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-responsive-sm font-medium transition-colors touch-target ${
                      timePeriod === 'yearly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Yearly
                  </button>
                </Box>
              </Box>

              {/* User dropdown only for admins */}
              {isAdmin() && (
                <Box display="flex" flexDirection="column" sx={{ gap: 1, mt: 1 }}>
                  <Typography variant="body2" component="label" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    User:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                    <Select
                      id="user-select"
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
            <Box sx={{ height: { xs: 250, sm: 280, md: 320 } }}>
              <Bar data={chartData} options={chartOptions} />
            </Box>
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6 rounded-xl shadow-lg">
          <CardContent className="p-0 sm:p-2">
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Recent Payments
            </Typography>
            <Box sx={{ minHeight: { xs: 250, sm: 280, md: 320 }, maxHeight: { xs: 250, sm: 280, md: 320 }, overflowY: 'auto' }}>
              <div className="space-y-3 sm:space-y-4">
                {stats.recentPayments.length > 0 ? (
                  stats.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in-up gap-2">
                      <div className="flex-1">
                        <Typography variant="subtitle2" sx={{ fontWeight: 'semibold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {payment.customer.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {payment.description || 'No description'}
                        </Typography>
                        {isAdmin() && payment.created_by && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            Submitted by: <span className={`inline-flex items-center px-2 sm:px-4 py-1 rounded-full text-xs font-medium ${getColorForUsername(payment.created_by.username)}`}>
                              {payment.created_by.username}
                            </span>
                          </Typography>
                        )}
                      </div>
                      <div className="text-right sm:text-right">
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {formatAmount(payment.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {new Date(payment.date).toLocaleDateString()}
                        </Typography>
                      </div>
                    </div>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      No recent payments to display.
                    </Typography>
                  </Box>
                )}
              </div>
            </Box>
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6 rounded-xl shadow-lg">
          <CardContent className="p-0 sm:p-2">
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Recent Activities
            </Typography>
            <Box sx={{ minHeight: { xs: 250, sm: 280, md: 320 }, maxHeight: { xs: 250, sm: 280, md: 320 }, overflowY: 'auto' }}>
              <div className="space-y-3 sm:space-y-4">
                {stats.logs.length > 0 ? (
                  stats.logs.map((log) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in-up gap-2">
                      <div className="flex-1">
                        <Typography variant="body2" sx={{ fontWeight: 'semibold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {log.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {new Date(log.created_at).toLocaleString()}
                        </Typography>
                        {log.user_username && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            By: <span className={`inline-flex items-center px-2 sm:px-4 py-1 rounded-full text-xs font-medium ${getColorForUsername(log.user_username)}`}>
                              {log.user_username}
                            </span>
                          </Typography>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      No recent activities to display.
                    </Typography>
                  </Box>
                )}
              </div>
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;