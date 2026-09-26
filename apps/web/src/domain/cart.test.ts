import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addCartItem, changeCartVariant, updateCartQuantity } from './cart.ts';
import { createOrderSnapshot } from './checkout.ts';
import type { Product } from '../types/store.ts';

const products: Product[] = [
  {
    id: 'iphone-15',
    slug: 'iphone-15',
    name: 'iPhone 15',
    category: 'iphone',
    family: '15',
    series: 'everyday',
    spec: '256GB',
    description: 'Test product',
    variants: [
      {
        id: 'iphone-15-black',
        color: 'Black',
        colorSlug: 'black',
        colorHex: '#000',
        storage: '256GB',
        priceCents: 72900,
        stock: 5,
        images: ['/images/products/black.svg'],
      },
      {
        id: 'iphone-15-pink',
        color: 'Pink',
        colorSlug: 'pink-15',
        colorHex: '#f2c1c6',
        storage: '256GB',
        priceCents: 72900,
        stock: 1,
        images: ['/images/products/pink-15.svg'],
      },
    ],
  },
];

const stock: Record<string, number> = {
  'iphone-15-black': 5,
  'iphone-15-pink': 1,
};

const getStock = (id: string) => stock[id];

test('adding the same color variant merges quantities', () => {
  const first = addCartItem([], 'iphone-15', 'iphone-15-black', 2, getStock);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  const second = addCartItem(
    first.items,
    'iphone-15',
    'iphone-15-black',
    1,
    getStock,
  );
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }
  assert.deepEqual(second.items, [
    { productId: 'iphone-15', variantId: 'iphone-15-black', quantity: 3 },
  ]);
});

test('different colors remain separate lines', () => {
  const first = addCartItem([], 'iphone-15', 'iphone-15-black', 1, getStock);
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  const second = addCartItem(
    first.items,
    'iphone-15',
    'iphone-15-pink',
    1,
    getStock,
  );
  assert.equal(second.ok, true);
  if (!second.ok) {
    return;
  }
  assert.equal(second.items.length, 2);
});

test('rejects zero, negative, fractional, and above-stock quantities', () => {
  assert.equal(
    addCartItem([], 'iphone-15', 'iphone-15-black', 0, getStock).ok,
    false,
  );
  assert.equal(
    addCartItem([], 'iphone-15', 'iphone-15-black', -1, getStock).ok,
    false,
  );
  assert.equal(
    addCartItem([], 'iphone-15', 'iphone-15-black', 1.5, getStock).ok,
    false,
  );
  assert.equal(
    addCartItem([], 'iphone-15', 'iphone-15-black', 6, getStock).ok,
    false,
  );
  assert.equal(
    updateCartQuantity(
      [{ productId: 'iphone-15', variantId: 'iphone-15-black', quantity: 1 }],
      'iphone-15-black',
      8,
      getStock,
    ).ok,
    false,
  );
});

test('changing to an existing color merges only when stock allows', () => {
  const items = [
    { productId: 'iphone-15', variantId: 'iphone-15-black', quantity: 2 },
    { productId: 'iphone-15', variantId: 'iphone-15-pink', quantity: 1 },
  ];

  const rejected = changeCartVariant(
    items,
    'iphone-15-black',
    'iphone-15-pink',
    'iphone-15',
    getStock,
  );
  assert.equal(rejected.ok, false);
  if (rejected.ok) {
    return;
  }
  assert.match(rejected.message, /cannot be merged/);

  const accepted = changeCartVariant(
    [{ productId: 'iphone-15', variantId: 'iphone-15-black', quantity: 1 }],
    'iphone-15-black',
    'iphone-15-pink',
    'iphone-15',
    getStock,
  );
  assert.equal(accepted.ok, true);
  if (!accepted.ok) {
    return;
  }
  assert.deepEqual(accepted.items, [
    { productId: 'iphone-15', variantId: 'iphone-15-pink', quantity: 1 },
  ]);
});

test('checkout snapshots prices, reduces stock, and leaves an empty cart result', () => {
  const cart = [
    { productId: 'iphone-15', variantId: 'iphone-15-black', quantity: 2 },
  ];
  const result = createOrderSnapshot(
    cart,
    products,
    { ...stock },
    {
      id: 'NM-TEST',
      now: '2026-09-24T12:00:00.000Z',
    },
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.order.items[0]?.unitPriceCents, 72900);
  assert.equal(result.order.items[0]?.productName, 'iPhone 15');
  assert.equal(result.order.items[0]?.color, 'Black');
  assert.equal(result.order.items[0]?.storage, '256GB');
  assert.equal(result.order.totalCents, 145800);
  assert.equal(result.inventory['iphone-15-black'], 3);

  const oversold = createOrderSnapshot(
    [{ productId: 'iphone-15', variantId: 'iphone-15-pink', quantity: 2 }],
    products,
    { ...stock },
    { id: 'NM-FAIL', now: '2026-09-24T12:00:00.000Z' },
  );
  assert.equal(oversold.ok, false);
});
