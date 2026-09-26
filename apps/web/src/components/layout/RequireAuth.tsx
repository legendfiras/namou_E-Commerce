import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../store/StoreContext.tsx';

export function RequireAuth() {
  const { session, authStatus, retryStorefront } = useStore();
  const location = useLocation();

  if (authStatus === 'loading') {
    return (
      <main id="main" className="empty-state">
        <h1>Checking your account</h1>
        <p className="status-panel" role="status">
          Checkout stays locked until sign-in is confirmed.
        </p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main id="main" className="empty-state">
        <h1>We could not confirm your account</h1>
        <p>
          The store could not reach the server, so checkout and orders stay
          locked. Your saved cart was not opened.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={retryStorefront}
        >
          Try again
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <Navigate
        to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
