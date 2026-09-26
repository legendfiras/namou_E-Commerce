import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { getNodeEnv, getSessionSecret } from '../env';

export const SESSION_COOKIE = 'namou_session';
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type SessionPayload = {
  sub: string;
  exp: number;
};

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(sub: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ sub, exp: now + SESSION_TTL_MS } satisfies SessionPayload),
  ).toString('base64url');
  return `${payload}.${sign(payload, getSessionSecret())}`;
}

export function readSessionSub(token: string, now = Date.now()): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || token.split('.').length !== 2) {
    return null;
  }

  const expected = sign(payload, getSessionSecret());
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const candidate = parsed as Partial<SessionPayload>;
    if (typeof candidate.sub !== 'string' || candidate.sub.length === 0) {
      return null;
    }
    if (typeof candidate.exp !== 'number' || candidate.exp <= now) {
      return null;
    }
    return candidate.sub;
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  return getNodeEnv() === 'production';
}

function serializeCookie(value: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (cookieSecure()) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function readSessionCookie(req: Request): string | undefined {
  const header = req.header('cookie');
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) {
      continue;
    }
    return decodeURIComponent(part.slice(separator + 1).trim());
  }

  return undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.append('Set-Cookie', serializeCookie(token, SESSION_TTL_MS / 1000));
}

export function clearSessionCookie(res: Response): void {
  res.append('Set-Cookie', serializeCookie('', 0));
}
