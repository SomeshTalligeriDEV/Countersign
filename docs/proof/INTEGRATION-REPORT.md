# Integration report: REAL vs FIXTURE vs MISSING (updated 2026-11-07)

Sources: G2-onchain.md, G6-demo-run.txt, ACCEPTANCE.md, A11-webhooks.txt, A12-payments.csv, VERIFY-OUTAGE.md, deployed.json, I2-services.md, I7-ci-local.txt, F2-world-smoke.txt, F3-ens-smoke.txt, A15-ens-onchain.md, A15-ens-live.txt, I6-live-url.txt, USDT-CAPABILITIES.md, git log. Explorer: `https://explorer.testnet.whitechain.io`.

Key: **REAL** = executed against the live network/service (tx link or log). **FIXTURE** = local tests/mocks only. **MISSING** = not done. **BLOCKED** = attempted, external cause. **WAITING-ON-HUMAN** = needs a human step.

Web is hosted on Vercel (https://web-rouge-one-10.vercel.app, all routes 200 in I6-live-url.txt). Services (API + relayer + GasGuard, attestor, observer, demo merchant) run on the build laptop behind a Cloudflare quick tunnel (https://detector-absorption-calculate-methodology.trycloudflare.com); they are live only while the laptop and tunnel are up. Public repo: https://github.com/SomeshTalligeriDEV/ETHGLOBAL (CI green).

## Whitechain (testnet, chain 1874)

| Claim | Status | Evidence |
|---|---|---|
| MerchantRegistry deployed | REAL | [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2), deploy tx [0x3bf2…d707](https://explorer.testnet.whitechain.io/tx/0x3bf28526ba2ac7629d0b70c030d1f64cd2ba873aa634a1b240a867df9a2cd707), block 12366488 (G2-onchain.md) |
| Mandate deployed (constructor: official USDT + registry) | REAL | [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA), deploy tx [0x6351…3a91](https://explorer.testnet.whitechain.io/tx/0x6351883c2e30cf2dbb6d247701b8f2e8cfe36f300ca007c7ec8b2a75fb503a91), block 12366502 |
| Source verified on explorer | **REAL (VERIFIED 2026-11-06T17:55:24Z)** | both "Pass - Verified" via forge verify-contract; earlier Blockscout returned `{"message":"Contract verification is temporarily unavailable."}` on 5 attempts, 2026-11-06T11:20:08Z → 12:38:15Z UTC (VERIFY-OUTAGE.md); deployed.json now `verified: true` |
| Setup: registerMerchant, createMandate, setLimits, allowMerchant, limited allowance | REAL | tx links in G2-onchain.md (e.g. createMandate [0x7f75…660e](https://explorer.testnet.whitechain.io/tx/0x7f7581a8413444805059d798e72103759fd4c7b5ab195c10776a6fb2c5b1660e), allowance 0.50 [0xb735…b66f](https://explorer.testnet.whitechain.io/tx/0xb735124308b0d9cdc32fff984a684e854fff1f8ca6a6473db3955375b0a5b66f), raised to 5.00 cap [0x6a62…07fc](https://explorer.testnet.whitechain.io/tx/0x6a62ff95d9a08c50b703885d44269ffcf9a41df3ced67725fda2fcbcd0c607fc)) |
| First payment in official USDT 0xcedfB561… | REAL | pay() 0.50 USDT [0x6862…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021); Transfer event token 0xcedfB561… owner → payout 0x5C9C…5581 |
| Relayed (sponsored) payments via API + GasGuard; agent holds 0 USDT / 0 WBT | REAL | [0x80a2…8078](https://explorer.testnet.whitechain.io/tx/0x80a23cc2a8da4d8209f5dc2cb2c479874ab175332e052b04d9ad31e043e48078), [0x713f…39ae](https://explorer.testnet.whitechain.io/tx/0x713fdfa883b7ed7acaebfc5a281f9a77c7cb10cc0622f6626c07420b677939ae), [0xcc8d…9eb3](https://explorer.testnet.whitechain.io/tx/0xcc8d0d3d0941fa8e2072f8a08dbc45e9e664fbc82ebcae435a295cb248089eb3) |
| On-chain reverts (contract rejects) | REAL | BadIntentSig [0xac0d…f17f](https://explorer.testnet.whitechain.io/tx/0xac0dc1c00dbd1b738b9f8c959b4375dd696dce9a9f139c76f0bf0c94484df17f), RegistryMismatch [0xebf5…217f](https://explorer.testnet.whitechain.io/tx/0xebf520a6cccc825ec3b9f383299731552198715c8be98d0f3a912ffc3bd8217f), OverPerTx [0x4759…464c](https://explorer.testnet.whitechain.io/tx/0x47599f29d943ac96b708f43655c8aa4b2b55ab640173e2b260d491c13bbb464c), Paused [0x644f…e2dd](https://explorer.testnet.whitechain.io/tx/0x644fcc28e568e049191c6f6ac12999c17c179c0f4c00d003f03e5bf658f6e2dd), OverRefund [0x5a5a…eec7](https://explorer.testnet.whitechain.io/tx/0x5a5a7c5116bab528b518f018713f45b8d35311e86ad4bd99bbfa8f7fc637eec7) (G6-demo-run.txt, ACCEPTANCE.md) |
| API pre-flight rejections (no broadcast): bad_intent_sig, OverPerTx, StaleEpoch, not_allowlisted_call | REAL (API log, not tx) | G6-demo-run.txt runs 1+2 |
| Revoke, pause/unpause, refund 0.25 | REAL | revoke [0x6d7b…f084](https://explorer.testnet.whitechain.io/tx/0x6d7b2c0c3e3c5de6c1a2e69a184208155195dd81ad8707e295502a80cbf1f084), pause [0x75b3…6737](https://explorer.testnet.whitechain.io/tx/0x75b30ba11e2cc97b314b30dfb84ee59544bb0dd3a28438edffa522e79d8c6737), refund [0x921d…6fe3](https://explorer.testnet.whitechain.io/tx/0x921d428645cbf91100523d79be8dc102aacccec8f354aaca343f576d8b706fe3) |
| GasGuard real denial (1 gwei cap < 5 gwei base fee) | REAL | G2-onchain.md I2/D5 |
| Six-step demo twice | REAL, 5/6 per run | G6-demo-run.txt; order-40 (World approval) waited in those runs; later settled via real sandbox sign-in (A2-world-approval.md) |
| Webhooks delivered + HMAC verified, forged sig 401 | REAL (local) | A11-webhooks.txt: 5 events |
| CSV export of real payments | REAL (local API) | A12-payments.csv: 4 payments |
| Receipt matches Mandate.payments() storage | REAL | ACCEPTANCE.md A13 |
| Owner dashboard actions via real wallet | WAITING-ON-HUMAN | ACCEPTANCE.md A14 |
| Over-limit payment approved by human then settled | REAL | ACCEPTANCE.md A2, A2-world-approval.md |
| Registry change after approval reverts (live) | MISSING (NOT RUN) | ACCEPTANCE.md A7; FIXTURE forge test only |
| Contract suite | FIXTURE | forge 118/118, `pnpm test` 97/97 (I7-ci-local.txt) |
| USDT permit / EIP-3009 | REAL read-only probe, not used | USDT-CAPABILITIES.md |
| Public hosting | PARTIAL | web REAL on Vercel; backend via Cloudflare quick tunnel from build laptop (not durable); I6-live-url.txt |

## World (Agent Pass / OIDC)

| Claim | Status | Evidence |
|---|---|---|
| Sandbox + production discovery, PKCE S256, RS256, JWKS kid resolves | REAL read-only | F2-world-smoke.txt (RESULT PASS both issuers) |
| Backend token validation (jose/JWKS, iss/aud/nonce, auth_time ≤120 s, owner binding) | REAL (sandbox) + FIXTURE | A2-world-approval.md; signed local JWT tests (I7-ci-local.txt: "Signed local JWT fixtures passed; NOT real World verification.") |
| Real user sign-in, approval, settled payment | REAL (sandbox, mocked identities per World) | CIMD public client (portal returned `account_not_eligible`), Cloudflare quick tunnel; tx 0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531; A2-world-approval.md, ACCEPTANCE A2 |
| Failure paths (stale_auth after real sign-in; expired approval) | REAL | `approval_not_ready` / `expired`, no pay() sent (relay_transactions stayed 4); ACCEPTANCE A16 |
| IDKit | MISSING (not built) | — |
| Device flow | FIXTURE, not routed | apps/api/src/world-device.mjs |

## ENS (Sepolia)

| Claim | Status | Evidence |
|---|---|---|
| Live read via Universal Resolver + web route `mode:"live"` | REAL read-only | F3-ens-smoke.txt (`nick.eth`) |
| `countersign.eth` registered on ENSv2 Sepolia with our own UserRegistry subregistry | REAL | [A15-ens-onchain.md](A15-ens-onchain.md) |
| `agent1.countersign.eth` with its own PermissionedResolver; addr = agent 0x91E3…A293 | REAL | [A15-ens-onchain.md](A15-ens-onchain.md) |
| Policy text records (limits, merchants, attestor, mandate, epoch) | REAL | [A15-ens-onchain.md](A15-ens-onchain.md) |
| Agent key scoped to two records via grantSetterRoles (Enhanced Access Control) | REAL | [A15-ens-onchain.md](A15-ens-onchain.md) |
| Live drift check vs Whitechain Mandate | REAL: 7/8 MATCH; merchantsHash MISSING by design (Mandate stores a mapping) | [A15-ens-live.txt](A15-ens-live.txt) |
| Revoke (ENS clear + Mandate epoch bump) | BUILT, UNEXECUTED (keeps demo name live) | `pnpm ens:setup -- --revoke` |
| Contract reads ENS | No (by design) | ENS is identity/policy display only |
