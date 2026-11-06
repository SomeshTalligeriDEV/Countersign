// ENSv2 (Sepolia) identity/policy layer for Countersign agents.
// Whitechain does not read ENS: the Mandate contract enforces signed commitments.
// ENS is the human-readable identity/policy and role layer only.
// Sources: docs/proof/INTEGRATION-SOURCES-ens.md
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, keccak256, parseAbi, toHex } from 'viem';
import { sepolia } from 'viem/chains';
import { normalize, packetToBytes } from 'viem/ens';

export const SEPOLIA_CHAIN_ID = 11155111;
export const WHITECHAIN_CHAIN_ID = 1874;
export const DEFAULT_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

export const KEYS = {
  limits: 'countersign.limits',
  merchantsHash: 'countersign.merchants',
  attestor: 'countersign.attestor',
  mandate: 'countersign.mandate', // "eip155:1874:<MandateAddress>[:<mandateId>]"
  epoch: 'countersign.epoch', // Mandate policy epoch the records were published at (decimal)
};
// Keys the agent key may update itself (scoped setter roles); policy keys stay owner-only.
export const AGENT_KEYS = ['agent-endpoint[web]', 'agent-context'];
export const ROLE_SET_TEXT = 1n << 4n;

export const registryAbi = parseAbi([
  'function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)',
  'function setResolver(uint256 anyId, address resolver)',
  'function unregister(uint256 anyId)',
]);
export const resolverAbi = parseAbi([
  'function setText(bytes name, string key, string value)',
  'function multicall(bytes[] data) returns (bytes[])',
  'function grantSetterRoles(bytes setter, address account)',
  'function revokeRoles(uint256 resource, uint256 roles, address account)',
]);

export const dnsName = (name) => toHex(packetToBytes(normalize(name)));
export const labelId = (label) => BigInt(keccak256(toHex(label)));

export function sepoliaClient(rpcUrl = DEFAULT_SEPOLIA_RPC) {
  // ccipRead disabled: server-side resolution must never follow attacker-chosen offchain gateway URLs (SSRF).
  return createPublicClient({ chain: sepolia, ccipRead: false, transport: http(rpcUrl, { timeout: 10_000 }) });
}

export function parseMandate(value) {
  const m = /^eip155:(\d+):(0x[\da-fA-F]{40})(?::(0x[\da-fA-F]{64}))?$/.exec(value ?? '');
  if (!m) return null;
  return { chainId: Number(m[1]), address: getAddress(m[2]), mandateId: m[3] ?? null };
}

/** Read agent policy text records. `client` needs getEnsAddress + getEnsText. Production passes a real viem PublicClient (Sepolia); the fake client exists only in packages/ens/test (test-only, never shipped). */
export async function readAgentPolicy(client, name) {
  const n = normalize(name);
  const [address, ...values] = await Promise.all([
    client.getEnsAddress({ name: n }),
    ...Object.values(KEYS).map((key) => client.getEnsText({ name: n, key })),
  ]);
  const raw = Object.fromEntries(Object.keys(KEYS).map((k, i) => [k, values[i] ?? null]));
  let limits = null;
  try { limits = raw.limits ? JSON.parse(raw.limits) : null; } catch { limits = null; }
  const mandate = parseMandate(raw.mandate);
  const problems = [];
  if (!address) problems.push('no address record');
  if (raw.mandate && !mandate) problems.push('malformed countersign.mandate');
  if (mandate && mandate.chainId !== WHITECHAIN_CHAIN_ID) problems.push(`mandate chainId ${mandate.chainId} is not ${WHITECHAIN_CHAIN_ID}`);
  if (raw.limits && !limits) problems.push('countersign.limits is not JSON');
  if (raw.attestor && !isAddress(raw.attestor)) problems.push('countersign.attestor is not an address');
  return { name: n, address: address ?? null, limits, merchantsHash: raw.merchantsHash, attestor: raw.attestor, mandate, raw, problems };
}

// ---- Write helpers: build tx requests only ({to, data}); executed by scripts/ens-setup.mjs via Foundry keystore. ----

/** Create a per-agent subname in the parent's UserRegistry, pointing at the agent's own resolver. */
export function buildCreateSubname({ userRegistry, label, owner, resolver, roleBitmap, expiry }) {
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error('label must be a single normalized label');
  if (typeof expiry !== 'bigint' || expiry <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('expiry must be an absolute future uint64 timestamp');
  return { to: getAddress(userRegistry), data: encodeFunctionData({ abi: registryAbi, functionName: 'register', args: [label, getAddress(owner), '0x0000000000000000000000000000000000000000', getAddress(resolver), roleBitmap, expiry] }) };
}

export function buildSetResolver({ registry, label, resolver }) {
  return { to: getAddress(registry), data: encodeFunctionData({ abi: registryAbi, functionName: 'setResolver', args: [labelId(label), getAddress(resolver)] }) };
}

export function policyRecords({ limits, merchantsHash, attestor, mandateAddress, mandateId, epoch }) {
  if (!isAddress(attestor) || !isAddress(mandateAddress)) throw new Error('attestor and mandateAddress must be addresses');
  if (!/^0x[\da-fA-F]{64}$/.test(merchantsHash)) throw new Error('merchantsHash must be bytes32');
  return {
    [KEYS.limits]: JSON.stringify(limits),
    [KEYS.merchantsHash]: merchantsHash,
    [KEYS.attestor]: getAddress(attestor),
    [KEYS.mandate]: `eip155:${WHITECHAIN_CHAIN_ID}:${getAddress(mandateAddress)}${mandateId ? `:${mandateId}` : ''}`,
    ...(epoch != null && epoch !== '' ? { [KEYS.epoch]: String(BigInt(epoch)) } : {}),
  };
}

/** One multicall tx setting all given text records on the agent's resolver. */
export function buildSetTexts({ resolver, name, records }) {
  const dns = dnsName(name);
  const calls = Object.entries(records).map(([key, value]) => encodeFunctionData({ abi: resolverAbi, functionName: 'setText', args: [dns, key, value] }));
  return { to: getAddress(resolver), data: encodeFunctionData({ abi: resolverAbi, functionName: 'multicall', args: [calls] }) };
}

/** Grant the agent key ROLE_SET_TEXT scoped to one key (never root, never ALL_ROLES). */
export function buildGrantAgentKey({ resolver, agent, key }) {
  if (!AGENT_KEYS.includes(key)) throw new Error(`agent may only be granted ${AGENT_KEYS.join(', ')}`);
  const setter = encodeFunctionData({ abi: resolverAbi, functionName: 'setText', args: ['0x', key, ''] });
  return { to: getAddress(resolver), data: encodeFunctionData({ abi: resolverAbi, functionName: 'grantSetterRoles', args: [setter, getAddress(agent)] }) };
}

/** Owner revoke: clear policy AND agent-writable records, revoke the agent's roles, and unregister the subname by default.
 * Unregister is the authoritative revocation: the revokeRoles resource below is UNVERIFIED against the deployed
 * resolver's grantSetterRoles derivation, so it must not be relied on alone (check hasRoles on-chain before trusting it). */
export function buildRevoke({ resolver, name, agent, registry, label, unregister = true }) {
  const cleared = [...Object.values(KEYS), ...AGENT_KEYS];
  const txs = [buildSetTexts({ resolver, name, records: Object.fromEntries(cleared.map((k) => [k, ''])) })];
  for (const key of AGENT_KEYS) txs.push({ to: getAddress(resolver), data: encodeFunctionData({ abi: resolverAbi, functionName: 'revokeRoles', args: [BigInt(keccak256(toHex(key))), ROLE_SET_TEXT, getAddress(agent)] }) });
  if (unregister) txs.push({ to: getAddress(registry), data: encodeFunctionData({ abi: registryAbi, functionName: 'unregister', args: [labelId(label)] }) });
  return txs;
}

/** Compare ENS-published policy (readAgentPolicy result, or null) with an on-chain Mandate snapshot (or null).
 * Fail closed: any side absent/unparseable => MISSING, never MATCH. Whitechain cannot read ENS; ENS only mirrors. */
export function driftCheck(ens, chain) {
  const lim = ens?.limits && typeof ens.limits === 'object' ? ens.limits : {};
  const m = ens?.mandate ?? null;
  const num = (v) => { try { return v == null || v === '' ? null : BigInt(v).toString(); } catch { return null; } };
  const str = (v) => (typeof v === 'string' && v ? v.toLowerCase() : null);
  const rows = [
    ['limits.perTx', num(lim.perTx), num(chain?.perTxLimit)],
    ['limits.perPeriod', num(lim.perPeriod ?? lim.daily), num(chain?.periodLimit)],
    // ponytail: Mandate stores merchants as a mapping, not a hash; chain side is MISSING unless the caller supplies merchantsHash.
    ['merchantsHash', str(ens?.merchantsHash), str(chain?.merchantsHash)],
    ['attestor', str(ens?.attestor), str(chain?.attestor)],
    ['mandateAddress', str(m?.address), str(chain?.mandateAddress)],
    ['chainId', m ? String(m.chainId) : null, chain?.chainId != null ? String(chain.chainId) : null],
    ['mandateId', str(m?.mandateId), str(chain?.mandateId)],
    ['epoch', num(ens?.raw?.epoch), num(chain?.epoch)],
  ];
  return rows.map(([field, e, c]) => ({ field, ens: e, chain: c, status: e == null || c == null ? 'MISSING' : e === c ? 'MATCH' : 'MISMATCH' }));
}
