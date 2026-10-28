import { createBrowserRouter } from 'react-router-dom';
import RoleBasedRouter from './components/auth/RoleBasedRouter';
import RoleGuard from './components/auth/RoleGuard';
import Dashboard from './app/Dashboard';
import NotFoundPage from './app/NotFoundPage';
import FieldExecution from './components/admin/FieldExecution';
import TechDashboard from './components/TechDashboard';
import ClientCRMRecord from './components/admin/ClientCRMRecord';
import UserManagement from './components/admin/UserManagement';
import TechnicianManagement from './components/TechnicianManagement';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleBasedRouter />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/login',
    element: <RoleBasedRouter />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/admin',
    element: (
      <RoleGuard allowedRoles={['Admin']}>
        <Dashboard />
      </RoleGuard>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <RoleGuard allowedRoles={['Admin']}>
        <Dashboard />
      </RoleGuard>
    ),
  },
  {
    path: '/technician',
    element: (
      <RoleGuard allowedRoles={['Technician', 'Admin']}>
        <FieldExecution />
      </RoleGuard>
    ),
  },
  {
    path: '/tech-dashboard',
    element: (
      <RoleGuard allowedRoles={['Technician', 'Admin']}>
        <TechDashboard />
      </RoleGuard>
    ),
  },
  {
    path: '/crm',
    element: (
      <RoleGuard allowedRoles={['Admin']}>
        <ClientCRMRecord />
      </RoleGuard>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <RoleGuard allowedRoles={['Admin']}>
        <UserManagement />
      </RoleGuard>
    ),
  },
  {
    path: '/admin/technicians',
    element: (
      <RoleGuard allowedRoles={['Admin']}>
        <TechnicianManagement />
      </RoleGuard>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
