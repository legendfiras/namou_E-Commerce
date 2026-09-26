import type { CartItem, Order, OrderLine, Product } from '../types/store.ts';

export type InventoryMap = Record<string, number>;

export function findProduct(
  products: Product[],
  productId: string,
): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function findVariant(product: Product, variantId: string) {
  return product.variants.find((variant) => variant.id === variantId);
}

export function cartTotalCents(items: CartItem[], products: Product[]): number {
  return items.reduce((total, item) => {
    const product = findProduct(products, item.productId);
    const variant = product ? findVariant(product, item.variantId) : undefined;
    return total + (variant?.priceCents ?? 0) * item.quantity;
  }, 0);
}

export function createOrderSnapshot(
  items: CartItem[],
  products: Product[],
  inventory: InventoryMap,
  deps: { id: string; now: string },
):
  | { ok: true; order: Order; inventory: InventoryMap }
  | { ok: false; message: string } {
  if (items.length === 0) {
    return { ok: false, message: 'Your cart is empty.' };
  }

  const nextInventory = { ...inventory };
  const orderItems: OrderLine[] = [];

  for (const item of items) {
    const product = findProduct(products, item.productId);
    const variant = product ? findVariant(product, item.variantId) : undefined;

    if (!product || !variant) {
      return {
        ok: false,
        message: 'A cart item is no longer available.',
      };
    }

    const available = nextInventory[variant.id] ?? variant.stock;
    if (item.quantity > available) {
      return {
        ok: false,
        message: `${product.name} in ${variant.color} only has ${available} in stock.`,
      };
    }

    nextInventory[variant.id] = available - item.quantity;
    orderItems.push({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      color: variant.color,
      storage: variant.storage,
      unitPriceCents: variant.priceCents,
      quantity: item.quantity,
      image: variant.images[0] ?? '/images/products/fallback.svg',
    });
  }

  const order: Order = {
    id: deps.id,
    status: 'placed',
    createdAt: deps.now,
    items: orderItems,
    totalCents: orderItems.reduce(
      (total, line) => total + line.unitPriceCents * line.quantity,
      0,
    ),
  };

  return { ok: true, order, inventory: nextInventory };
}

export function seedInventory(products: Product[]): InventoryMap {
  return Object.fromEntries(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.id, variant.stock]),
    ),
  );
}
