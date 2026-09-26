import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard';
      theme?: 'outline';
      size?: 'large';
      text?: 'signin_with';
      width?: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    );
    const finish = () => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      reject(new Error('Google sign-in failed to load.'));
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Google sign-in failed to load.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => finish();
    script.onerror = () => reject(new Error('Google sign-in failed to load.'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const [status, setStatus] = useState<'ready' | 'error'>(
    clientId ? 'ready' : 'error',
  );

  useEffect(() => {
    if (!clientId || !hostRef.current) {
      return;
    }

    let cancelled = false;
    const host = hostRef.current;

    void loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !window.google?.accounts.id) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => {
            if (!response.credential) {
              onError('Google did not return a sign-in token.');
              return;
            }
            onCredential(response.credential);
          },
        });
        host.replaceChildren();
        window.google.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
          onError('Google sign-in failed to load.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return (
      <p className="feedback-error">
        Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and
        GOOGLE_CLIENT_ID to the same web client ID.
      </p>
    );
  }

  if (status === 'error') {
    return null;
  }

  return <div ref={hostRef} />;
}
