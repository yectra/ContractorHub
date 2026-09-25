import { createBrowserRouter } from 'react-router-dom';
import RoleBasedRouter from './components/auth/RoleBasedRouter';
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
    path: '/admin',
    element: <Dashboard />,
  },
  {
    path: '/admin/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/technician',
    element: <FieldExecution />,
  },
  {
    path: '/tech-dashboard',
    element: <TechDashboard />,
  },
  {
    path: '/crm',
    element: <ClientCRMRecord />,
  },
  {
    path: '/admin/users',
    element: <UserManagement />,
  },
  {
    path: '/admin/technicians',
    element: <TechnicianManagement />,
  }
]);
