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
  const { signInWithGoogle, session } = useStore();
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

  if (session) {
    return <Navigate to={from} replace />;
  }

  return (
    <main id="main" className="login-card">
      <div className="login-brand">
        <BrandLockup size="md" />
      </div>
      <h1>Sign in</h1>
      <p className="muted">
        Sign in with Google to place a demo order. You can browse the shop
        without signing in.
      </p>
      <GoogleSignInButton onCredential={onCredential} onError={onError} />
      {busy ? <p>Signing in…</p> : null}
      {error ? <p className="feedback-error">{error}</p> : null}
      <p>
        <Link to="/products">Continue shopping</Link>
      </p>
    </main>
  );
}
