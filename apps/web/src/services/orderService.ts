import type { CartItem, Order, OrderLine } from '../types/store.ts';

export type UnavailableVariant = {
  variantId: string;
  productId: string;
  name: string;
  color: string;
  requested: number;
  available: number;
};

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; message: string; unavailable?: UnavailableVariant[] };

type OrderResponse = {
  order?: unknown;
  error?: unknown;
  unavailable?: unknown;
};

function isOrderLine(value: unknown): value is OrderLine {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const line = value as Record<string, unknown>;
  return (
    typeof line.variantId === 'string' &&
    typeof line.productId === 'string' &&
    typeof line.productName === 'string' &&
    typeof line.color === 'string' &&
    typeof line.storage === 'string' &&
    typeof line.unitPriceCents === 'number' &&
    Number.isInteger(line.unitPriceCents) &&
    typeof line.quantity === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0 &&
    typeof line.image === 'string'
  );
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const order = value as Record<string, unknown>;
  return (
    typeof order.id === 'string' &&
    order.id.length > 0 &&
    order.status === 'placed' &&
    typeof order.createdAt === 'string' &&
    typeof order.totalCents === 'number' &&
    Number.isInteger(order.totalCents) &&
    Array.isArray(order.items) &&
    order.items.every(isOrderLine)
  );
}

function isUnavailable(value: unknown): value is UnavailableVariant {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.variantId === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.color === 'string' &&
    typeof item.requested === 'number' &&
    typeof item.available === 'number'
  );
}

function stockMessage(items: UnavailableVariant[]): string {
  if (items.length === 0) {
    return 'An item in your cart is no longer available in that quantity.';
  }

  return items
    .map((item) =>
      item.available <= 0
        ? `${item.name} in ${item.color} is out of stock.`
        : `${item.name} in ${item.color} has ${item.available} available.`,
    )
    .join(' ');
}

export async function placeDemoOrder(
  items: CartItem[],
  idempotencyKey: string,
): Promise<PlaceOrderResult> {
  let response: Response;
  try {
    response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idempotencyKey,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });
  } catch {
    return {
      ok: false,
      message: 'The order could not be placed. Your cart is unchanged.',
    };
  }

  let body: OrderResponse = {};
  try {
    body = (await response.json()) as OrderResponse;
  } catch {
    body = {};
  }

  if (response.status === 401) {
    return {
      ok: false,
      message: 'Sign in with Google to place a demo order.',
    };
  }

  if (response.status === 409) {
    const unavailable = Array.isArray(body.unavailable)
      ? body.unavailable.filter(isUnavailable)
      : [];
    return {
      ok: false,
      message: stockMessage(unavailable),
      unavailable,
    };
  }

  if ((response.status === 200 || response.status === 201) && isOrder(body.order)) {
    return { ok: true, order: body.order };
  }

  return {
    ok: false,
    message:
      typeof body.error === 'string' && body.error.length > 0
        ? body.error
        : 'The order could not be placed. Your cart is unchanged.',
  };
}

export async function fetchOwnOrder(
  orderId: string,
): Promise<
  | { ok: true; order: Order }
  | { ok: false; reason: 'missing' | 'unauthorized' | 'error' }
> {
  let response: Response;
  try {
    response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      credentials: 'include',
    });
  } catch {
    return { ok: false, reason: 'error' };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  if (response.status === 404) {
    return { ok: false, reason: 'missing' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'error' };
  }

  let body: OrderResponse = {};
  try {
    body = (await response.json()) as OrderResponse;
  } catch {
    return { ok: false, reason: 'error' };
  }

  if (!isOrder(body.order)) {
    return { ok: false, reason: 'error' };
  }

  return { ok: true, order: body.order };
}
