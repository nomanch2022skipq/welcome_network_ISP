import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { paymentService, customerService, userService } from '../services/api';
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
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentWeekStart = getStartOfWeek(now);

      labels = [];
      for (let i = 0; i < 7; i++) {
        labels.push(dayNames[(i + 1) % 7]);
      }

      payments.forEach(p => {
        const pDate = new Date(p.date);
        pDate.setHours(0, 0, 0, 0);

        if (pDate >= currentWeekStart && pDate <= now) {
          const dayIndex = (pDate.getDay() + 6) % 7;
          totalPeriodData[dayNames[(dayIndex + 1) % 7]] = (totalPeriodData[dayNames[(dayIndex + 1) % 7]] || 0) + parseFloat(p.amount);
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
      const [paymentsResponse, customersResponse, usersResponse] = await Promise.all([
        paymentService.getPayments(),
        customerService.getCustomers(),
        userService.getUsers(),
      ]);
      
      const payments = paymentsResponse.results || paymentsResponse;
      const customers = customersResponse.results || customersResponse;
      const usersData = usersResponse.results || usersResponse;
      
      console.log('Fetched Payments:', payments);
      console.log('Fetched Customers:', customers);
      console.log('Fetched Users:', usersData);
      
      // For employees, filter data to only show their own records
      let filteredPayments = payments;
      let filteredCustomers = customers;
      
      if (!isAdmin()) {
        // Employees can only see their own payments and customers
        filteredPayments = payments.filter(p => p.created_by && p.created_by.id === user.id);
        filteredCustomers = customers.filter(c => c.created_by && c.created_by.id === user.id);
      }
      
      const totalAmount = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const activeCustomers = filteredCustomers.filter(customer => customer.is_active).length;
      
      const activeUsers = usersData.filter(user => user.is_active).length;
      const inactiveUsers = usersData.filter(user => !user.is_active).length;

      // Apply user filter if admin and specific user selected
      const chartPayments = (!isAdmin() || selectedUser === 'all') 
        ? filteredPayments 
        : filteredPayments.filter(p => p.customer && p.customer.created_by && p.customer.created_by.id === selectedUser);
      
      console.log('Filtered Payments:', chartPayments);

      const { labels, totalAmounts } = processPaymentDataForChart(chartPayments, timePeriod);
      console.log('Processed Chart Labels:', labels);
      console.log('Processed Total Amounts:', totalAmounts);

      setStats({
        totalPayments: filteredPayments.length,
        totalAmount,
        totalCustomers: filteredCustomers.length,
        activeCustomers,
        totalUsers: usersData.length,
        activeUsers,
        inactiveUsers,
        chartLabels: labels,
        totalAmounts: totalAmounts,
        recentPayments: filteredPayments.slice(0, 10),
        users: usersData, // Populate users for the dropdown
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
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.username}!</p>
        </div>
        <div className="text-right">
          <p className="text-md text-gray-500">Role: <span className="font-semibold text-primary-700">{isAdmin() ? 'Administrator' : 'Employee'}</span></p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Total Amount</p>
              <p className="text-3xl font-bold mt-1">{formatLargeNumber(stats.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* New User Stats Cards */}
        {isAdmin() && (
          <div className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-full bg-white bg-opacity-20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm opacity-80">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Total Payments</p>
              <p className="text-3xl font-bold mt-1">{stats.totalPayments}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Total Customers</p>
              <p className="text-3xl font-bold mt-1">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6 rounded-xl shadow-lg">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              {/* Left Section: Title and Time Period buttons (stacked) */}
              <Box display="flex" flexDirection="column" sx={{ gap: 1 }}>
                {/* Title and subtitle */}
                <Box display="flex" flexDirection="column">
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    Payments
                  </Typography>
                </Box>
                {/* Time Period buttons */}
                <Box display="flex" sx={{ gap: 0.5, mt: 1 }}>
                  <button
                    onClick={() => setTimePeriod('daily')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timePeriod === 'daily' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTimePeriod('weekly')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timePeriod === 'weekly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timePeriod === 'monthly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTimePeriod('yearly')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timePeriod === 'yearly' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Yearly
                  </button>
                </Box>
              </Box>

              {/* Right Section: User dropdown only for admins */}
              {isAdmin() && (
                <Box display="flex" alignItems="center" flexWrap="nowrap" sx={{ gap: 2 }}>
                  <Typography variant="body1" component="label" sx={{ whiteSpace: 'nowrap' }}>
                    User:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
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
            <Box sx={{ height: 320 }}>
              <Bar data={chartData} options={chartOptions} />
            </Box>
          </CardContent>
        </Card>

        <Card className="p-6 rounded-xl shadow-lg">
          <CardContent>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              Recent Payments
            </Typography>
            <Box sx={{ minHeight: 320, maxHeight: 320, overflowY: 'auto' }}>
              <div className="space-y-4">
                {stats.recentPayments.length > 0 ? (
                  stats.recentPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in-up">
                      <div>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'semibold' }}>{payment.customer.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{payment.description || 'No description'}</Typography>
                        {isAdmin() && payment.created_by && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Submitted by: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorForUsername(payment.created_by.username)}`}>
                              {payment.created_by.username}
                            </span>
                          </Typography>
                        )}
                      </div>
                      <div className="text-right">
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.main' }}>{formatAmount(payment.amount)}</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date(payment.date).toLocaleDateString()}</Typography>
                      </div>
                    </div>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography>No recent payments to display.</Typography>
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