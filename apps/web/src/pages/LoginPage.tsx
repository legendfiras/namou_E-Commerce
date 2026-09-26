import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.tsx';
import { BrandLockup } from '../components/layout/BrandLockup.tsx';
import {
  clearPendingAction,
  peekPendingAction,
  safeReturnPath,
} from '../store/pendingAction.ts';
import { useStore } from '../store/StoreContext.tsx';

export function LoginPage({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const {
    signInWithGoogle,
    fulfillPendingAction,
    session,
    authStatus,
    stockStatus,
    retryStorefront,
  } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finished = useRef(false);
  const from = safeReturnPath(params.get('from'));
  const pending = peekPendingAction();

  useEffect(() => {
    if (authStatus !== 'ready' || !session || finished.current) {
      return;
    }
    const waitingOnStock =
      peekPendingAction()?.type === 'add-to-cart' && stockStatus === 'loading';
    if (waitingOnStock) {
      return;
    }
    finished.current = true;
    const email = session.email;
    void fulfillPendingAction(email).then((message) => {
      if (message) {
        onFeedback(message);
      } else {
        onFeedback('Signed in.');
      }
      navigate(from, { replace: true });
    });
  }, [
    authStatus,
    from,
    fulfillPendingAction,
    navigate,
    onFeedback,
    session,
    stockStatus,
  ]);

  const onCredential = useCallback(
    (credential: string) => {
      setBusy(true);
      setError(null);
      void signInWithGoogle(credential).then((result) => {
        setBusy(false);
        if (!result.ok) {
          setError(result.message);
        }
      });
    },
    [signInWithGoogle],
  );

  const onError = useCallback((message: string) => {
    setError(message);
  }, []);

  const cancel = () => {
    clearPendingAction();
  };

  if (authStatus === 'loading' || (authStatus === 'ready' && session)) {
    return (
      <main id="main" className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <h1 id="login-title">Welcome to Namou</h1>
          <p className="status-panel" role="status">
            {session ? 'Finishing sign-in…' : 'Checking your sign-in…'}
          </p>
        </section>
      </main>
    );
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
        {pending?.type === 'add-to-cart' ? (
          <p className="notice-box">
            After you continue, {pending.productName} in {pending.color} is
            added to your cart and you return to the page you were on.
          </p>
        ) : null}
        {pending?.type === 'add-to-wishlist' ? (
          <p className="notice-box">
            After you continue, {pending.productName} is saved to your wishlist
            and you return to the page you were on.
          </p>
        ) : null}
        {backToCheckout ? (
          <p className="notice-box">
            You’ll return to checkout after you continue.
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
        <GoogleSignInButton onCredential={onCredential} onError={onError} />
        {busy ? <p role="status">Signing in…</p> : null}
        {error ? (
          <p className="feedback-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="login-alt">
          <Link to="/products" onClick={cancel}>
            Continue shopping
          </Link>
        </p>
      </section>
    </main>
  );
}
