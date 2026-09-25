import { createContext } from 'react';

export type UserRole = 'Admin' | 'Technician' | null;

export interface AuthRoleContextType {
  role: UserRole;
  groups: string[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  isTechnician: boolean;
  setRole: (role: UserRole) => void;
  refreshRole: () => Promise<void>;
}

export const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);
