import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../store/StoreContext.tsx';

export function RequireAuth() {
  const { session } = useStore();
  const location = useLocation();

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
