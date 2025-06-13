import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, customerService, userService } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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
    monthlyPayments: [],
    recentPayments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [payments, customers, usersData] = await Promise.all([
        paymentService.getPayments(),
        customerService.getCustomers(),
        userService.getUsers(),
      ]);
      
      // Calculate statistics
      const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      const activeCustomers = customers.filter(customer => customer.is_active).length;
      
      const activeUsers = usersData.filter(user => user.is_active).length;
      const inactiveUsers = usersData.filter(user => !user.is_active).length;

      // Group by month for chart
      const monthlyData = payments.reduce((acc, payment) => {
        const month = new Date(payment.date).toLocaleDateString('en-US', { month: 'short' });
        if (!acc[month]) acc[month] = 0;
        acc[month] += parseFloat(payment.amount);
        return acc;
      }, {});

      setStats({
        totalPayments: payments.length,
        totalAmount,
        totalCustomers: customers.length,
        activeCustomers,
        totalUsers: usersData.length,
        activeUsers,
        inactiveUsers,
        monthlyPayments: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
        recentPayments: payments.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: stats.monthlyPayments.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Payments',
        data: stats.monthlyPayments.map(item => item.amount),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Payment Trends',
      },
    },
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

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Total Amount</p>
              <p className="text-3xl font-bold mt-1">{stats.totalAmount} Rs</p>
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

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-4 rounded-full bg-white bg-opacity-20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm opacity-80">Active Customers</p>
              <p className="text-3xl font-bold mt-1">{stats.activeCustomers}</p>
            </div>
          </div>
        </div>
        {/* New User Stats Cards */}
        {isAdmin() && (
          <>
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

            <div className="card bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center space-x-4">
                <div className="p-4 rounded-full bg-white bg-opacity-20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm opacity-80">Active Users</p>
                  <p className="text-3xl font-bold mt-1">{stats.activeUsers}</p>
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
                  <p className="text-3xl font-bold mt-1">{stats.inactiveUsers}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts and Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment Trends</h3>
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Payments</h3>
          <div className="space-y-4">
            {stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100 animate-fade-in-up">
                  <div>
                    <p className="font-semibold text-gray-900">{payment.customer.name}</p>
                    <p className="text-sm text-gray-600">{payment.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{payment.amount} Rs</p>
                    <p className="text-xs text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent payments to display.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 