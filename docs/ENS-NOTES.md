# ENS notes

Status: ENS reads are REAL (read-only, Sepolia); ENS writes are UNEXECUTED.

- Live: `pnpm ens:smoke` resolved `nick.eth` via the ENS Universal Resolver on Sepolia, and the web route returned `mode:"live"` (docs/proof/F3-ens-smoke.txt). No Countersign agent subname exists yet.
- Writes: packages/ens builds PermissionedRegistry/Resolver txs (subname, text records, revoke); only encoding is tested (packages/ens/test/ens.test.mjs). `pnpm ens:setup` is keystore-only and UNEXECUTED (needs Sepolia ETH and an owned parent name).

## Friction / gaps
- ENSv2 Sepolia contract addresses are not in https://docs.ens.domains/llms-full.txt (the docs page renders them from a component). Addresses from 06-ENS-OPTIONAL.md (ETHRegistry 0xd4eb…a8b4, PermissionedResolverImpl 0x115e…2b2c) are UNVERIFIED.
- The role bitmap values (e.g. ROLE_SET_TEXT = 1<<4) and function signatures used by the tx builders come from llms-full.txt only and are UNVERIFIED against deployed bytecode.
- Context7 was unavailable (MCP unauthenticated), so no second source was checked. ENSjs not used; viem alone covers reads and encoding.

Sources: docs/proof/INTEGRATION-SOURCES.md.
