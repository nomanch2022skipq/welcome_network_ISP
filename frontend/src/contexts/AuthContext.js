import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { userService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      localStorage.setItem('token', data.access);
      localStorage.setItem('refresh', data.refresh);
      
      // After successful login, fetch the current user's details
      const userInfo = await authService.getCurrentUser();
      
      if (userInfo) {
        // Store all relevant user info
        const userData = {
          id: userInfo.id,
          username: userInfo.username,
          email: userInfo.email,
          user_type: userInfo.user_type,
          is_staff: userInfo.is_staff,
          is_superuser: userInfo.is_superuser,
          is_active: userInfo.is_active,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: 'User details not found after login' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => {
    // Admin status now directly reflects backend's is_staff or is_superuser
    return user?.is_staff || user?.is_superuser;
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 