import { type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useUserRole } from '../../hooks/useUserRole';
import type { UserRole } from '../../contexts/AuthRoleContext';
import styles from '../../styles/UI/RoleUI.module.scss';

interface RoleGuardProps {
  allowedRoles: NonNullable<UserRole>[];
  children: ReactElement;
  redirectTo?: string;
}

export default function RoleGuard({ allowedRoles, children, redirectTo }: RoleGuardProps) {
  const { role, isLoading } = useUserRole();

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

  // If role does not match allowed roles for this route, redirect immediately to their proper dashboard
  if (!role || !allowedRoles.includes(role)) {
    const destination =
      redirectTo ||
      (role === 'Technician' ? '/tech-dashboard' : role === 'Admin' ? '/admin' : '/');

    return <Navigate to={destination} replace />;
  }

  return children;
}
