import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook, verifyWebhook } from '../src/webhooks.mjs';
const secret = 'local-test-only-secret-with-32-bytes';
const body = Buffer.from('{"event":"payment.succeeded","paymentId":"abc"}');
test('A-13 accepts signed raw bytes within freshness window', () => {
  assert.equal(verifyWebhook(secret, body, signWebhook(secret, body, 1000), 1001), true);
});
test('A-13 rejects tampered payload, wrong key, expired and future signatures', () => {
  const header = signWebhook(secret, body, 1000);
  assert.equal(verifyWebhook(secret, Buffer.from('{}'), header, 1000), false);
  assert.equal(verifyWebhook('another-test-secret-at-least-32-bytes', body, header, 1000), false);
  assert.equal(verifyWebhook(secret, body, header, 1301), false);
  assert.equal(verifyWebhook(secret, body, header, 699), false);
});
test('rejects ambiguous headers and requires raw payload', () => {
  const header = signWebhook(secret, body, 1000);
  assert.equal(verifyWebhook(secret, body, `${header},t=1001`, 1000), false);
  assert.throws(() => signWebhook(secret, '{}', 1000), /raw_body_required/);
});
