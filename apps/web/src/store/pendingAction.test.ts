import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearPendingAction,
  peekPendingAction,
  savePendingAction,
  safeReturnPath,
  takePendingAction,
  type PendingAction,
} from './pendingAction.ts';

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

const cartAction: PendingAction = {
  type: 'add-to-cart',
  productId: 'iphone-15',
  variantId: 'iphone-15-black',
  productName: 'iPhone 15',
  color: 'Black',
  quantity: 1,
};

test('a pending action is consumed once', () => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memoryStorage(),
    configurable: true,
  });

  savePendingAction(cartAction);
  assert.deepEqual(takePendingAction(), cartAction);
  assert.equal(takePendingAction(), null);
  assert.equal(peekPendingAction(), null);
});

test('cancelling login drops the pending action', () => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memoryStorage(),
    configurable: true,
  });

  savePendingAction({
    type: 'add-to-wishlist',
    productId: 'airpods-4',
    productName: 'AirPods 4',
  });
  clearPendingAction();
  assert.equal(takePendingAction(), null);
});

test('return paths stay inside the store', () => {
  assert.equal(safeReturnPath(null), '/products');
  assert.equal(safeReturnPath('/login?from=/cart'), '/products');
  assert.equal(safeReturnPath('//evil.example'), '/products');
  assert.equal(safeReturnPath('/cart'), '/cart');
  assert.equal(
    safeReturnPath('/products/iphone-15?color=black'),
    '/products/iphone-15?color=black',
  );
});
