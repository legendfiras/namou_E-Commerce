import { setServers } from 'node:dns';
import { isIP } from 'node:net';
import path from 'node:path';
import dotenv from 'dotenv';

let envLoaded = false;

export function loadApiEnv(): void {
  if (envLoaded) {
    return;
  }

  dotenv.config({
    path: path.resolve(__dirname, '../.env'),
  });
  envLoaded = true;
}

export function getNodeEnv(): 'development' | 'production' | 'test' {
  loadApiEnv();
  const raw = process.env.NODE_ENV ?? 'development';

  if (raw !== 'development' && raw !== 'production' && raw !== 'test') {
    throw new Error(
      `Invalid NODE_ENV: "${raw}". Expected development, production, or test.`,
    );
  }

  return raw;
}

export function getPort(): number {
  loadApiEnv();
  const raw = process.env.PORT ?? '4000';
  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT: "${raw}". Expected an integer between 1 and 65535.`,
    );
  }

  return port;
}

export function getMongoUri(): string {
  loadApiEnv();
  const raw = process.env.MONGODB_URI?.trim() ?? '';

  if (!raw) {
    throw new Error('Missing MONGODB_URI. Set it in apps/api/.env.');
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(raw)) {
    throw new Error(
      'Invalid MONGODB_URI. Expected a mongodb:// or mongodb+srv:// connection string.',
    );
  }

  if (raw.includes('YOUR_USERNAME') || raw.includes('YOUR_ENCODED_PASSWORD')) {
    throw new Error(
      'MONGODB_URI still uses placeholders. Replace the username and password in apps/api/.env.',
    );
  }

  return raw;
}

export function getDevDnsServers(): string[] {
  loadApiEnv();
  if (getNodeEnv() !== 'development') {
    return [];
  }

  const raw = process.env.DEV_DNS_SERVERS?.trim() ?? '';
  if (!raw) {
    return [];
  }

  const servers = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (servers.length === 0) {
    return [];
  }

  for (const server of servers) {
    if (isIP(server) === 0) {
      throw new Error(
        `Invalid DEV_DNS_SERVERS entry: "${server}". Expected comma-separated DNS IP addresses.`,
      );
    }
  }

  return servers;
}

export function applyDevDnsServers(): void {
  const servers = getDevDnsServers();
  if (servers.length === 0) {
    return;
  }

  setServers(servers);
}

export function getMongoDbName(): string {
  loadApiEnv();
  const raw = process.env.MONGODB_DB_NAME?.trim() ?? '';

  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new Error(
      'Invalid MONGODB_DB_NAME. Use a non-empty name of letters, numbers, underscore, or hyphen.',
    );
  }

  return raw;
}

export function getGoogleClientId(): string {
  loadApiEnv();
  const raw = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  if (!raw) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID. Set the Google web client ID in apps/api/.env.',
    );
  }
  return raw;
}

export function getSessionSecret(): string {
  loadApiEnv();
  const raw = process.env.SESSION_SECRET?.trim() ?? '';
  if (raw.length < 32) {
    throw new Error(
      'Missing SESSION_SECRET. Set a random string of at least 32 characters in apps/api/.env.',
    );
  }
  return raw;
}
