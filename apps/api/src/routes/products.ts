import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import mongoose from 'mongoose';
import { sanitizePublicError } from '../db';
import {
  filterProducts,
  isProductSlug,
  parseCatalogQuery,
} from '../domain/catalogQuery';
import { Product, toPublicProduct } from '../models/product';

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function databaseUnavailable(res: Parameters<RequestHandler>[1]): boolean {
  if (mongoose.connection.readyState === 1) {
    return false;
  }

  res.status(503).json({ error: 'Service Unavailable' });
  return true;
}

export function createProductRouter(): Router {
  const router = createRouter();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      if (databaseUnavailable(res)) {
        return;
      }

      try {
        const docs = await Product.find().lean();
        const products = filterProducts(
          docs.map(toPublicProduct),
          parseCatalogQuery(req.query),
        );
        res.status(200).json({ products });
      } catch (error) {
        console.error(sanitizePublicError(error));
        res.status(503).json({ error: 'Service Unavailable' });
      }
    }),
  );

  router.get(
    '/:slug',
    asyncRoute(async (req, res) => {
      if (databaseUnavailable(res)) {
        return;
      }

      const slug = req.params.slug;
      if (!isProductSlug(slug)) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }

      try {
        const doc = await Product.findOne({ slug }).lean();
        if (!doc) {
          res.status(404).json({ error: 'Not Found' });
          return;
        }

        res.status(200).json({ product: toPublicProduct(doc) });
      } catch (error) {
        console.error(sanitizePublicError(error));
        res.status(503).json({ error: 'Service Unavailable' });
      }
    }),
  );

  return router;
}
