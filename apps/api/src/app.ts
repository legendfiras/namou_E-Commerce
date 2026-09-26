import express, { type ErrorRequestHandler, type Express } from 'express';
import { pingDatabase, sanitizePublicError } from './db';
import { createAuthRouter } from './routes/auth';
import { createOrderRouter } from './routes/orders';
import { createProductRouter } from './routes/products';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  // Application process health only. Does not check MongoDB or other dependencies.
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/ready', async (_req, res) => {
    const ready = await pingDatabase();
    if (ready) {
      res.status(200).json({ status: 'ready' });
      return;
    }
    res.status(503).json({ status: 'unavailable' });
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api/orders', createOrderRouter());
  app.use('/api/products', createProductRouter());

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err.status === 'number' ? err.status : 500;
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(status).json({
      error: isProduction ? 'Internal Server Error' : sanitizePublicError(err),
    });
  };

  app.use(errorHandler);

  return app;
}
