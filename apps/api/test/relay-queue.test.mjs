import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RelayQueue } from '../src/relay-queue.mjs';
test('serializes concurrent work and continues after failed simulation', async () => {
  const queue = new RelayQueue();
  const events = [];
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const first = queue.run(async () => { events.push('first'); await barrier; throw new Error('would_revert'); });
  const rejected = assert.rejects(first, /would_revert/);
  const second = queue.run(async () => { events.push('second'); return 'broadcast'; });
  await Promise.resolve();
  assert.deepEqual(events, ['first']);
  release();
  await rejected;
  assert.equal(await second, 'broadcast');
  assert.deepEqual(events, ['first', 'second']);
});
test('bounds pending work', async () => {
  const queue = new RelayQueue(1);
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const first = queue.run(() => barrier);
  await assert.rejects(queue.run(() => {}), /relayer_busy/);
  release();
  await first;
});
