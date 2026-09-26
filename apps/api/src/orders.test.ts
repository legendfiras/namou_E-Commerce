import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { SESSION_COOKIE, createSessionToken } from './auth/session';
import { createApp } from './app';
import {
  InsufficientStockError,
  placeOrder,
} from './domain/placeOrder';
import { Order } from './models/order';
import { Product } from './models/product';
import { User } from './models/user';

const app = createApp();
let replSet: MongoMemoryReplSet;

type VariantSeed = {
  id: string;
  color: string;
  colorSlug: string;
  stock: number;
  priceCents?: number;
};

async function createCatalogProduct(
  slug: string,
  variants: VariantSeed[],
): Promise<void> {
  await Product.create({
    slug,
    name: slug === 'demo-headset' ? 'Demo Headset' : 'Demo Buds',
    category: 'airpods',
    family: 'audio',
    series: 'everyday',
    spec: 'USB-C',
    description: 'Demo catalog product for checkout tests.',
    variants: variants.map((variant) => ({
      id: variant.id,
      color: variant.color,
      colorSlug: variant.colorSlug,
      colorHex: '#f5f5f7',
      storage: 'USB-C',
      priceCents: variant.priceCents ?? 12900,
      stock: variant.stock,
      images: [`/images/products/${slug}/${variant.colorSlug}.jpg`],
    })),
  });
}

async function createBuyer(sub: string) {
  return User.create({
    googleSub: sub,
    email: `${sub}@example.com`,
    name: 'Demo Buyer',
  });
}

function sessionCookie(sub: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(createSessionToken(sub))}`;
}

async function variantStock(slug: string, variantId: string): Promise<number> {
  const product = await Product.findOne({ slug });
  const variant = product?.variants.find((item) => item.id === variantId);
  assert.ok(variant, variantId);
  return variant.stock;
}

before(async () => {
  if ((process.env.SESSION_SECRET?.trim().length ?? 0) < 32) {
    process.env.SESSION_SECRET = 'orders-test-session-secret-32chars-min';
  }

  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(replSet.getUri());
  await Promise.all([
    Product.syncIndexes(),
    Order.syncIndexes(),
    User.syncIndexes(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

test('checkout prices come from MongoDB and stock decrements once', async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await createCatalogProduct('demo-buds', [
    {
      id: 'demo-buds-white',
      color: 'White',
      colorSlug: 'white',
      stock: 4,
      priceCents: 12900,
    },
  ]);
  await createBuyer('buyer-success');

  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', sessionCookie('buyer-success'))
    .send({
      idempotencyKey: 'success-key-000001',
      userId: 'ignored-user',
      totalCents: 1,
      items: [
        {
          productId: 'demo-buds',
          variantId: 'demo-buds-white',
          quantity: 2,
          priceCents: 1,
          stock: 99,
        },
      ],
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.order.status, 'placed');
  assert.equal(response.body.order.totalCents, 25800);
  assert.equal(response.body.order.items[0].unitPriceCents, 12900);
  assert.equal(response.body.order.items[0].quantity, 2);
  assert.equal(response.body.order.customer.name, 'Demo Buyer');
  assert.equal(await variantStock('demo-buds', 'demo-buds-white'), 2);
  assert.equal(await Order.countDocuments({}), 1);
});

test('insufficient stock saves no order and leaves every variant unchanged', async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await createCatalogProduct('demo-headset', [
    {
      id: 'demo-headset-white',
      color: 'White',
      colorSlug: 'white',
      stock: 5,
    },
    {
      id: 'demo-headset-midnight',
      color: 'Midnight',
      colorSlug: 'midnight',
      stock: 0,
      priceCents: 54900,
    },
  ]);
  await createBuyer('buyer-stock');

  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', sessionCookie('buyer-stock'))
    .send({
      idempotencyKey: 'stock-key-0000001',
      items: [
        {
          productId: 'demo-headset',
          variantId: 'demo-headset-white',
          quantity: 1,
        },
        {
          productId: 'demo-headset',
          variantId: 'demo-headset-midnight',
          quantity: 1,
        },
      ],
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Insufficient stock');
  assert.deepEqual(response.body.unavailable, [
    {
      variantId: 'demo-headset-midnight',
      productId: 'demo-headset',
      name: 'Demo Headset',
      color: 'Midnight',
      requested: 1,
      available: 0,
    },
  ]);
  assert.equal(await variantStock('demo-headset', 'demo-headset-white'), 5);
  assert.equal(await variantStock('demo-headset', 'demo-headset-midnight'), 0);
  assert.equal(await Order.countDocuments({}), 0);
});

test('repeating the same checkout returns the original order and does not decrement again', async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await createCatalogProduct('demo-buds', [
    {
      id: 'demo-buds-white',
      color: 'White',
      colorSlug: 'white',
      stock: 3,
    },
  ]);
  await createBuyer('buyer-retry');
  const payload = {
    idempotencyKey: 'retry-key-00000001',
    items: [
      { productId: 'demo-buds', variantId: 'demo-buds-white', quantity: 1 },
    ],
  };

  const first = await request(app)
    .post('/api/orders')
    .set('Cookie', sessionCookie('buyer-retry'))
    .send(payload);
  const second = await request(app)
    .post('/api/orders')
    .set('Cookie', sessionCookie('buyer-retry'))
    .send(payload);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body.order.id, first.body.order.id);
  assert.equal(await variantStock('demo-buds', 'demo-buds-white'), 2);
  assert.equal(await Order.countDocuments({}), 1);
});

test('concurrent checkouts cannot both buy the last unit', async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await createCatalogProduct('demo-buds', [
    {
      id: 'demo-buds-white',
      color: 'White',
      colorSlug: 'white',
      stock: 1,
    },
  ]);
  const buyer = await createBuyer('buyer-race');
  const input = {
    userId: buyer._id,
    customer: { name: buyer.name, email: buyer.email },
    items: [
      { productId: 'demo-buds', variantId: 'demo-buds-white', quantity: 1 },
    ],
  };

  const results = await Promise.allSettled([
    placeOrder({ ...input, idempotencyKey: 'race-key-aaaaaaa1' }),
    placeOrder({ ...input, idempotencyKey: 'race-key-bbbbbbb2' }),
  ]);

  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0]?.status, 'rejected');
  if (rejected[0]?.status === 'rejected') {
    assert.ok(rejected[0].reason instanceof InsufficientStockError);
  }
  assert.equal(await variantStock('demo-buds', 'demo-buds-white'), 0);
  assert.equal(await Order.countDocuments({}), 1);
});

test('an order is visible only to the account that placed it', async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await createCatalogProduct('demo-buds', [
    {
      id: 'demo-buds-white',
      color: 'White',
      colorSlug: 'white',
      stock: 2,
    },
  ]);
  await createBuyer('buyer-owner');
  await createBuyer('buyer-other');

  const created = await request(app)
    .post('/api/orders')
    .set('Cookie', sessionCookie('buyer-owner'))
    .send({
      idempotencyKey: 'owner-key-0000001',
      items: [
        { productId: 'demo-buds', variantId: 'demo-buds-white', quantity: 1 },
      ],
    });
  const orderId = created.body.order.id as string;

  const owner = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Cookie', sessionCookie('buyer-owner'));
  const other = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Cookie', sessionCookie('buyer-other'));
  const anonymous = await request(app).get(`/api/orders/${orderId}`);
  const unsigned = await request(app).post('/api/orders').send({
    idempotencyKey: 'unsigned-key-00001',
    items: [
      { productId: 'demo-buds', variantId: 'demo-buds-white', quantity: 1 },
    ],
  });

  assert.equal(owner.status, 200);
  assert.equal(owner.body.order.id, orderId);
  assert.equal(other.status, 404);
  assert.equal(anonymous.status, 401);
  assert.equal(unsigned.status, 401);
});
