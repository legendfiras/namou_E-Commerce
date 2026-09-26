import { getSeedCatalog } from '../data/catalog.ts';
import { seedInventory, type InventoryMap } from '../domain/checkout.ts';
import type { CartItem, Order, WishlistItem } from '../types/store.ts';

export const STORAGE_VERSION = 3;
export const GUEST_ACCOUNT = 'guest';

const INVENTORY_KEY = `namou.inventory.v${STORAGE_VERSION}`;
const LEGACY_INVENTORY_KEY = 'namou.inventory.v1';

type UserRecord = {
  version: typeof STORAGE_VERSION;
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
};

type InventoryRecord = {
  version: typeof STORAGE_VERSION;
  stock: InventoryMap;
};

function userKey(email: string, version = STORAGE_VERSION): string {
  return `namou.user.${email.toLowerCase()}.v${version}`;
}

function catalogVariantIds(): Set<string> {
  return new Set(
    getSeedCatalog().flatMap((product) =>
      product.variants.map((variant) => variant.id),
    ),
  );
}

function catalogProductIds(): Set<string> {
  return new Set(getSeedCatalog().map((product) => product.id));
}

export function migrateVariantId(
  variantId: string,
  validIds: Set<string> = catalogVariantIds(),
): string | null {
  if (validIds.has(variantId)) {
    return variantId;
  }

  const stripped = variantId.replace(/-(128gb|256gb|512gb|1tb)$/i, '');
  if (stripped !== variantId && validIds.has(stripped)) {
    return stripped;
  }

  return null;
}

function migrateCart(cart: CartItem[], validIds: Set<string>): CartItem[] {
  const merged = new Map<string, CartItem>();

  for (const item of cart) {
    const nextId = migrateVariantId(item.variantId, validIds);
    if (!nextId) {
      continue;
    }

    const existing = merged.get(`${item.productId}:${nextId}`);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(`${item.productId}:${nextId}`, {
        productId: item.productId,
        variantId: nextId,
        quantity: item.quantity,
      });
    }
  }

  return [...merged.values()];
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as CartItem;
  return (
    typeof item.variantId === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

function isWishlistItem(value: unknown): value is WishlistItem {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as WishlistItem).productId === 'string'
  );
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const order = value as Order;
  return (
    typeof order.id === 'string' &&
    typeof order.createdAt === 'string' &&
    typeof order.totalCents === 'number' &&
    Array.isArray(order.items)
  );
}

function emptyUserRecord(): UserRecord {
  return {
    version: STORAGE_VERSION,
    cart: [],
    wishlist: [],
    orders: [],
  };
}

function parseUserPayload(raw: string): {
  cart: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
} | null {
  try {
    const parsed = JSON.parse(raw) as Partial<UserRecord>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart.filter(isCartItem) : [],
      wishlist: Array.isArray(parsed.wishlist)
        ? parsed.wishlist.filter(isWishlistItem)
        : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders.filter(isOrder) : [],
    };
  } catch {
    return null;
  }
}

export function loadUserRecord(email: string): UserRecord {
  const empty = emptyUserRecord();
  const validVariantIds = catalogVariantIds();
  const validProductIds = catalogProductIds();

  try {
    const currentRaw = localStorage.getItem(userKey(email));
    if (currentRaw) {
      const parsed = parseUserPayload(currentRaw);
      if (!parsed) {
        return empty;
      }
      return {
        version: STORAGE_VERSION,
        cart: migrateCart(parsed.cart, validVariantIds),
        wishlist: parsed.wishlist.filter((item) =>
          validProductIds.has(item.productId),
        ),
        orders: parsed.orders,
      };
    }

    const legacyRaw =
      localStorage.getItem(userKey(email, 2)) ??
      localStorage.getItem(userKey(email, 1));
    if (!legacyRaw) {
      return empty;
    }
    const legacy = parseUserPayload(legacyRaw);
    if (!legacy) {
      return empty;
    }

    return {
      version: STORAGE_VERSION,
      cart: migrateCart(legacy.cart, validVariantIds),
      wishlist: legacy.wishlist.filter((item) =>
        validProductIds.has(item.productId),
      ),
      orders: legacy.orders,
    };
  } catch {
    return empty;
  }
}

export function saveUserRecord(email: string, record: UserRecord): void {
  localStorage.setItem(
    userKey(email),
    JSON.stringify({ ...record, version: STORAGE_VERSION }),
  );
}

export function loadInventory(): InventoryMap {
  const seed = seedInventory(getSeedCatalog());
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (!raw) {
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<InventoryRecord>;
    if (parsed.version !== STORAGE_VERSION || !parsed.stock) {
      return seed;
    }

    const merged: InventoryMap = { ...seed };
    for (const variantId of Object.keys(seed)) {
      const stored = parsed.stock[variantId];
      if (
        typeof stored === 'number' &&
        Number.isInteger(stored) &&
        stored >= 0
      ) {
        merged[variantId] = stored;
      }
    }
    return merged;
  } catch {
    return seed;
  }
}

export function saveInventory(stock: InventoryMap): void {
  const record: InventoryRecord = { version: STORAGE_VERSION, stock };
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(record));
  localStorage.removeItem(LEGACY_INVENTORY_KEY);
}

export function resetPersistedDemo(): void {
  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith('namou.')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
