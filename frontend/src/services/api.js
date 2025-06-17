import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/token/', { username, password });
    return response.data;
  },
  
  refreshToken: async (refresh) => {
    const response = await api.post('/token/refresh/', { refresh });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me/');
    return response.data;
  },
};

// User services
export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users/', { params });
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/users/register/', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}/`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}/`);
    return response.data;
  },

  reactivateUser: async (id) => {
    const response = await api.post(`/users/${id}/reactivate/`);
    return response.data;
  },
};

// Customer services
export const customerService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers/', { params });
    return response.data;
  },
  
  createCustomer: async (customerData) => {
    const response = await api.post('/customers/', customerData);
    return response.data;
  },
  
  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/customers/${id}/`, customerData);
    return response.data;
  },
  
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}/`);
    return response.data;
  },

  reactivateCustomer: async (id) => {
    const response = await api.post(`/customers/${id}/reactivate/`);
    return response.data;
  },
};

// Payment services
export const paymentService = {
  getPayments: async (params = {}) => {
    const response = await api.get('/payments/', { params });
    return response.data;
  },
  
  createPayment: async (paymentData) => {
    const response = await api.post('/payments/', paymentData);
    return response.data;
  },
  
  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}/`, paymentData);
    return response.data;
  },
  
  deletePayment: async (id) => {
    const response = await api.delete(`/payments/${id}/`);
    return response.data;
  },
  
  getPaymentStats: async () => {
    const response = await api.get('/payments/stats/');
    return response.data;
  },
};

export const logService = {
  getLogs: async (params = {}) => {
    const response = await api.get('/logs/', { params });
    return response.data;
  },
};

export default api; 