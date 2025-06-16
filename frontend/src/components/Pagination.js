import React from 'react';
import {
  Box,
  Pagination as MUIPagination,
  PaginationItem,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from '@mui/icons-material';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  hasNext, 
  hasPrevious, 
  onPageChange, 
  totalItems,
  itemsPerPage = 4,
  onPageSizeChange,
  pageSizeOptions = [4, 10, 50, 100]
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Debug logging
  console.log('Pagination Debug:', {
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    totalItems,
    itemsPerPage,
    startItem,
    endItem
  });

  // Always show pagination if there are items, even if only one page
  if (totalItems === 0) {
    return null;
  }

  const handlePageChange = (event, page) => {
    onPageChange(page);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 3 },
        py: 2,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        gap: 2,
      }}
    >
      {/* Mobile pagination */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <MUIPagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          size="small"
          showFirstButton
          showLastButton
          renderItem={(item) => (
            <PaginationItem
              {...item}
              slots={{
                previous: KeyboardArrowLeft,
                next: KeyboardArrowRight,
              }}
            />
          )}
        />
      </Box>
      
      {/* Desktop pagination */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 1, sm: 3 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Showing <strong>{startItem}</strong> to{' '}
            <strong>{endItem}</strong> of{' '}
            <strong>{totalItems}</strong> results
          </Typography>
          
          {/* Page Size Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Show:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={itemsPerPage}
                onChange={(e) => onPageSizeChange(e.target.value)}
                sx={{ height: 32 }}
              >
                {pageSizeOptions.map(size => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              per page
            </Typography>
          </Box>
        </Box>
        
        <MUIPagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          showFirstButton
          showLastButton
          renderItem={(item) => (
            <PaginationItem
              {...item}
              slots={{
                previous: KeyboardArrowLeft,
                next: KeyboardArrowRight,
              }}
            />
          )}
        />
      </Box>
    </Box>
  );
};

export default Pagination; 