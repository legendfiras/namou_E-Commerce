import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from './app';

test('GET /api/health returns 200 and { status: "ok" }', async () => {
  const response = await request(createApp()).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /api/ready returns 503 when the database is not connected', async () => {
  const response = await request(createApp()).get('/api/ready');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { status: 'unavailable' });
});

test('GET /api/products returns 503 when the database is not connected', async () => {
  const response = await request(createApp()).get('/api/products');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: 'Service Unavailable' });
});

test('GET /api/products/:slug returns 503 when the database is not connected', async () => {
  const response = await request(createApp()).get('/api/products/iphone-16');

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { error: 'Service Unavailable' });
});
