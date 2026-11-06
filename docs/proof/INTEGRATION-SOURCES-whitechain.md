# Whitechain integration sources (fetched 2026-11-06)

| URL | Fetched | Used for |
|---|---|---|
| https://ethglobal.com/events/mumbai/prizes | 2026-11-06 (curl, 200, 2nd attempt; 1st timed out at 30 s) | Whitechain "Operate" and "Tokenize" qualification requirements (PRIZE-REQUIREMENTS.md) |
| https://docs.whitechain.io/llms.txt | 2026-11-06 | Page index |
| https://docs.whitechain.io/learn/network/reference.md | 2026-11-06 | Chain id 1874 (0x752), RPC `https://rpc.testnet.whitechain.io`, WS `wss://rpc.testnet.whitechain.io/ws`, explorer `https://explorer.testnet.whitechain.io`, EVM `prague`, Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, rate limit 50 rps / burst 500 / `429` + `Retry-After: 1`, "handle 429 with exponential backoff starting from Retry-After" |
| https://docs.whitechain.io/learn/network/testnet.md | 2026-11-06 | Same network params, rate-limit table |
| https://docs.whitechain.io/build/deploy/deploy-with-foundry.md | 2026-11-06 | `solc = "0.8.30"`, `evm_version = "prague"`, verifier URL `https://explorer.testnet.whitechain.io/api/` (contracts/foundry.toml already matches) |
| https://docs.whitechain.io/build/dapps/use-viem.md | 2026-11-06 | viem client setup |
| https://rpc.testnet.whitechain.io (cast, read-only) | 2026-11-06 | chain id, USDT metadata/decimals, EIP-2612 / EIP-3009 probe (USDT-CAPABILITIES.md) |

Note: the docs reference `whitechainSepolia` from `viem/chains`, but the installed viem 2.35.0 has only `whitechainTestnet` (id 2625, legacy L1 testnet, rpc-testnet.whitechain.io). Countersign therefore defines 1874 itself in `packages/shared/src/chain.mjs`.
