import React, { useEffect, useState } from 'react';
import { logService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Pagination from '../components/Pagination';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Person,
  Add,
  Edit,
  Delete,
  Info,
} from '@mui/icons-material';

const Logs = () => {
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    totalItems: 0,
    itemsPerPage: 10
  });

  useEffect(() => {
    if (isAdmin && isAdmin()) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [pagination.currentPage, pagination.itemsPerPage]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.currentPage,
        page_size: pagination.itemsPerPage
      };
      const response = await logService.getLogs(params);
      
      // Handle paginated response
      if (response.results) {
        setLogs(response.results);
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
        setLogs(response);
        setPagination(prev => ({
          ...prev,
          totalItems: response.length || 0,
          totalPages: Math.ceil((response.length || 0) / prev.itemsPerPage)
        }));
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      if (err.response?.data) {
        // Handle validation errors from backend
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          setError(`Validation Error: ${errorMessages}`);
        } else {
          setError(errorData);
        }
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to fetch logs');
      }
    } finally {
      setLoading(false);
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

  const getActionColor = (action) => {
    if (action?.includes('created')) return 'success';
    if (action?.includes('updated')) return 'primary';
    if (action?.includes('deleted')) return 'error';
    return 'default';
  };

  const getActionIcon = (action) => {
    if (action?.includes('created')) return <Add />;
    if (action?.includes('updated')) return <Edit />;
    if (action?.includes('deleted')) return <Delete />;
    return <Info />;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error Date';
    }
  };

  if (!isAdmin || !isAdmin()) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You don't have permission to access this page.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
          }}
        >
          System Logs
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          All actions performed in the system are listed below.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 600, px: 2, pt: 2 }}>
              Activity Logs
            </Typography>
            
            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'block' }, px: 2, pb: 2 }}>
              {logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No logs found.</Typography>
                </Box>
              ) : (
                logs.map((log) => (
                  <Card
                    key={log.id}
                    variant="outlined"
                    sx={{ mb: 1, p: 0 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', flexShrink: 0, width: 24, height: 24, fontSize: '0.75rem' }}>
                          {log.user_username?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Typography variant="caption" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.user_username || 'Unknown User'}
                          {log.description && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 1 }}>
                              {log.description}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 'auto' }}>
                        <Chip
                          label={log.action_display || log.action}
                          color={getActionColor(log.action)}
                          size="small"
                          icon={getActionIcon(log.action)}
                          sx={{ height: 20, fontSize: '0.7rem', pr: 0, marginRight: 2 }}
                        />
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDateTime(log.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                ))
              )}
            </Box>    
          </CardContent>
        </Card>
      )}

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
    </Box>
  );
};

export default Logs; 