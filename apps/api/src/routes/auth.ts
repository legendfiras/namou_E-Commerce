import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import { verifyGoogleIdToken } from '../auth/google';
import {
  clearSessionCookie,
  createSessionToken,
  readSessionCookie,
  readSessionSub,
  setSessionCookie,
} from '../auth/session';
import { sanitizePublicError } from '../db';
import { toPublicUser, User } from '../models/user';

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createAuthRouter(): Router {
  const router = createRouter();

  router.post(
    '/google',
    asyncRoute(async (req, res) => {
      const credential =
        req.body && typeof req.body === 'object'
          ? (req.body as { credential?: unknown }).credential
          : undefined;
      if (typeof credential !== 'string' || credential.trim().length === 0) {
        res.status(400).json({ error: 'Missing Google credential.' });
        return;
      }

      try {
        const identity = await verifyGoogleIdToken(credential);
        const existing = await User.findOne({ googleSub: identity.sub });
        const user = existing
          ? await User.findOneAndUpdate(
              { googleSub: identity.sub },
              { $set: { email: identity.email, name: identity.name } },
              { new: true },
            )
          : await User.create({
              googleSub: identity.sub,
              email: identity.email,
              name: identity.name,
            });

        if (!user) {
          res.status(503).json({ error: 'Service Unavailable' });
          return;
        }

        setSessionCookie(res, createSessionToken(identity.sub));
        res.status(200).json({ user: toPublicUser(user) });
      } catch (error) {
        console.error(sanitizePublicError(error));
        const message = error instanceof Error ? error.message : '';
        if (message.startsWith('Missing ')) {
          res.status(503).json({ error: 'Service Unavailable' });
          return;
        }
        res.status(401).json({ error: 'Unauthorized' });
      }
    }),
  );

  router.get(
    '/me',
    asyncRoute(async (req, res) => {
      try {
        const token = readSessionCookie(req);
        const sub = token ? readSessionSub(token) : null;
        if (!sub) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const user = await User.findOne({ googleSub: sub });
        if (!user) {
          clearSessionCookie(res);
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        res.status(200).json({ user: toPublicUser(user) });
      } catch (error) {
        console.error(sanitizePublicError(error));
        res.status(503).json({ error: 'Service Unavailable' });
      }
    }),
  );

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  });

  return router;
}
