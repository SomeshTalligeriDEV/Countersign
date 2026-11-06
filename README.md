# Countersign

Bounded USDT payments for AI agents, targeting Whitechain Sepolia (1874). A treasury owner defines a mandate; its agent signs exact payment terms. The contract checks merchant payout/version, limits, nonce, order, epoch and expiry. Payments at the human threshold additionally require a fresh World identity attestation and owner-wallet approval.

**Status (2026-11-06):** nothing is deployed on-chain yet (WAITING-ON-HUMAN: keystore/funds, [HUMAN-RUN.md](docs/proof/HUMAN-RUN.md) H1-H3). No real official-USDT payment, real World sign-in, ENS write or live URL has been recorded. Component tests are not end-to-end deployment evidence. See [STATUS.md](STATUS.md).

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
| Mandate / MerchantRegistry contracts | local forge only | 118/118 in G1-forge-test.txt; NOT deployed (MISSING-NEEDS-DEPLOY) |
| USDT payment, explorer link | none | MISSING-NEEDS-DEPLOY |
| RPC error handling (429, nonce, replacement) | FIXTURE (mocked RPC) | apps/api/test/relay-errors.test.mjs |

## World

| Piece | Mode | Proof |
|---|---|---|
| Sandbox + production discovery, PKCE S256, RS256 JWKS, auth_time, device grant endpoint | REAL read-only | [F2-world-smoke.txt](docs/proof/F2-world-smoke.txt): RESULT PASS for both issuers |
| Code + PKCE, `max_age=0`, jose JWT/JWKS checks, owner binding | FIXTURE (signed local JWTs) | apps/api/test/world-http, owner-binding, approvals tests |
| Device flow (headless) | FIXTURE; implemented in apps/api/src/world-device.mjs, not yet routed in server.mjs | world-device test `FIXTURE device flow polls pending/slow_down, verifies nonce-less token, rejects 503 and denial` |
| Real user sign-in, success + denied path | none | WAITING-ON-HUMAN (HUMAN-RUN-world.md) |

## ENS

| Piece | Mode | Proof |
|---|---|---|
| Policy read via ENS Universal Resolver (viem, Sepolia) | REAL read-only | [F3-ens-smoke.txt](docs/proof/F3-ens-smoke.txt): `nick.eth` PASS, plus web route `mode:"live"` |
| UI badge Live/Fixture | REAL mode flag | web/src/components/countersign/EnsIdentity.tsx |
| Subname, resolver, text records, revoke tx builders | FIXTURE (encoding tests only) | packages/ens/test/ens.test.mjs |
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

The relayer ([apps/api/src/facilitator.mjs](apps/api/src/facilitator.mjs)) only submits `pay` calls to the Mandate after authoritative simulation; the agent holds no gas token. GasGuard ([apps/api/src/gasguard.mjs](apps/api/src/gasguard.mjs)) enforces allowlisted target/selector, per-mandate and global gas budgets, fee caps and pause. Tests: gasguard `A-02/A-03 deny arbitrary calls and failed simulations with audit records`, `A-04 reservations survive restart and prevent budget overspend and duplicates`, `pause, fee caps and global budget fail closed`; facilitator `A-03 authoritative simulation rejection never broadcasts`; relay-ledger `relay persists before broadcast and restart rebroadcasts identical signed bytes`, `recovery retains unknown nonce outcome instead of signing or spending again`. All against mocked RPC; **no sponsored payment has been broadcast**.

## Limitations

- Nothing deployed; no real USDT payment, World sign-in, ENS write, live URL, public repo or video yet.
- Reservations cover execution gas, not complete OP fee components. Single relayer process/signer required.
- Automatic deep-reorg recovery, multi-process production, identity recovery/rebinding and full webhook transport are unfinished.
- Browser tests use a mocked wallet (W5 Playwright 8/8 FIXTURE, docs/proof/W5-playwright.txt); real-wallet run not done.
- Contracts do not read ENS; ENS is identity/policy display.
- No independent audit or production-security claim. Off-chain merchant billing is a proposed business model, not implemented.
- NO-DUMMY audit: [DUMMY-AUDIT.md](docs/proof/DUMMY-AUDIT.md) (non-web), [DUMMY-AUDIT-web.md](docs/proof/DUMMY-AUDIT-web.md) (web).

## Deployment and submission

[HUMAN-RUN.md](docs/proof/HUMAN-RUN.md) has deploy/verify/first-payment, World and browser steps. No contract addresses, tx links or hosted URLs are invented here; `pnpm evidence` fills the block below from docs/proof/deployed.json after execution. Prize mapping: [PRIZE-REQUIREMENTS.md](docs/proof/PRIZE-REQUIREMENTS.md).

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

Human-recorded inputs only. Links have not been independently checked against RPC by this generator. Empty fields are TODO-HUMAN.

- MerchantRegistry: TODO-HUMAN address
- MerchantRegistry deployment: TODO-HUMAN deployment transaction
- MerchantRegistry source verification: TODO-HUMAN verify source
- Mandate: TODO-HUMAN address
- Mandate deployment: TODO-HUMAN deployment transaction
- Mandate source verification: TODO-HUMAN verify source
- createMandate: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- limitedAllowance: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- refund: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- firstPayment: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- tamperAmount: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- tamperPayout: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- registryChanged: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- overBudget: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- humanApprovedPayment: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- revoke: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- replayAfterRevoke: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- arbitraryRelayerCall: TODO-HUMAN transaction or explicit API-only rejection proof (no tx)
- web: TODO-HUMAN public URL
- api: TODO-HUMAN public URL
- repo: TODO-HUMAN public URL

TODO-HUMAN: real World success and denied evidence, two ordered demo runs, browser/video proof, source eligibility decision, final CI URL.

<!-- COUNTERSIGN-EVIDENCE:END -->

## Risk-reduction commands

`pnpm doctor` checks public configuration, chain/token/balances/contracts/budget, provider discovery, service health, flags and Git cleanliness without printing secrets. `pnpm human:deploy` runs the keystore-based stepwise deployment and first payment in a normal terminal, persisting docs/proof/deployed.json. These live adapters are UNEXECUTED. Adversarial Solidity tests in contracts/test/AdversarialEdges.t.sol (43 incl. inherited) pass (G1-forge-test.txt). See [CLAIM-AUDIT.md](docs/CLAIM-AUDIT.md).
