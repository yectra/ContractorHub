import { createBrowserRouter } from 'react-router-dom';
import ThreePanelPage from './app/ThreePanelPage';
import NotFoundPage from './app/NotFoundPage';
import FieldExecution from './app/FieldExecution';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ThreePanelPage />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/technician',
    element: <FieldExecution />,
  }
]);
