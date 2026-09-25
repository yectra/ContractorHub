import { useContext } from 'react';
import { AuthRoleContext, type AuthRoleContextType } from '../contexts/AuthRoleContext';

export function useUserRole(): AuthRoleContextType {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within an AuthRoleProvider');
  }
  return context;
}
