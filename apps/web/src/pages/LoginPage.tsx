import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.tsx';
import { BrandLockup } from '../components/layout/BrandLockup.tsx';
import { useStore } from '../store/StoreContext.tsx';

export function LoginPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const { signInWithGoogle, session, authStatus, retryStorefront } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = params.get('from') || '/products';

  const onCredential = useCallback(
    (credential: string) => {
      setBusy(true);
      setError(null);
      void signInWithGoogle(credential).then((result) => {
        setBusy(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onFeedback('Signed in.');
        navigate(from, { replace: true });
      });
    },
    [from, navigate, onFeedback, signInWithGoogle],
  );

  const onError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (authStatus === 'ready' && session) {
    return <Navigate to={from} replace />;
  }

  const backToCheckout = from.startsWith('/checkout');

  return (
    <main id="main" className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <BrandLockup size="md" />
        </div>
        <div className="login-copy">
          <p className="product-kicker">Account</p>
          <h1 id="login-title">Welcome to Namou</h1>
          <p className="login-note">
            New here? Continue with Google to create your account.
          </p>
          <p className="login-note">
            Returning? Choose the same Google account to sign in.
          </p>
        </div>
        {backToCheckout ? (
          <p className="notice-box">
            You’ll return to checkout after you continue.
          </p>
        ) : null}
        {authStatus === 'loading' ? (
          <p className="status-panel" role="status">
            Checking your sign-in…
          </p>
        ) : null}
        {authStatus === 'error' ? (
          <div className="status-panel status-panel-error" role="alert">
            <p>We could not confirm an existing sign-in.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={retryStorefront}
            >
              Try again
            </button>
          </div>
        ) : null}
        {authStatus === 'loading' ? null : (
          <GoogleSignInButton onCredential={onCredential} onError={onError} />
        )}
        {busy ? <p role="status">Signing in…</p> : null}
        {error ? (
          <p className="feedback-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="login-alt">
          <Link to="/products">Continue shopping</Link>
        </p>
      </section>
    </main>
  );
}
