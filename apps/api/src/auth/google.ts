import { OAuth2Client } from 'google-auth-library';
import { getGoogleClientId } from '../env';

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
};

let client: OAuth2Client | undefined;

function googleClient(): OAuth2Client {
  const clientId = getGoogleClientId();
  client ??= new OAuth2Client(clientId);
  return client;
}

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity> {
  const clientId = getGoogleClientId();
  const ticket = await googleClient().verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw new Error('Google token is missing a subject.');
  }
  if (!payload.email || payload.email_verified !== true) {
    throw new Error('Google account email is not verified.');
  }

  const name = payload.name?.trim() || payload.email;
  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name,
  };
}
