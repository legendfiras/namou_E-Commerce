import assert from 'node:assert/strict';
import { test } from 'node:test';
import { products } from '../data/catalog.ts';
import { suggestProducts } from './catalogQuery.ts';

test('an empty search has no predictions', () => {
  assert.deepEqual(suggestProducts(products, '   '), []);
});

test('typing a product name predicts that product first', () => {
  const matches = suggestProducts(products, 'airpods max');
  assert.equal(matches[0]?.product.slug, 'airpods-max');
  assert.ok(matches.every((item) => item.product.name.toLowerCase().includes('air')));
});

test('typing a color predicts products in that finish', () => {
  const matches = suggestProducts(products, 'pink');
  assert.ok(matches.length > 0);
  assert.ok(
    matches.every((item) =>
      item.product.variants.some(
        (variant) => variant.color.toLowerCase() === 'pink',
      ),
    ),
  );
  assert.match(matches[0]?.detail ?? '', /Pink/);
});
