# D1 preflight — 2026-11-06 15:05 IST — ABORTED: WAITING-ON-HUMAN

Executed: `cast chain-id` → 1874. `pnpm doctor`: PASS RPC/chain 1874, official USDT code + decimals=6, API health, git clean; FAIL deployer WBT/USDT, Mandate/Registry code, allowance, mandate budget, World config, attestor, relayer flags.
Also re-run: pnpm test 93/93, forge 118/118, world:smoke PASS, ens:smoke PASS.

Missing human inputs (19-DEPLOY-VERIFY-LOOP.md "Your inputs first"):
1. Keystores: none of `deployer`, `agent`, `ens-owner` exist (`cast wallet list` shows only `pactra-deployer`, not used).
2. Funding: cannot check; no deployer address.
3. `.env`: absent.
4. World sandbox app: not registered (no WORLD_CLIENT_ID).
5. Git remote: none (`git remote -v` empty) → D10 remote CI impossible.
6. Docker: daemon down (colima socket missing) → D9 must deploy from source.

Consequence: D2–D10 not started. D11/D12 unchanged from loop 18 (docs/proof/FINAL-LOOP-SUMMARY.md). Nothing broadcast.
