import mongoose from 'mongoose';
import { getMongoDbName, getMongoUri } from './env';

const CONNECT_TIMEOUT_MS = 8000;

const SECRET_ENV_KEYS = [
  'MONGODB_URI',
  'R2_SECRET_ACCESS_KEY',
  'R2_ACCESS_KEY_ID',
  'R2_ACCOUNT_ID',
] as const;

export function sanitizeMongoError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Database connection failed';

  return message
    .replace(/mongodb(\+srv)?:\/\/[^/\s]+/gi, 'mongodb$1://***')
    .replace(/\/\/([^:@\s/]+):([^@\s/]+)@/g, '//***:***@');
}

export function sanitizePublicError(error: unknown): string {
  let message = sanitizeMongoError(error);

  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      message = message.split(value).join(`[${key}]`);
    }
  }

  return message || 'Internal Server Error';
}

export async function connectDatabase(): Promise<void> {
  const uri = getMongoUri();
  const dbName = getMongoDbName();

  // Long-running local Express process, single instance, no traffic profile yet.
  // Timeouts fail the initial Atlas handshake quickly. bufferCommands: false
  // rejects work immediately when disconnected instead of queueing forever.
  // Pool size stays at mongoose defaults until we have concurrency data.
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
    bufferCommands: false,
  });

  console.log(`MongoDB connected (db=${dbName})`);
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

export async function pingDatabase(timeoutMs = 2500): Promise<boolean> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) {
    return false;
  }

  try {
    await Promise.race([
      db.admin().command({ ping: 1 }),
      new Promise<never>((_resolve, reject) => {
        setTimeout(
          () => reject(new Error('Database ping timed out')),
          timeoutMs,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
