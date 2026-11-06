// ENS writes on SEPOLIA ONLY. UNEXECUTED until a human runs it (needs Sepolia ETH + an owned ENSv2 parent name).
// Signs via Foundry keystore (`cast send --account $ENS_KEYSTORE_ACCOUNT`); never takes a raw key.
// Default is a dry run that prints the txs. Pass --execute to send. Pass --revoke for the owner revoke flow.
// Prereqs (see docs/proof/HUMAN-RUN-ens.md): parent registered, UserRegistry deployed + setSubregistry done,
// a per-agent PermissionedResolver deployed via VerifiableFactory (owner holds root roles).
import { execFileSync } from 'node:child_process';
import { buildCreateSubname, buildSetTexts, buildGrantAgentKey, buildRevoke, policyRecords, AGENT_KEYS, SEPOLIA_CHAIN_ID } from '../packages/ens/src/index.mjs';

const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`missing ${k}`); return v; };
const execute = process.argv.includes('--execute'), revoke = process.argv.includes('--revoke');
const rpc = env('ENS_SEPOLIA_RPC_URL'), account = env('ENS_KEYSTORE_ACCOUNT');
const parent = env('ENS_PARENT_NAME'), label = env('ENS_AGENT_LABEL'), name = `${label}.${parent}`;
const userRegistry = env('ENS_USER_REGISTRY'), resolver = env('ENS_AGENT_RESOLVER');
const owner = env('ENS_OWNER_ADDRESS'), agent = env('ENS_AGENT_ADDRESS');

let txs;
if (revoke) txs = buildRevoke({ resolver, name, agent, registry: userRegistry, label, unregister: !process.argv.includes('--keep-name') });
else {
  const ROLE_SET_RESOLVER = 1n << 24n; // RegistryRolesLib.ROLE_SET_RESOLVER, verified against the Sepolia UserRegistryImpl source (1<<12 is ROLE_UNREGISTER)
  txs = [
    buildCreateSubname({ userRegistry, label, owner, resolver, roleBitmap: BigInt(process.env.ENS_ROLE_BITMAP ?? ROLE_SET_RESOLVER), expiry: BigInt(Math.floor(Date.now() / 1000) + 30 * 86400) }),
    buildSetTexts({ resolver, name, records: policyRecords({ limits: JSON.parse(env('ENS_POLICY_LIMITS')), merchantsHash: env('ENS_MERCHANTS_HASH'), attestor: env('ENS_ATTESTOR_ADDRESS'), mandateAddress: env('ENS_MANDATE_ADDRESS'), mandateId: process.env.ENS_MANDATE_ID, epoch: process.env.ENS_EPOCH }) }),
    ...AGENT_KEYS.map((key) => buildGrantAgentKey({ resolver, agent, key })),
  ];
}
console.log(`${execute ? 'EXECUTE' : 'DRY RUN'} ${revoke ? 'revoke' : 'setup'} for ${name}`);
for (const tx of txs) console.log(JSON.stringify(tx));
if (!execute) process.exit(0);
const chainId = Number(execFileSync('cast', ['chain-id', '--rpc-url', rpc]).toString().trim());
if (chainId !== SEPOLIA_CHAIN_ID) throw new Error(`refusing: RPC chainId ${chainId} is not Sepolia`);
for (const tx of txs) console.log(execFileSync('cast', ['send', tx.to, tx.data, '--account', account, ...(process.env.ENS_PASSWORD_FILE ? ['--password-file', process.env.ENS_PASSWORD_FILE] : []), '--rpc-url', rpc], { stdio: ['inherit', 'pipe', 'inherit'] }).toString());
