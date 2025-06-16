import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  People,
  Payment,
  ManageAccounts,
  Assessment,
  Logout,
  Menu,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';

const Navigation = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isSidebarCollapsed, toggleSidebar, hasShownShortcutTip, dismissShortcutTip } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

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
      icon: <Dashboard />,
      description: 'Overview and analytics'
    },
    { 
      path: '/customers', 
      label: 'Customers', 
      icon: <People />,
      description: 'Manage customer information'
    },
    { 
      path: '/payments', 
      label: 'Payments', 
      icon: <Payment />,
      description: 'Track and manage payments'
    },
  ];

  // Add User Management and Logs for admins
  if (isAdmin && isAdmin()) {
    navItems.push({
      path: '/users',
      label: 'User Management',
      icon: <ManageAccounts />,
      description: 'Manage system users'
    });
    navItems.push({
      path: '/logs',
      label: 'Logs',
      icon: <Assessment />,
      description: 'View system activity logs'
    });
  }

  const drawerWidth = isSidebarCollapsed ? 64 : 256;

  const SidebarContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column'}}>
      {/* Logo/Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          px: 2,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: 'white',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            display: isSidebarCollapsed ? 'none' : 'block',
          }}
        >
          Welcome Network
        </Typography>
        
        {/* Desktop collapse/expand button in header */}
        <Tooltip
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          placement="right"
        >
          <IconButton
            onClick={toggleSidebar}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              display: { xs: 'none', lg: 'flex' },
            }}
          >
            {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* User Info */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box
            sx={{
              ml: isSidebarCollapsed ? 0 : 2,
              display: isSidebarCollapsed ? 'none' : 'block',
            }}
          >
            <Typography variant="body2" fontWeight={500} noWrap>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isAdmin ? 'Administrator' : 'Employee'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Links */}
      <List sx={{ flex: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <Tooltip
              title={isSidebarCollapsed ? `${item.label} - ${item.description}` : ''}
              placement="right"
            >
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: isSidebarCollapsed ? 'center' : 'initial',
                  px: isSidebarCollapsed ? 1 : 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.50',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.100',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isSidebarCollapsed ? 0 : 40,
                    color: location.pathname === item.path ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    display: isSidebarCollapsed ? 'none' : 'block',
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Logout Button */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Tooltip
          title={isSidebarCollapsed ? 'Logout' : ''}
          placement="right"
        >
          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 48,
              justifyContent: isSidebarCollapsed ? 'center' : 'initial',
              px: isSidebarCollapsed ? 1 : 2,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isSidebarCollapsed ? 0 : 40,
                color: 'inherit',
              }}
            >
              <Logout />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              sx={{
                display: isSidebarCollapsed ? 'none' : 'block',
              }}
            />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: theme.zIndex.drawer + 1,
          display: { xs: 'block', lg: 'none' },
        }}
      >
        <IconButton
          onClick={() => setIsMobileMenuOpen(true)}
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <Menu />
        </IconButton>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRadius: 0,
          },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRadius: 0,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </>
  );
};

export default Navigation; 