import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { safeReturnPath } from '../../store/pendingAction.ts';
import { useStore } from '../../store/StoreContext.tsx';

export function RequireAuth() {
  const { session, authStatus, retryStorefront } = useStore();
  const location = useLocation();
  const returnTo = safeReturnPath(location.pathname + location.search);

  if (authStatus === 'loading') {
    return (
      <main id="main" className="empty-state">
        <h1>Checking your account</h1>
        <p className="status-panel" role="status">
          Cart, wishlist, checkout, and orders open after sign-in is confirmed.
        </p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main id="main" className="empty-state">
        <h1>We could not confirm your account</h1>
        <p>
          The store could not reach the server, so cart, wishlist, checkout,
          and orders stay closed.
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
        to={`/login?from=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
