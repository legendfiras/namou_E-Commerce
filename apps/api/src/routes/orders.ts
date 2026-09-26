import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import mongoose from 'mongoose';
import { readCurrentUser } from '../auth/currentUser';
import { sanitizePublicError } from '../db';
import {
  CheckoutRequestError,
  InsufficientStockError,
  parseCheckoutRequest,
  placeOrder,
} from '../domain/placeOrder';
import { Order, toPublicOrder } from '../models/order';

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

export function createOrderRouter(): Router {
  const router = createRouter();

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      if (databaseUnavailable(res)) {
        return;
      }

      const user = await readCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const request = parseCheckoutRequest(req.body);
        const existing = await Order.findOne({
          userId: user._id,
          idempotencyKey: request.idempotencyKey,
        });
        const order = existing
          ? toPublicOrder(existing)
          : await placeOrder({
              userId: user._id,
              customer: { name: user.name, email: user.email },
              idempotencyKey: request.idempotencyKey,
              items: request.items,
            });

        res.status(existing ? 200 : 201).json({ order });
      } catch (error) {
        if (error instanceof CheckoutRequestError) {
          res.status(400).json({ error: error.message });
          return;
        }

        if (error instanceof InsufficientStockError) {
          res.status(409).json({
            error: 'Insufficient stock',
            unavailable: error.unavailable,
          });
          return;
        }

        console.error(sanitizePublicError(error));
        res.status(503).json({ error: 'Service Unavailable' });
      }
    }),
  );

  router.get(
    '/:orderNumber',
    asyncRoute(async (req, res) => {
      if (databaseUnavailable(res)) {
        return;
      }

      const user = await readCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const orderNumber = req.params.orderNumber;
      if (typeof orderNumber !== 'string' || !/^NM-[A-F0-9]{8}$/.test(orderNumber)) {
        res.status(404).json({ error: 'Not Found' });
        return;
      }

      try {
        const order = await Order.findOne({
          orderNumber,
          userId: user._id,
        });
        if (!order) {
          res.status(404).json({ error: 'Not Found' });
          return;
        }

        res.status(200).json({ order: toPublicOrder(order) });
      } catch (error) {
        console.error(sanitizePublicError(error));
        res.status(503).json({ error: 'Service Unavailable' });
      }
    }),
  );

  return router;
}
