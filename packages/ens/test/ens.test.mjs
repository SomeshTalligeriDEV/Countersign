// Uses a FAKE ENS client (in-memory records); no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFunctionData } from 'viem';
import { readAgentPolicy, policyRecords, buildSetTexts, buildCreateSubname, buildGrantAgentKey, buildRevoke, resolverAbi, registryAbi, KEYS, dnsName, ROLE_SET_TEXT } from '../src/index.mjs';

const A = '0x1111111111111111111111111111111111111111', M = '0x2222222222222222222222222222222222222222', R = '0x3333333333333333333333333333333333333333';
const H = '0x' + 'ab'.repeat(32);
const fake = (addr, texts) => ({ getEnsAddress: async () => addr, getEnsText: async ({ key }) => texts[key] ?? null });

test('reads and parses a valid policy', async () => {
  const p = await readAgentPolicy(fake(A, policyRecords({ limits: { perTx: '10' }, merchantsHash: H, attestor: A, mandateAddress: M })), 'Buyer.Demo.eth');
  assert.equal(p.name, 'buyer.demo.eth');
  assert.deepEqual(p.limits, { perTx: '10' });
  assert.equal(p.mandate.chainId, 1874);
  assert.equal(p.mandate.address, M);
  assert.deepEqual(p.problems, []);
});

test('flags wrong chain, bad JSON, missing address', async () => {
  const p = await readAgentPolicy(fake(null, { [KEYS.mandate]: `eip155:1:${M}`, [KEYS.limits]: '{', [KEYS.attestor]: 'nope' }), 'x.eth');
  assert.equal(p.problems.length, 4);
});

test('setTexts encodes multicall of setText with DNS-encoded name', () => {
  const tx = buildSetTexts({ resolver: R, name: 'buyer.demo.eth', records: { a: '1', b: '2' } });
  const { functionName, args } = decodeFunctionData({ abi: resolverAbi, data: tx.data });
  assert.equal(functionName, 'multicall');
  const inner = decodeFunctionData({ abi: resolverAbi, data: args[0][1] });
  assert.deepEqual(inner.args, [dnsName('buyer.demo.eth'), 'b', '2']);
});

test('createSubname rejects past expiry and multi-label', () => {
  assert.throws(() => buildCreateSubname({ userRegistry: R, label: 'buyer', owner: A, resolver: R, roleBitmap: 0n, expiry: 1n }));
  assert.throws(() => buildCreateSubname({ userRegistry: R, label: 'a.b', owner: A, resolver: R, roleBitmap: 0n, expiry: 2n ** 40n }));
  const tx = buildCreateSubname({ userRegistry: R, label: 'buyer', owner: A, resolver: R, roleBitmap: 0n, expiry: 2n ** 40n });
  assert.equal(decodeFunctionData({ abi: registryAbi, data: tx.data }).functionName, 'register');
});

test('agent cannot be granted policy keys', () => {
  assert.throws(() => buildGrantAgentKey({ resolver: R, agent: A, key: KEYS.limits }));
  assert.ok(buildGrantAgentKey({ resolver: R, agent: A, key: 'agent-context' }).data);
});

test('revoke clears all policy keys, revokes scoped roles, optionally unregisters', () => {
  const txs = buildRevoke({ resolver: R, name: 'buyer.demo.eth', agent: A, registry: M, label: 'buyer', unregister: true });
  assert.equal(txs.length, 4);
  const calls = decodeFunctionData({ abi: resolverAbi, data: txs[0].data }).args[0].map((d) => decodeFunctionData({ abi: resolverAbi, data: d }).args);
  assert.deepEqual(calls.map((c) => c[1]).sort(), [...Object.values(KEYS), 'agent-endpoint[web]', 'agent-context'].sort());
  assert.ok(calls.every((c) => c[2] === ''), 'every record cleared');
  assert.equal(buildRevoke({ resolver: R, name: 'buyer.demo.eth', agent: A, registry: M, label: 'buyer' }).length, 4, 'unregister is default');
  assert.ok(calls.every((c) => c[2] === ''));
  assert.equal(decodeFunctionData({ abi: resolverAbi, data: txs[1].data }).args[1], ROLE_SET_TEXT);
  assert.equal(decodeFunctionData({ abi: registryAbi, data: txs[3].data }).functionName, 'unregister');
});

test('driftCheck: match, each mismatch, missing, case-insensitive addresses', async () => {
  const { driftCheck } = await import('../src/index.mjs');
  const id = '0x' + 'cd'.repeat(32);
  const ens = await readAgentPolicy(fake(A, policyRecords({ limits: { perTx: '10', daily: '50' }, merchantsHash: H, attestor: A, mandateAddress: M, mandateId: id, epoch: 3 })), 'x.eth');
  const chain = { perTxLimit: '10', periodLimit: '50', merchantsHash: H.toUpperCase().replace('0X', '0x'), attestor: A.toUpperCase().replace('0X', '0x'), mandateAddress: M.toLowerCase(), chainId: 1874, mandateId: id.toUpperCase().replace('0X', '0x'), epoch: '3' };
  const st = (rows) => Object.fromEntries(rows.map((r) => [r.field, r.status]));
  assert.ok(Object.values(st(driftCheck(ens, chain))).every((s) => s === 'MATCH'));
  const flips = { perTxLimit: ['limits.perTx', '11'], periodLimit: ['limits.perPeriod', '51'], merchantsHash: ['merchantsHash', '0x' + '00'.repeat(32)], attestor: ['attestor', R], mandateAddress: ['mandateAddress', R], chainId: ['chainId', 1], mandateId: ['mandateId', H], epoch: ['epoch', '4'] };
  for (const [k, [field, v]] of Object.entries(flips)) {
    const s = st(driftCheck(ens, { ...chain, [k]: v }));
    assert.equal(s[field], 'MISMATCH', field);
    assert.equal(Object.values(s).filter((x) => x !== 'MATCH').length, 1, field);
  }
  assert.ok(driftCheck(null, chain).every((r) => r.status === 'MISSING'));
  assert.ok(driftCheck(ens, null).every((r) => r.status === 'MISSING'));
  const sparse = await readAgentPolicy(fake(A, { [KEYS.attestor]: A }), 'x.eth');
  const s = st(driftCheck(sparse, chain));
  assert.equal(s.attestor, 'MATCH');
  assert.ok(['limits.perTx', 'epoch', 'mandateAddress', 'mandateId', 'merchantsHash'].every((f) => s[f] === 'MISSING'));
});
