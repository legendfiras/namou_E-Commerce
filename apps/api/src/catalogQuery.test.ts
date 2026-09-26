import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seedProducts } from './data/catalog';
import {
  filterProducts,
  isProductSlug,
  parseCatalogQuery,
  startingPriceCents,
} from './domain/catalogQuery';

test('seed catalog matches the storefront shape', () => {
  const iphones = seedProducts.filter(
    (product) => product.category === 'iphone',
  );
  const ids = new Set<string>();

  assert.equal(seedProducts.length, 21);
  assert.equal(iphones.length, 15);
  assert.equal(iphones.flatMap((product) => product.variants).length, 45);

  for (const product of seedProducts) {
    assert.equal(product.id, product.slug);
    assert.equal(isProductSlug(product.slug), true);
    assert.ok(product.variants.length >= 1, product.name);

    for (const variant of product.variants) {
      assert.equal(variant.id, `${product.slug}-${variant.colorSlug}`);
      assert.equal(ids.has(variant.id), false, variant.id);
      ids.add(variant.id);
      assert.match(variant.colorHex, /^#[0-9a-fA-F]{6}$/);
      assert.equal(Number.isInteger(variant.priceCents), true);
      assert.ok(variant.priceCents > 0);
      assert.equal(Number.isInteger(variant.stock), true);
      assert.ok(variant.stock >= 0);
      assert.ok(variant.images.length > 0);
    }
  }
});

test('parseCatalogQuery accepts list filters and ignores unknown values', () => {
  assert.deepEqual(
    parseCatalogQuery({
      q: ' air ',
      category: 'airpods',
      family: ['audio', 'nope'],
      series: 'pro',
      sort: 'name-desc',
    }),
    {
      q: 'air',
      category: 'airpods',
      family: ['audio'],
      series: 'pro',
      sort: 'name-desc',
    },
  );

  assert.deepEqual(
    parseCatalogQuery({ category: 'toaster', sort: 'popular' }),
    {
      q: undefined,
      category: undefined,
      family: undefined,
      series: undefined,
      sort: undefined,
    },
  );
});

test('filterProducts searches, filters, and sorts in memory', () => {
  const airpods = filterProducts(seedProducts, {
    q: 'air',
    category: 'airpods',
    sort: 'price-asc',
  });

  assert.deepEqual(
    airpods.map((product) => product.slug),
    ['airpods-4', 'airpods-pro-2', 'airpods-max'],
  );
  assert.ok(
    startingPriceCents(airpods[0]) <=
      startingPriceCents(airpods[airpods.length - 1]),
  );

  const proIphones = filterProducts(seedProducts, {
    category: 'iphone',
    series: 'pro',
    family: ['16'],
  });
  assert.deepEqual(
    proIphones.map((product) => product.slug),
    ['iphone-16-pro'],
  );
});
