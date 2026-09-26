import type { Request } from 'express';
import { readSessionCookie, readSessionSub } from './session';
import { User, type UserDocument } from '../models/user';

export async function readCurrentUser(
  req: Request,
): Promise<UserDocument | null> {
  const token = readSessionCookie(req);
  const sub = token ? readSessionSub(token) : null;
  if (!sub) {
    return null;
  }

  return User.findOne({ googleSub: sub });
}
