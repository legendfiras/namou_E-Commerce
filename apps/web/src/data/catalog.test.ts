import assert from 'node:assert/strict';
import { test } from 'node:test';
import { products } from './catalog.ts';

test('catalog drops products without store photos', () => {
  const slugs = new Set(products.map((product) => product.slug));
  assert.equal(slugs.has('macbook-pro-14'), false);
  assert.equal(slugs.has('ipad-air'), false);
});

test('catalog includes iPhone, AirPods, Mac, and iPad', () => {
  const categories = new Set(products.map((product) => product.category));
  assert.equal(categories.has('iphone'), true);
  assert.equal(categories.has('airpods'), true);
  assert.equal(categories.has('mac'), true);
  assert.equal(categories.has('ipad'), true);
});

test('iPhone catalog keeps 15 models and 45 color variants', () => {
  const iphones = products.filter((product) => product.category === 'iphone');
  assert.equal(iphones.length, 15);
  assert.equal(iphones.flatMap((product) => product.variants).length, 45);
});

test('every variant has a unique id, swatch, image, cents, and stock', () => {
  const ids = new Set<string>();
  for (const product of products) {
    assert.ok(product.variants.length >= 1, product.name);
    for (const variant of product.variants) {
      assert.equal(variant.id, `${product.id}-${variant.colorSlug}`);
      assert.equal(ids.has(variant.id), false, variant.id);
      ids.add(variant.id);
      assert.ok(variant.color.length > 0);
      assert.match(variant.colorHex, /^#[0-9a-fA-F]{6}$/);
      assert.equal(Number.isInteger(variant.priceCents), true);
      assert.ok(variant.priceCents > 0);
      assert.equal(Number.isInteger(variant.stock), true);
      assert.ok(variant.stock >= 0);
      assert.ok(variant.images.length > 0);
      for (const image of variant.images) {
        assert.equal(image.includes('apple.com/'), false, image);
      }
    }
  }
});
