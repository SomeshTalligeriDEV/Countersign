# Countersign

Bounded USDT payments for AI agents, targeting Whitechain Sepolia (1874). A treasury owner defines a mandate; its agent signs exact payment terms. The contract checks merchant payout/version, limits, nonce, order, epoch and expiry. Payments at the human threshold additionally require a fresh World identity attestation and owner-wallet approval.

**Status (2026-11-06):** contracts are deployed on Whitechain testnet (1874) and real official-USDT payments have settled ([INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md)). Both contracts are source-verified on Blockscout (2026-11-06T17:55:24Z, after an explorer outage: [VERIFY-OUTAGE.md](docs/proof/VERIFY-OUTAGE.md)). The services (API, relayer, attestor, observer, demo merchant) run **locally only and are not yet publicly hosted**. Real World sign-in works against the World sandbox issuer (mocked identities per World) via a CIMD public client over a Cloudflare quick tunnel: a 1.50 USDT human-approved payment settled ([0x98fa…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531)) and two real failure paths sent no payment ([A2-world-approval.md](docs/proof/A2-world-approval.md)); ENS is read-only (no writes). See [STATUS.md](STATUS.md).

## Live on Whitechain testnet

| | Address / tx |
|---|---|
| MerchantRegistry | [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2) (deploy [0x3bf2…d707](https://explorer.testnet.whitechain.io/tx/0x3bf28526ba2ac7629d0b70c030d1f64cd2ba873aa634a1b240a867df9a2cd707)) |
| Mandate | [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA) (deploy [0x6351…3a91](https://explorer.testnet.whitechain.io/tx/0x6351883c2e30cf2dbb6d247701b8f2e8cfe36f300ca007c7ec8b2a75fb503a91)) |
| Official USDT | 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7 |
| First real payment (0.50 official USDT) | [0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) |
| Source verification | VERIFIED both contracts 2026-11-06T17:55:24Z (earlier attempts hit an explorer outage: [VERIFY-OUTAGE.md](docs/proof/VERIFY-OUTAGE.md)) |

Feature acceptance on the live chain: [ACCEPTANCE.md](docs/proof/ACCEPTANCE.md) (13 PASS incl. webhooks and World A2/A16, A15 partial, A7 not run, A14 WAITING-ON-HUMAN). Six-step demo run twice, 5/6 PASS each (order-40 waited on World; later approved for real, see A2-world-approval.md): [G6-demo-run.txt](docs/proof/G6-demo-run.txt). All setup txs: [G2-onchain.md](docs/proof/G2-onchain.md).

## Why on-chain stablecoin settlement on Whitechain

The agent's spending limits, merchant payout binding, replay protection and the human-approval threshold are enforced by the Mandate contract at the moment USDT moves, so neither the agent, the relayer nor our API can exceed them; a card or bank rail would only let us enforce these rules in our own server, which the agent's operator must trust, and could not give the merchant a final, publicly verifiable settlement it can check on the explorer. Whitechain is targeted for low-cost sponsored payments in official USDT; no measured fee/latency figures exist yet.

## Setup

Node >=24.10, pnpm, Foundry, Solidity 0.8.30.

```sh
pnpm test                         # root Node suite: 93 pass, 0 fail (2026-11-06)
forge test --root contracts -vvv  # 118 pass (docs/proof/G1-forge-test.txt)
pnpm doctor                       # read-only chain/token/config checks
pnpm world:smoke                  # live World discovery + JWKS (read-only)
pnpm ens:smoke                    # live ENS read on Sepolia (read-only)
npm ci --prefix web && npm --prefix web run dev
```

Copy env examples to gitignored service-specific files. API/attestor do not load dotenv; use `node --env-file=.env src/server.mjs`. ATTESTOR_KEY belongs only to apps/attestor, RELAYER_KEY only to apps/api. Web needs COUNTERSIGN_API_URL (and COUNTERSIGN_PUBLIC_API_URL for browser World links). Never put keys in NEXT_PUBLIC variables. Testnet only; no substitute USDT outside local tests.

## Architecture

- `contracts`: MerchantRegistry and Mandate (official USDT fixed in deploy scripts).
- `apps/api`: SQLite persistence, HTTP validation, World OIDC, observer, owner setup, relayer + GasGuard.
- `apps/attestor`: separate loopback process; authenticated approval-ID requests, DB digest recomputation, single-use signing.
- `packages/shared`: single Whitechain 1874 chain definition, EIP-712 definitions, digest vectors, exact decimal arithmetic.
- `packages/merchant` / `packages/agent`: x402-style custom payment terms and signed intents (not the standard x402 exact scheme).
- `packages/ens`: ENSv2 policy reads (viem, Sepolia) and write tx builders.
- `apps/demo-merchant` / `apps/demo-agent`: demo report endpoint and agent CLI.
- `web`: owner, approval, receipt, merchant, demo pages and landing.

Submitted is not settled: the observer requires three subsequent blocks and reads contract logs before projecting payment status. WebSockets send read-only invalidations; clients then fetch authoritative data, with polling fallback.

## Whitechain

| Piece | Mode | Proof |
|---|---|---|
| Chain 1874, RPC, explorer, solc 0.8.30, prague | REAL config | packages/shared/src/chain.mjs; [INTEGRATION-SOURCES.md](docs/proof/INTEGRATION-SOURCES.md); relay-errors test `single chain definition matches official Whitechain Sepolia docs` |
| Official USDT metadata, 6 decimals | REAL read-only | [USDT-CAPABILITIES.md](docs/proof/USDT-CAPABILITIES.md) (cast calls) |
| USDT EIP-2612 permit / EIP-3009 present | REAL read-only probe | USDT-CAPABILITIES.md; no signed permit/3009 transfer executed (UNEXECUTED). Countersign uses approve + transferFrom |
| Mandate / MerchantRegistry contracts | REAL deployed; forge 118/118 locally | addresses above; source verified on Blockscout |
| USDT payment, explorer link | REAL | first pay() [0x6862…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) + 3 relayed payments ([A12-payments.csv](docs/proof/A12-payments.csv)) |
| Relayer + GasGuard sponsored pay(), agent holds 0 USDT / 0 WBT | REAL | [G2-onchain.md](docs/proof/G2-onchain.md) I2/D5, [G6-demo-run.txt](docs/proof/G6-demo-run.txt) |
| On-chain reverts (BadIntentSig, RegistryMismatch, OverPerTx, Paused, OverRefund) | REAL | tx links in [INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md) |
| Refund, revoke, pause, webhooks (HMAC), CSV, receipt == chain | REAL (services local) | [ACCEPTANCE.md](docs/proof/ACCEPTANCE.md), [A11-webhooks.txt](docs/proof/A11-webhooks.txt) |
| Public hosting of services | MISSING | runs on loopback only |
| RPC error handling (429, nonce, replacement) | FIXTURE (mocked RPC) | apps/api/test/relay-errors.test.mjs |

## World

| Piece | Mode | Proof |
|---|---|---|
| Sandbox + production discovery, PKCE S256, RS256 JWKS, auth_time, device grant endpoint | REAL read-only | [F2-world-smoke.txt](docs/proof/F2-world-smoke.txt): RESULT PASS for both issuers |
| Code + PKCE, `max_age=0`, jose JWT/JWKS checks, owner binding | REAL (sandbox) + FIXTURE tests | [A2-world-approval.md](docs/proof/A2-world-approval.md); apps/api/test/world-http, owner-binding, approvals tests |
| CIMD public client (client metadata served by our API, PKCE without secret; scope `openid offline_access`) | REAL (sandbox, Cloudflare quick tunnel) | apps/api/src/world-cimd.mjs, world-oidc.mjs, server.mjs; portal registration returned `account_not_eligible` |
| Device flow (headless) | FIXTURE; implemented in apps/api/src/world-device.mjs, not yet routed in server.mjs | world-device test `FIXTURE device flow polls pending/slow_down, verifies nonce-less token, rejects 503 and denial` |
| Real user sign-in, over-limit approval, failure paths | REAL (sandbox; mocked identities per World) | success [0x98fa…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531); stale_auth after real sign-in → `approval_not_ready`, no tx; expired approval → no tx ([A2-world-approval.md](docs/proof/A2-world-approval.md), ACCEPTANCE A2/A16) |
| IDKit | not built | — |

## ENS

| Piece | Mode | Proof |
|---|---|---|
| Policy read via ENS Universal Resolver (viem, Sepolia) | REAL read-only | [F3-ens-smoke.txt](docs/proof/F3-ens-smoke.txt): `nick.eth` PASS, plus web route `mode:"live"` |
| UI badge Live/Fixture | REAL mode flag | web/src/components/countersign/EnsIdentity.tsx |
| Subname, resolver, text records, revoke tx builders | FIXTURE (encoding tests only) | packages/ens/test/ens.test.mjs |
| Countersign agent policy read-back | PARTIAL (read-only; no subname exists) | ACCEPTANCE.md A15 |
| `pnpm ens:setup` writes on Sepolia | UNEXECUTED (needs Sepolia ETH + owned parent) | scripts/ens-setup.mjs; [ENS-NOTES.md](docs/ENS-NOTES.md) |

## Security properties mapped to tests

Executed 2026-11-06 on the laptop: forge 118 passed / 0 failed / 6 suites ([G1-forge-test.txt](docs/proof/G1-forge-test.txt)); `pnpm test` 93 pass / 0 fail. Local tests against mocks/fixtures, not deployed-chain evidence. Mandate tests are inherited by other suites, so names repeat.

| Property | Forge tests (contracts/test) | Node tests (apps/api/test) |
| --- | --- | --- |
| Only owner funds move; attacker cannot use victim allowance | `testT01AttackerCannotUseVictimAllowance`, `testSmallPaymentMovesOnlyOwnerFunds` | |
| Tampered amount/payout/version, inactive merchant | `testT02TamperedAmount`, `testT03TamperedPayout`, `testT04PayoutVersionChanged`, `testT05InactiveMerchant`, `testRiskRegistryChangeSameBlockRejectsCachedTerms`; MerchantRegistry: `testStrangerCannotRedirectPayout`, `testDuplicateCannotTakeOwnership`, `testVersionInvalidatesTermsOnEveryChange` | facilitator: `A-01 tampered signed intent never broadcasts` |
| Spend limits, period accounting | `testT06HardPerTransactionCap`, `testT07CumulativePeriodCap`, `testT08LimitChangePreservesSpend`, `testT08RaisedLimitAllowsOnlyUnspentRemainder`, `testT09PeriodRolloverPreservesHistory`, `testLoweredBudgetSaturatesRemainingWithoutResettingSpent`, `testRiskPeriodBoundaryExactly`, `invariant_T30AccountingReplayAndRefundBounds` (256 runs) | |
| Replay / order dedup / revocation | `testT10NonceReplay`, `testT11DuplicateOrderNewNonce`, `testZeroAmountCannotBypassOrderDeduplication`, `testT16RevocationRejectsUnusedIntent`, `testT16RevocationRejectsFullySignedHumanApproval`, `testT17PolicyChangesInvalidateFullApproval`, `testRiskRevokeFrontRunsInFlightPayment`, `testRiskThirdPartyCannotGriefNonceWithInvalidSignature` | facilitator: `successful broadcast is submitted, never prematurely settled; duplicate is blocked` |
| Human threshold: owner + attestor, freshness | `testT12HumanThresholdRequiresOwner`, `testT13AttestationMustBindOwnerApproval`, `testT14WrongAttestorCannotApprove`, `testT15StaleAndFutureAuthentication`, `testHumanApprovalSettlesExactDigest`, `testRiskMalformedHumanSignaturesCannotConsumeIntent` | facilitator: `threshold payment cannot use automatic path`; approval-service: `missing verified owner binding cannot create a human approval`; attestor-client: `API authenticates attestor, verifies signature and recovers lost response without re-signing` (FIXTURE identities) |
| Expiry / pause / allowlist / domain separation / malleability | `testT18ExpiredIntent`, `testT19ExpiredMandate`, `testT20PausedMandate`, `testT21MerchantNotAllowed`, `testT22DifferentChainSignatureRejected`, `testT22DifferentContractSignatureRejected`, `testT23MalleableSignatureRejected`, `testRiskMalformedAndOversizedAgentSignatures` | |
| Reentrancy, atomic rollback, ERC-1271 | `testT24ReentrantTokenCannotExecuteSecondPayment`, `testT25InsufficientAllowanceRollsBackAllEffects`, `testRiskAllowanceExhaustedMidSequenceRollsBack`, `testRiskRevertingPayoutDoesNotReceiveNativeCallback`, `testT29SmartWalletOwnerApprovesExactDigest` | |
| Refunds and admin auth | `testT26UnauthorizedRefund`, `testT27RefundCannotExceedPaymentOrRestoreBudget`, `testRiskRefundAfterRevokeAndPausePreservesSpend`, `testT28AllAdministrativeCallsRequireOwner` | observer: `confirmed refund updates payment and invalid refund rolls back cursor and outbox` |
| Off-chain/on-chain digest parity | `testA14SharedFixedDigestVectors` | |
| World sign-in transport (FIXTURE only) | | world-http: `World browser routes set secure binding cookie and clear it on callback`, `World callback rejects missing browser cookie and duplicate parameters before verifier`; owner-binding: `owner binding requires verified identity plus matching wallet and forbids rebinding` |
| RPC errors: 429 retries identical signed bytes, nonce/replacement never re-signed | | relay-errors: `429 rebroadcasts identical bytes after Retry-After, then submits`, `persistent 429 leaves outcome unknown for recovery, no new signature`, `nonce too low and replacement underpriced are recorded, never retried or re-signed`, `already known means the same signed tx is in the mempool` |
| Client IP only from trusted proxy | | client-ip: `forwarded client IP is honoured only from TRUSTED_PROXY_IPS and only when valid` |

## Relayer and GasGuard

The relayer ([apps/api/src/facilitator.mjs](apps/api/src/facilitator.mjs)) only submits `pay` calls to the Mandate after authoritative simulation; the agent holds no gas token. GasGuard ([apps/api/src/gasguard.mjs](apps/api/src/gasguard.mjs)) enforces allowlisted target/selector, per-mandate and global gas budgets, fee caps and pause. Tests: gasguard `A-02/A-03 deny arbitrary calls and failed simulations with audit records`, `A-04 reservations survive restart and prevent budget overspend and duplicates`, `pause, fee caps and global budget fail closed`; facilitator `A-03 authoritative simulation rejection never broadcasts`; relay-ledger `relay persists before broadcast and restart rebroadcasts identical signed bytes`, `recovery retains unknown nonce outcome instead of signing or spending again`. These tests run against mocked RPC; on the live chain the relayer has broadcast sponsored pay() calls and GasGuard has issued real denials (`gas_price_or_limit`, `not_allowlisted_call`), see [G2-onchain.md](docs/proof/G2-onchain.md) and [G6-demo-run.txt](docs/proof/G6-demo-run.txt).

## Limitations

- Contracts deployed and source-verified. Services not publicly hosted. World sign-in is sandbox-only (mocked identities) through a Cloudflare quick tunnel, not production `auth.world.org`; IDKit not built. No ENS write, public repo or video yet.
- Reservations cover execution gas, not complete OP fee components. Single relayer process/signer required.
- Automatic deep-reorg recovery, multi-process production and identity recovery/rebinding are unfinished. Webhooks deliver only to an operator-configured URL.
- Browser tests use a mocked wallet (W5 Playwright 8/8 FIXTURE, docs/proof/W5-playwright.txt); real-wallet run not done.
- Contracts do not read ENS; ENS is identity/policy display.
- No independent audit or production-security claim. Off-chain merchant billing is a proposed business model, not implemented.
- NO-DUMMY audit: [DUMMY-AUDIT.md](docs/proof/DUMMY-AUDIT.md) (non-web), [DUMMY-AUDIT-web.md](docs/proof/DUMMY-AUDIT-web.md) (web).

## Deployment and submission

[HUMAN-RUN.md](docs/proof/HUMAN-RUN.md) has deploy/verify/first-payment, World and browser steps. Addresses and tx links above come from docs/proof/deployed.json and G2-onchain.md. No hosted URLs exist yet. `pnpm evidence` regenerates the block below from deployed.json. Prize mapping: [PRIZE-REQUIREMENTS.md](docs/proof/PRIZE-REQUIREMENTS.md).

## Prior work disclosure

From [W9-prior-code-inventory.md](docs/proof/W9-prior-code-inventory.md):
- The supplied UI contained an earlier project (chupke). Its code, landing components, assets, auth/biz routes and libs were removed (F5); the `/` landing was rewritten from scratch.
- EzPayz (teammate project): `packages/shared/src/amount.mjs` and the `apps/api/src/approvals.mjs` idempotency were rewritten from scratch; no EzPayz code remains.
- Starter config files (web package.json, tsconfig, next.config, eslint config, Dockerfile, favicon) come from create-next-app scaffolding via the supplied UI. `web/AGENTS.md`, `web/README.md` and the `web/src/app/app/` redirect are still prior/scaffold.
- No fresh-start or Continuity eligibility is asserted; that is a human/staff decision.

## AI tools used

- **OpenAI Codex** (earlier sandbox phase): source editing, local Node/ESLint/TypeScript runs, doc lookup. Its sandbox could not run forge (DNS) or git.
- **Claude Code** (laptop phase, 2026-11-06): forge 118/118, `pnpm test`, `pnpm doctor`, world:smoke, ens:smoke, USDT read-only probe, F1-F9 code and these docs.
- No fabricated commits, transactions, feedback, deployment links or test results.

<!-- COUNTERSIGN-EVIDENCE:START -->
## Recorded deployment evidence

See "Live on Whitechain testnet" above and [INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md). Still TODO-HUMAN: public web/API URLs, public repo, video, final CI URL, source eligibility decision.

<!-- COUNTERSIGN-EVIDENCE:END -->

## Risk-reduction commands

`pnpm doctor` checks public configuration, chain/token/balances/contracts/budget, provider discovery, service health, flags and Git cleanliness without printing secrets. `pnpm human:deploy` runs the keystore-based stepwise deployment and first payment in a normal terminal, persisting docs/proof/deployed.json. `pnpm human:deploy` was executed for the deployment and first payment (verification skipped during the outage, then run with forge verify-contract once it ended). Adversarial Solidity tests in contracts/test/AdversarialEdges.t.sol (43 incl. inherited) pass (G1-forge-test.txt). See [CLAIM-AUDIT.md](docs/CLAIM-AUDIT.md).
