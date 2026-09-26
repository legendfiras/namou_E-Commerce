import { createApp } from './app';
import { connectDatabase, disconnectDatabase, sanitizePublicError } from './db';
import { applyDevDnsServers, getNodeEnv, getPort, loadApiEnv } from './env';

loadApiEnv();

async function start(): Promise<void> {
  getNodeEnv();
  const port = getPort();
  applyDevDnsServers();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on port ${port}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`Shutting down (${signal})`);

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

start().catch((error: unknown) => {
  console.error(sanitizePublicError(error));
  process.exit(1);
});
