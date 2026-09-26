import { randomBytes } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { Order, toPublicOrder, type PublicOrder } from '../models/order';
import { Product } from '../models/product';

const MAX_LINES = 20;
const MAX_QUANTITY = 99;

export type RequestedLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type UnavailableVariant = {
  variantId: string;
  productId: string;
  name: string;
  color: string;
  requested: number;
  available: number;
};

export class CheckoutRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutRequestError';
  }
}

export class InsufficientStockError extends Error {
  readonly unavailable: UnavailableVariant[];

  constructor(unavailable: UnavailableVariant[]) {
    super('Insufficient stock');
    this.name = 'InsufficientStockError';
    this.unavailable = unavailable;
  }
}

export type PlaceOrderInput = {
  userId: mongoose.Types.ObjectId;
  customer: { name: string; email: string };
  idempotencyKey: string;
  items: RequestedLine[];
};

function isDuplicateKey(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === 11000 || candidate.cause?.code === 11000;
}

export function parseCheckoutRequest(body: unknown): {
  idempotencyKey: string;
  items: RequestedLine[];
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CheckoutRequestError('Invalid checkout request.');
  }

  const record = body as Record<string, unknown>;
  if (
    typeof record.idempotencyKey !== 'string' ||
    !/^[A-Za-z0-9_-]{16,80}$/.test(record.idempotencyKey)
  ) {
    throw new CheckoutRequestError('Invalid checkout request.');
  }

  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new CheckoutRequestError('Your cart is empty.');
  }

  if (record.items.length > MAX_LINES) {
    throw new CheckoutRequestError('Invalid checkout request.');
  }

  const merged = new Map<string, RequestedLine>();

  for (const entry of record.items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new CheckoutRequestError('Invalid checkout request.');
    }

    const item = entry as Record<string, unknown>;
    if (typeof item.productId !== 'string' || typeof item.variantId !== 'string') {
      throw new CheckoutRequestError('Invalid checkout request.');
    }

    const productId = item.productId.trim();
    const variantId = item.variantId.trim();
    if (!productId || !variantId) {
      throw new CheckoutRequestError('Invalid checkout request.');
    }

    if (
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      throw new CheckoutRequestError('Invalid checkout request.');
    }

    const existing = merged.get(variantId);
    if (existing) {
      if (existing.productId !== productId) {
        throw new CheckoutRequestError('Invalid checkout request.');
      }
      const quantity = existing.quantity + item.quantity;
      if (quantity > MAX_QUANTITY) {
        throw new CheckoutRequestError('Invalid checkout request.');
      }
      existing.quantity = quantity;
      continue;
    }

    merged.set(variantId, {
      productId,
      variantId,
      quantity: item.quantity,
    });
  }

  return {
    idempotencyKey: record.idempotencyKey,
    items: [...merged.values()],
  };
}

function createOrderNumber(): string {
  return `NM-${randomBytes(4).toString('hex').toUpperCase()}`;
}

async function placeOrderInSession(
  input: PlaceOrderInput,
  session: ClientSession,
): Promise<PublicOrder> {
  const existing = await Order.findOne({
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  }).session(session);

  if (existing) {
    return toPublicOrder(existing);
  }

  const slugs = [...new Set(input.items.map((item) => item.productId))];
  const products = await Product.find({ slug: { $in: slugs } }).session(session);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const unavailable: UnavailableVariant[] = [];
  const lines: Array<{
    variantId: string;
    productId: string;
    productName: string;
    color: string;
    storage: string;
    unitPriceCents: number;
    quantity: number;
    image: string;
  }> = [];

  for (const item of input.items) {
    const product = bySlug.get(item.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === item.variantId,
    );

    if (!product || !variant || variant.images.length === 0) {
      throw new CheckoutRequestError('A cart item is no longer available.');
    }

    if (variant.stock < item.quantity) {
      unavailable.push({
        variantId: variant.id,
        productId: product.slug,
        name: product.name,
        color: variant.color,
        requested: item.quantity,
        available: variant.stock,
      });
      continue;
    }

    lines.push({
      variantId: variant.id,
      productId: product.slug,
      productName: product.name,
      color: variant.color,
      storage: variant.storage,
      unitPriceCents: variant.priceCents,
      quantity: item.quantity,
      image: variant.images[0] ?? '',
    });
  }

  if (unavailable.length > 0) {
    throw new InsufficientStockError(unavailable);
  }

  for (const line of lines) {
    const updated = await Product.findOneAndUpdate(
      {
        slug: line.productId,
        variants: {
          $elemMatch: {
            id: line.variantId,
            stock: { $gte: line.quantity },
          },
        },
      },
      { $inc: { 'variants.$.stock': -line.quantity } },
      { session, returnDocument: 'before' },
    );

    if (!updated) {
      const current = await Product.findOne({ slug: line.productId }).session(
        session,
      );
      const stock =
        current?.variants.find((variant) => variant.id === line.variantId)
          ?.stock ?? 0;
      throw new InsufficientStockError([
        {
          variantId: line.variantId,
          productId: line.productId,
          name: line.productName,
          color: line.color,
          requested: line.quantity,
          available: stock,
        },
      ]);
    }
  }

  const totalCents = lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );
  const [created] = await Order.create(
    [
      {
        orderNumber: createOrderNumber(),
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
        status: 'placed',
        items: lines,
        totalCents,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
        },
      },
    ],
    { session },
  );

  if (!created) {
    throw new Error('Order was not created.');
  }

  return toPublicOrder(created);
}

export async function placeOrder(input: PlaceOrderInput): Promise<PublicOrder> {
  const session = await mongoose.startSession();

  try {
    let order: PublicOrder | undefined;
    await session.withTransaction(async () => {
      order = await placeOrderInSession(input, session);
    });

    if (!order) {
      throw new Error('Order was not created.');
    }

    return order;
  } catch (error) {
    if (isDuplicateKey(error)) {
      const existing = await Order.findOne({
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      });
      if (existing) {
        return toPublicOrder(existing);
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
