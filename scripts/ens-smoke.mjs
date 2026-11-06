// READ-ONLY ENS smoke test on Sepolia over a public RPC. No keys, no writes.
import { readAgentPolicy, sepoliaClient, DEFAULT_SEPOLIA_RPC } from '../packages/ens/src/index.mjs';
const rpc = process.env.ENS_SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC;
const name = process.argv[2] || process.env.ENS_SMOKE_NAME || 'nick.eth';
const client = sepoliaClient(rpc);
console.log(`date: ${new Date().toISOString()}\nrpc: ${rpc}\nchainId: ${await client.getChainId()}\nname: ${name}`);
const policy = await readAgentPolicy(client, name);
const url = await client.getEnsText({ name: policy.name, key: 'url' });
console.log(JSON.stringify({ address: policy.address, url, countersignRecords: policy.raw }, null, 2));
if (!policy.address) { console.log('FAIL: no address resolved'); process.exit(1); }
console.log('PASS: resolved via ENS Universal Resolver on Sepolia');
