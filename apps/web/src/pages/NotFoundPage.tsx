import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main id="main" className="empty-state">
      <h1>Page not found</h1>
      <p className="muted">That address is not part of Firas Cell.</p>
      <Link className="primary-button" to="/products">
        Continue shopping
      </Link>
    </main>
  );
}
