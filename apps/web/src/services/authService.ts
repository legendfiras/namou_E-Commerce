import type { Session } from '../types/store.ts';

type AuthUserResponse = {
  user?: Session;
  error?: string;
};

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const session = value as Record<string, unknown>;
  return (
    typeof session.email === 'string' &&
    session.email.length > 0 &&
    typeof session.name === 'string' &&
    session.name.length > 0
  );
}

export async function signInWithGoogle(
  credential: string,
): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    return { ok: false, message: 'Google sign-in was rejected.' };
  }

  const body = (await response.json()) as AuthUserResponse;
  if (!isSession(body.user)) {
    return { ok: false, message: 'Google sign-in was rejected.' };
  }

  return { ok: true, session: body.user };
}

export async function fetchCurrentUser(): Promise<Session | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Session check failed (${response.status})`);
  }

  const body = (await response.json()) as AuthUserResponse;
  return isSession(body.user) ? body.user : null;
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout failed (${response.status})`);
  }
}
