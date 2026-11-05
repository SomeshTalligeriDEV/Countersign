import { createHmac, timingSafeEqual } from 'node:crypto';

/** Sign the exact transmitted bytes. Secrets stay on the merchant/server. */
export function signWebhook(secret, body, timestamp = Math.floor(Date.now() / 1000)) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('webhook_secret_too_short');
  if (!Buffer.isBuffer(body)) throw new Error('raw_body_required');
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('invalid_timestamp');
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/** Authentication only: durable event deduplication belongs in the receiver DB. */
export function verifyWebhook(secret, body, header, now = Math.floor(Date.now() / 1000)) {
  if (typeof header !== 'string') return false;
  const match = /^t=(0|[1-9][0-9]*),v1=([a-f0-9]{64})$/.exec(header);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(now) || Math.abs(now - timestamp) > 300) return false;
  const expected = signWebhook(secret, body, timestamp).split('v1=')[1];
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(match[2], 'hex'));
}
