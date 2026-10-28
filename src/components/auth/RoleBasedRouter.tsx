import { useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { useNavigate, Navigate } from 'react-router-dom';
import { useUserRole } from '../../hooks/useUserRole';
import styles from '../../styles/UI/RoleUI.module.scss';

export default function RoleBasedRouter() {
  const { role, isLoading, error, setRole, refreshRole } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role) {
      if (role === 'Admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'Technician') {
        navigate('/tech-dashboard', { replace: true });
      }
    }
  }, [role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className={styles.roleLoaderContainer}>
        <div className={styles.roleLoaderCard}>
          <CircularProgress className={styles.roleLoaderSpinner} size={48} thickness={4} />
          <h2 className={styles.roleLoaderTitle}>Verifying Permissions</h2>
          <p className={styles.roleLoaderSubtext}>
            Retrieving Cognito User Group claims and preparing your role-based dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Admin / Dispatcher Role View Redirection
  if (role === 'Admin') {
    return <Navigate to="/admin" replace />;
  }

  // Technician Role View Redirection
  if (role === 'Technician') {
    return <Navigate to="/tech-dashboard" replace />;
  }

  // Fallback state if user doesn't have an assigned Cognito group yet
  return (
    <div className={styles.roleNoticeContainer}>
      <div className={styles.roleNoticeCard}>
        <div className={styles.roleNoticeIconWrap}>
          <SecurityIcon fontSize="large" />
        </div>
        <h2 className={styles.roleNoticeTitle}>Role Assignment Required</h2>
        <p className={styles.roleNoticeDescription}>
          {error
            ? `Notice: ${error}`
            : 'Your account does not currently have an assigned Cognito User Group (Admin or Technician). Please select a dashboard to proceed or refresh your session.'}
        </p>
        <div className={styles.roleButtonGroup}>
          <button
            type="button"
            className={styles.rolePrimaryBtn}
            onClick={() => void refreshRole()}
          >
            Refresh Role Session
          </button>
          <button
            type="button"
            className={styles.roleSecondaryBtn}
            onClick={() => {
              setRole('Admin');
              navigate('/admin');
            }}
          >
            Admin View
          </button>
          <button
            type="button"
            className={styles.roleSecondaryBtn}
            onClick={() => {
              setRole('Technician');
              navigate('/tech-dashboard');
            }}
          >
            Technician View
          </button>
        </div>
      </div>
    </div>
  );
}
