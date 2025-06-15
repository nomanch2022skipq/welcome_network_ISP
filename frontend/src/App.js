import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import CustomerManagement from './pages/CustomerManagement';
import UserManagement from './pages/UserManagement';
import Logs from './pages/Logs';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Admin Protected Route Component
const AdminProtectedRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
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
  
  return children;
};

// Layout Component
const Layout = ({ children }) => {
  const { isSidebarCollapsed } = useSidebar();
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navigation />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        <div className={`px-4 sm:px-6 lg:px-8 pb-6 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'pt-20 lg:pt-6' : 'pt-16 lg:pt-6'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerManagement />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payments" 
          element={
            <ProtectedRoute>
              <Layout>
                <Payments />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/logs" 
          element={
            <AdminProtectedRoute>
              <Layout>
                <Logs />
              </Layout>
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to="/dashboard" />} 
        />
      </Routes>
    </Router>
  );
};

// App Component with Providers
const App = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SidebarProvider>
    </AuthProvider>
  );
};

export default App;
