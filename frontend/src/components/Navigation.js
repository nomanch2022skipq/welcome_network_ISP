import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';

const Navigation = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isSidebarCollapsed, toggleSidebar, hasShownShortcutTip, dismissShortcutTip } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + B to toggle sidebar (desktop only)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b' && window.innerWidth >= 1024) {
        event.preventDefault();
        toggleSidebar();
      }
      // Escape to close mobile menu
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, toggleSidebar]);

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      description: 'Overview and analytics'
    },
    { 
      path: '/customers', 
      label: 'Customers', 
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      description: 'Manage customer information'
    },
    { 
      path: '/payments', 
      label: 'Payments', 
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      description: 'Track and manage payments'
    },
  ];

  // Add User Management and Logs for admins
  if (isAdmin && isAdmin()) {
    navItems.push({
      path: '/users',
      label: 'User Management',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      description: 'Manage system users'
    });
    navItems.push({
      path: '/logs',
      label: 'Logs',
      icon: 'M9 17v-2a4 4 0 014-4h6m-6 4v2m0-2a4 4 0 00-4-4H5m4 4v2m0-2a4 4 0 014-4h6m-6 4v2',
      description: 'View system activity logs'
    });
  }

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="flex items-center">
          <h1 className={`text-xl font-bold text-white ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Welcome Network</h1>
        </div>
        
        {/* Desktop collapse/expand button in header */}
        <button
          onClick={() => toggleSidebar()}
          className="hidden lg:flex items-center justify-center w-8 h-8 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? "M13 5l7 7-7 7M6 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
        </button>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium leading-none">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={`ml-3 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
            <p className="text-xs text-gray-500">{isAdmin ? 'Administrator' : 'Employee'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center rounded-lg transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-primary-100 text-primary-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            } ${
              isSidebarCollapsed 
                ? 'w-full h-12 flex items-center justify-center p-0' // Ensure no padding, fixed height, flex centering
                : 'px-4 py-3' // Apply padding here for expanded state
            }`}
            title={isSidebarCollapsed ? item.label : undefined}
          >
            {isSidebarCollapsed ? (
              <div className="w-full h-full flex items-center justify-center">
                <svg className={`flex-shrink-0 ${item.path === '/payments' ? 'w-10 h-10' : 'w-7 h-7'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            )}
            <span className={`ml-3 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
              {item.label}
            </span>
            {isSidebarCollapsed && (
              <div className="sidebar-tooltip group-hover:opacity-100">
                {item.label}
                <div className="text-gray-400 text-xs mt-1">{item.description}</div>
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-all duration-200 ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
          title={isSidebarCollapsed ? 'Logout' : undefined}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className={`ml-3 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            Logout
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Keyboard shortcut tip */}
      {hasShownShortcutTip && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium">💡 Pro Tip</p>
              <p className="text-xs mt-1">Use <kbd className="px-1 py-0.5 bg-blue-700 rounded text-xs">Ctrl+B</kbd> to toggle the sidebar!</p>
            </div>
            <button
              onClick={dismissShortcutTip}
              className="ml-2 text-blue-200 hover:text-white"
              aria-label="Dismiss tip"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-button p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar toggle button (visible when collapsed) */}
      {isSidebarCollapsed && (
        <div className="hidden lg:block fixed top-4 left-4 z-50">
          <button
            onClick={toggleSidebar}
            className="mobile-menu-button p-2 rounded-md bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 shadow-lg border border-gray-200"
            aria-label="Expand sidebar"
            title="Expand sidebar (Ctrl+B)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg flex flex-col h-full sidebar-transition
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'sidebar-width-collapsed' : 'sidebar-width-expanded'}
      `}>
        <SidebarContent />
      </div>

      {/* Mobile menu */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-50 sidebar-width-expanded bg-white shadow-lg flex flex-col h-full sidebar-transition
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </div>
    </>
  );
};

export default Navigation; 