import type { CartItem } from '../types/store.ts';
import { parseQuantity } from './money.ts';

export type StockLookup = (variantId: string) => number | undefined;

export function addCartItem(
  items: CartItem[],
  productId: string,
  variantId: string,
  quantity: unknown,
  getStock: StockLookup,
): { ok: true; items: CartItem[] } | { ok: false; message: string } {
  const parsed = parseQuantity(quantity);
  if (!parsed.ok) {
    return parsed;
  }

  const stock = getStock(variantId);
  if (stock === undefined) {
    return { ok: false, message: 'That variant is no longer available.' };
  }

  const existing = items.find((item) => item.variantId === variantId);
  const nextQuantity = (existing?.quantity ?? 0) + parsed.quantity;

  if (nextQuantity > stock) {
    return {
      ok: false,
      message:
        stock === 0
          ? 'That variant is out of stock.'
          : `Only ${stock} available for this variant.`,
    };
  }

  if (existing) {
    return {
      ok: true,
      items: items.map((item) =>
        item.variantId === variantId
          ? { ...item, quantity: nextQuantity }
          : item,
      ),
    };
  }

  return {
    ok: true,
    items: [...items, { productId, variantId, quantity: parsed.quantity }],
  };
}

export function updateCartQuantity(
  items: CartItem[],
  variantId: string,
  quantity: unknown,
  getStock: StockLookup,
): { ok: true; items: CartItem[] } | { ok: false; message: string } {
  const parsed = parseQuantity(quantity);
  if (!parsed.ok) {
    return parsed;
  }

  const stock = getStock(variantId);
  if (stock === undefined) {
    return { ok: false, message: 'That variant is no longer available.' };
  }

  if (parsed.quantity > stock) {
    return {
      ok: false,
      message: `Only ${stock} available for this variant.`,
    };
  }

  if (!items.some((item) => item.variantId === variantId)) {
    return { ok: false, message: 'That item is not in the cart.' };
  }

  return {
    ok: true,
    items: items.map((item) =>
      item.variantId === variantId
        ? { ...item, quantity: parsed.quantity }
        : item,
    ),
  };
}

export function removeCartItem(
  items: CartItem[],
  variantId: string,
): CartItem[] {
  return items.filter((item) => item.variantId !== variantId);
}

export function changeCartVariant(
  items: CartItem[],
  fromVariantId: string,
  toVariantId: string,
  toProductId: string,
  getStock: StockLookup,
): { ok: true; items: CartItem[] } | { ok: false; message: string } {
  if (fromVariantId === toVariantId) {
    return { ok: true, items };
  }

  const source = items.find((item) => item.variantId === fromVariantId);
  if (!source) {
    return { ok: false, message: 'That item is not in the cart.' };
  }

  const targetStock = getStock(toVariantId);
  if (targetStock === undefined) {
    return { ok: false, message: 'That variant is no longer available.' };
  }

  const existingTarget = items.find((item) => item.variantId === toVariantId);

  if (existingTarget) {
    const mergedQuantity = existingTarget.quantity + source.quantity;
    if (mergedQuantity > targetStock) {
      return {
        ok: false,
        message: `Those variants cannot be merged. Combined quantity would be ${mergedQuantity}, but only ${targetStock} are in stock.`,
      };
    }

    return {
      ok: true,
      items: items
        .filter((item) => item.variantId !== fromVariantId)
        .map((item) =>
          item.variantId === toVariantId
            ? { ...item, quantity: mergedQuantity }
            : item,
        ),
    };
  }

  if (source.quantity > targetStock) {
    return {
      ok: false,
      message:
        targetStock === 0
          ? 'The selected variant is out of stock.'
          : `Only ${targetStock} available for the selected variant.`,
    };
  }

  return {
    ok: true,
    items: items.map((item) =>
      item.variantId === fromVariantId
        ? {
            productId: toProductId,
            variantId: toVariantId,
            quantity: item.quantity,
          }
        : item,
    ),
  };
}
