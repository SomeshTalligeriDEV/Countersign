# Whitechain feedback

Only friction actually recorded in STATUS.md, docs/proof/LOOP-LOG.md, proof files and git log. Contracts are deployed on testnet 1874 and official-USDT payments have settled (docs/proof/G2-onchain.md).

## What worked (recorded)
- Published target settings (chain 1874, Solidity 0.8.30, Prague) were concrete enough to build against. `forge test` 118/118 locally (docs/proof/G1-forge-test.txt). Local test evidence only, not on-chain.
- `pnpm doctor` (2026-11-06, laptop): PASS RPC chain id 1874; PASS official USDT has code and `decimals()=6`; API health PASS (docs/proof/LOOP-LOG.md, orchestrator cycle 1).
- The official whitechain-dev SKILL.md was fetchable from GitHub (whitechain-labs/skills) and confirmed testnet-only defaults (STATUS.md).

## Friction (recorded)

- Whitechain Foundry docs page could not be fetched by the agent in either `.md` or HTML form (STATUS.md, "Live sources consulted"); the Hardhat page loaded and was used for solc 0.8.30 / Prague / chain 1874.
- Earlier sandboxed agent: Foundry 1.9.0 `forge build`/`forge test` failed resolving DNS while downloading compiler metadata from raw.githubusercontent.com (STATUS.md). Workspace network restriction, not a Whitechain fault; resolved by running on the laptop.
- The whitechain-dev skill was not in the agent's installed skill catalog; it had to be found and read manually, and its network/deployment/verification reference files were still to be read (STATUS.md).
- Docs reference `whitechainSepolia` from `viem/chains`, but viem 2.35.0 has no such chain; it ships only the legacy `whitechainTestnet` (id 2625). We defined chain 1874 ourselves in packages/shared/src/chain.mjs (docs/proof/INTEGRATION-SOURCES.md).
- Official USDT `eip712Domain()` (EIP-5267) and `version()` both revert, so the EIP-712 domain name/version needed to sign permit / EIP-3009 must be known from outside the chain; the docs do not state it (docs/proof/USDT-CAPABILITIES.md).
- The ETHGlobal prize page fetch timed out once (`curl: (28)` after 30 s) before succeeding on retry (docs/proof/PRIZE-REQUIREMENTS.md). Not a Whitechain docs fault.

## Deployment-time friction (recorded 2026-11-06)

- **Source verification outage.** `forge verify-contract --verifier blockscout` against `https://explorer.testnet.whitechain.io/api/` returned `{"message":"Contract verification is temporarily unavailable."}` on every attempt: 2026-11-06T11:20:08Z, ~11:21Z, 11:42:39Z, 12:29:12Z, 12:38:15Z (UTC). Explorer read APIs stayed up (200). Our contracts remain unverified (docs/proof/VERIFY-OUTAGE.md). A status page or ETA would have helped.
- **Base fee 5 gwei.** Our GasGuard default max fee was 1 gwei, so every pay() was denied (`gas_price_or_limit`) until we raised the cap to 10 gwei (docs/proof/G2-onchain.md, commit e1be5dd). Documenting the testnet base fee would have saved a cycle.
- **RPC flakiness.** RPC latencies 0.5–10.7 s and one TLS error (docs/proof/I2-services.md); demo run 1 first attempts failed on RPC timeouts (G6-demo-run.txt); the merchant SDK's 10 s timeout expired before a payment confirmed, so we raised it to 60 s (commit 524bc3f); the deploy script needed read retries with backoff (commits c902c43, f7850ec).
- **Observer could not keep pace per-block.** At ~1 block/s, a per-block log scan fell behind; we had to switch to ranged `getLogs` fast-forward over empty spans (commit e86b0db) plus transient-RPC retry (481af4d).
- **Getting official test USDT.** Official test USDT 0xcedfB561… could only be obtained from the Whitechain team (mint is owner-only); the Portal bridge delivers a different USDT (0xaa79…8f46), which the prize rules do not count. Clear faucet instructions for the official token would remove this blocker.

## Not yet observable (WAITING-ON-HUMAN)
Measured fee/latency figures per payment have not been compiled. No invented figures.
