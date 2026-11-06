# Countersign

Bounded USDT payments for AI agents, targeting Whitechain Sepolia (1874). A treasury owner defines a mandate; its agent signs exact payment terms. The contract checks merchant payout/version, limits, nonce, order, epoch and expiry. Payments at the human threshold additionally require a fresh identity attestation and owner-wallet approval.

**Work in progress / status:** nothing is deployed on-chain yet (W2 WAITING-ON-HUMAN: no keystore/funds). World sign-in is FIXTURE-only (signed local JWTs), no real World issuer sign-in. No verified Countersign deployment, real official-USDT payment, real World issuer sign-in or live URL has been recorded. See [STATUS.md](STATUS.md) and [human runbook](docs/proof/HUMAN-RUN.md). Component tests are not end-to-end deployment evidence.

## Setup

Use Node >=24.10, Foundry and Solidity 0.8.30. In a terminal with normal network access:

```sh
npm install --prefix packages/shared --ignore-scripts --no-audit --no-fund
npm install --prefix apps/api --ignore-scripts --no-audit --no-fund
npm install --prefix contracts --ignore-scripts --no-audit --no-fund
npm ci --prefix web --ignore-scripts
npm test
npm --prefix packages/shared test
npm --prefix apps/api run test:world-fixtures
forge build --root contracts
forge test --root contracts -vvv
```

Copy env examples to gitignored service-specific files and populate only real deployment values. API/attestor do not implicitly load dotenv; use `node --env-file=.env src/server.mjs` from each service directory. Both use the same absolute SQLite file. ATTESTOR_KEY belongs only to apps/attestor. A dedicated RELAYER_KEY belongs only to apps/api. No mainnet or substitute USDT.

Start API, attestor (when configured), and `npm --prefix web run dev` in separate terminals. Web server needs COUNTERSIGN_API_URL; browser-facing World links need COUNTERSIGN_PUBLIC_API_URL. Optional WS configuration is in the examples/runbook. Never put secret keys in NEXT_PUBLIC variables.

## Architecture and behavior

- `contracts`: MerchantRegistry and Mandate; official USDT is fixed in deployment scripts and verified by the chain adapter.
- `apps/api`: SQLite persistence, HTTP validation, OIDC, observer, owner setup and relayer.
- `apps/attestor`: separate loopback process, authenticated approval-ID requests, DB digest recomputation and single-use signing.
- `packages/shared`: EIP-712 definitions, digest vectors and exact decimal arithmetic.
- `packages/merchant` / `packages/agent`: x402-style custom payment terms and signed intents. This is not the standard x402 exact scheme.
- `apps/demo-merchant` / `apps/demo-agent`: separately integrated report endpoint and agent CLI. The 0.50 and 40 USDT reports are priced network-diagnostic resources, not fabricated goods or market data. Attack commands and ordered run-all exist; actual chain rejection and two live runs remain unverified.
- `web`: our owner, approval, receipt, merchant and demo pages. Legacy Chupke entrypoints are retired. Mocked-wallet browser tests exist but remain unexecuted.

Submitted is not settled. The observer requires three subsequent blocks and reads contract logs before projecting payment status. Receipt lookup also checks matching direct pay calldata. WebSockets send read-only state-change invalidations, then clients fetch authoritative data; reconnect has polling fallback. Stale/backfilling observers cannot present payment history as current.

## Security evidence and limits

Executed today (2026-11-06, laptop, Claude Code session): `forge test --root contracts -vvv` → **118 passed, 0 failed, 6 suites** ([docs/proof/G1-forge-test.txt](docs/proof/G1-forge-test.txt)). Node: `pnpm test` 75/75 (recorded in docs/proof/LOOP-LOG.md). These are local tests against mocks/fixtures, not deployed-chain evidence. Note: Mandate tests are inherited by WalletAndReentrancy/AdversarialEdges suites, so names repeat; unique property coverage is below.

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

### Relayer and GasGuard

The relayer ([apps/api/src/facilitator.mjs](apps/api/src/facilitator.mjs)) only submits `pay` calls to the Mandate contract after authoritative simulation; GasGuard ([apps/api/src/gasguard.mjs](apps/api/src/gasguard.mjs)) enforces allowlisted target/selector, per-mandate and global gas budgets, fee caps and pause. Covered by gasguard tests `A-02/A-03 deny arbitrary calls and failed simulations with audit records`, `A-04 reservations survive restart and prevent budget overspend and duplicates`, `pause, fee caps and global budget fail closed`; facilitator `A-03 authoritative simulation rejection never broadcasts`; relay-ledger `relay persists before broadcast and restart rebroadcasts identical signed bytes`, `recovery retains unknown nonce outcome instead of signing or spending again`. All against mocked RPC; **no sponsored payment has been broadcast** (W2 WAITING-ON-HUMAN).

M2's permitted cut: reservations cover execution gas, not complete OP fee components. Dedicated single relayer process/signer required. Automatic deep-reorg recovery, production multi-process claims, identity recovery/rebinding and full webhook transport are unfinished. Wallet browser execution and real provider discovery/client-auth compatibility are unverified. No independent audit or production-security claim.

Offchain company/merchant billing is a proposed business model, not implemented billing. Low-cost payments are the reason for targeting Whitechain; no measured fee/latency claims are made yet.

## Deployment and submission

[HUMAN-RUN.md](docs/proof/HUMAN-RUN.md) contains deploy/verify/first-payment, World and browser steps. [DEPLOYMENT.md](DEPLOYMENT.md) describes current container/CI status. No actual contract addresses, tx links or hosted URLs are invented here. Record them after execution.

Still needed: real USDT pay, verified contracts, real World success plus failure, attack/revoke demos twice, recorded browser evidence, live URL, final CI, video and submission form.

## Before and during / provenance

The supplied UI included an earlier Chupke project. EzPayz main was separately reviewed; selected amount/idempotency patterns were adapted, then the decimal parser independently rewritten. Existing prior code/history still needs an eligibility decision. See [prior-code inventory](docs/PRIOR-CODE-INVENTORY.md) and [EzPayz review](docs/EZPAYZ-INTEGRATION.md). No fresh-start eligibility or Continuity/prize interpretation is asserted. Pactra's relationship and the Scale-track one-time treasury allowance question remain unanswered by the human/staff.

## AI tools used

- **OpenAI Codex** (earlier sandbox phase): source editing, local Node/ESLint/TypeScript test runs, documentation lookup. Its sandbox could not run forge (compiler download DNS failure) or git.
- **Claude Code** (current laptop phase, 2026-11-06): ran forge 118/118, `pnpm test`, `pnpm doctor`, rate-limit fix, prior-code inventory, these docs.
- No fabricated commits, transactions, feedback, deployment links or test results. World/identity evidence is FIXTURE-only.

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

`pnpm doctor` checks public configuration, chain/token/balances/contracts/budget, provider discovery, service health, flags and Git cleanliness without printing secrets. `pnpm human:deploy` runs the keystore-based stepwise deployment and first payment in a normal terminal, persisting docs/proof/deployed.json. These live adapters are unexecuted; fixture orchestration tests do not prove a live deployment. Unknown submissions stop for reconciliation.

Adversarial Solidity tests in contracts/test/AdversarialEdges.t.sol (43 incl. inherited) are now EXECUTED and pass (docs/proof/G1-forge-test.txt). See docs/CLAIM-AUDIT.md.
