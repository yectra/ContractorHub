import { createBrowserRouter } from 'react-router-dom';
import ThreePanelPage from './app/ThreePanelPage';
import NotFoundPage from './app/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ThreePanelPage />,
    errorElement: <NotFoundPage />,
  }
]);
