import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSeedCatalog } from '../data/catalog.ts';
import {
  accountRecordForSignIn,
  GUEST_ACCOUNT,
  loadUserRecord,
  migrateVariantId,
  saveUserRecord,
  STORAGE_VERSION,
} from './persistence.ts';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

test('maps legacy color-plus-storage ids onto color-only variants', () => {
  const valid = new Set(['iphone-13-midnight', 'iphone-15-pink-15']);

  assert.equal(
    migrateVariantId('iphone-13-midnight-256gb', valid),
    'iphone-13-midnight',
  );
  assert.equal(
    migrateVariantId('iphone-13-midnight-128gb', valid),
    'iphone-13-midnight',
  );
  assert.equal(
    migrateVariantId('iphone-13-midnight', valid),
    'iphone-13-midnight',
  );
  assert.equal(migrateVariantId('iphone-13-green-128gb', valid), null);
  assert.equal(
    migrateVariantId('iphone-15-pink-15-512gb', valid),
    'iphone-15-pink-15',
  );
});

test('sign-in keeps the account cart and does not copy a legacy guest cart', () => {
  const account = {
    version: STORAGE_VERSION,
    cart: [
      { productId: 'iphone-16', variantId: 'iphone-16-black', quantity: 1 },
    ],
    wishlist: [{ productId: 'iphone-16' }],
    orders: [],
  };
  const guest = {
    version: STORAGE_VERSION,
    cart: [
      { productId: 'iphone-16', variantId: 'iphone-16-black', quantity: 1 },
      { productId: 'airpods-4', variantId: 'airpods-4-white', quantity: 2 },
    ],
    wishlist: [{ productId: 'airpods-4' }],
    orders: [],
  };

  const chosen = accountRecordForSignIn(account, guest);
  assert.deepEqual(chosen.cart, account.cart);
  assert.deepEqual(chosen.wishlist, account.wishlist);
  assert.equal(chosen.cart.length, 1);
});

test('an empty account stays empty when a guest cart exists', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage(),
    configurable: true,
  });

  const catalog = getSeedCatalog();
  const product = catalog[0];
  const variant = product?.variants[0];
  assert.ok(product && variant);

  saveUserRecord(GUEST_ACCOUNT, {
    version: STORAGE_VERSION,
    cart: [
      { productId: product.id, variantId: variant.id, quantity: 1 },
    ],
    wishlist: [{ productId: product.id }],
    orders: [],
  });

  const empty = loadUserRecord('new-customer@example.com');
  assert.deepEqual(empty.cart, []);
  assert.deepEqual(empty.wishlist, []);

  saveUserRecord('owner@example.com', {
    version: STORAGE_VERSION,
    cart: [
      { productId: product.id, variantId: variant.id, quantity: 2 },
    ],
    wishlist: [],
    orders: [],
  });
  const owner = loadUserRecord('owner@example.com');
  assert.equal(owner.cart.length, 1);
  assert.equal(owner.cart[0]?.quantity, 2);
  assert.deepEqual(owner.wishlist, []);
});
