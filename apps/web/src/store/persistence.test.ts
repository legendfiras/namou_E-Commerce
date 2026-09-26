import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateVariantId } from './persistence.ts';

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
