import { createBrowserRouter } from 'react-router-dom';
import Dashboard from './app/Dashboard';
import NotFoundPage from './app/NotFoundPage';
import FieldExecution from './components/admin/FieldExecution';
import TechDashboard from './components/TechDashboard';
import ClientCRMRecord from './components/admin/ClientCRMRecord';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />,
    errorElement: <NotFoundPage />,
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
  }
]);
