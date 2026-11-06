// Single Whitechain Sepolia definition (viem Chain shape) for web and backend.
// Source: https://docs.whitechain.io/learn/network/reference.md (fetched 2026-11-06).
// ponytail: viem/chains `whitechainTestnet` is the legacy L1 testnet (id 2625), so we define 1874 here.
export const USDT_ADDRESS = '0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7';
export const EXPLORER_URL = 'https://explorer.testnet.whitechain.io';
export const whitechainSepolia = Object.freeze({
  id: 1874,
  name: 'Whitechain Sepolia',
  nativeCurrency: { name: 'WBT', symbol: 'WBT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.whitechain.io'], webSocket: ['wss://rpc.testnet.whitechain.io/ws'] } },
  blockExplorers: { default: { name: 'Whitechain Explorer', url: EXPLORER_URL, apiUrl: `${EXPLORER_URL}/api` } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
  testnet: true,
});
/** Same chain with a custom RPC (e.g. hackathon Ankr endpoint); id/explorer never change. */
export const withRpc = url => ({ ...whitechainSepolia, rpcUrls: { default: { http: [url] } } });
const hex = (value, length) => typeof value === 'string' && new RegExp(`^0x[\\da-fA-F]{${length}}$`).test(value);
export function explorerTx(hash) { if (!hex(hash, 64)) throw new Error('invalid_tx_hash'); return `${EXPLORER_URL}/tx/${hash}`; }
export function explorerAddress(address) { if (!hex(address, 40)) throw new Error('invalid_address'); return `${EXPLORER_URL}/address/${address}`; }
