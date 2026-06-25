import { createBrowserRouter } from 'react-router-dom';
import HomePage from './app/HomePage';

function NotFoundPage() {
  return (
    <section id="center">
      <div>
        <h1>Page not found</h1>
        <p>The route you requested does not exist.</p>
      </div>
    </section>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <NotFoundPage />,
  },
]);
