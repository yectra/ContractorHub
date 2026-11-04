import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import NotFoundPage from '../../app/NotFoundPage';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  // If this is an actual 404 HTTP/route response, render the standard NotFoundPage
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  // Log runtime errors for diagnostic tracking
  console.error('[RouteErrorBoundary caught runtime error]:', error);

  const errorMessage =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : typeof error === 'string'
      ? error
      : 'An unexpected application error occurred.';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: '#0f172a',
        color: '#f8fafc',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 2,
          p: 4,
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            mb: 2,
          }}
        >
          <PriorityHighIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#f1f5f9' }}>
          Unable to Load View
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
          {errorMessage}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SpeedIcon />}
            onClick={() => navigate('/admin')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Go to Dispatch Board
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: '#cbd5e1',
              borderColor: '#475569',
              '&:hover': { borderColor: '#94a3b8', bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            Reload Page
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default RouteErrorBoundary;
