# Countersign security and performance review

Scope: static source review only. No audit certification. Solidity execution is currently blocked by compiler downloads. The 16 passing Node tests cover primitives, not the complete payment application.

## Existing contract defenses

Creator is treasury owner; no arbitrary treasury parameter. Per-payment and period caps, allowlist, current registry payout/version, nonce and order uniqueness, epoch and expiry checks precede transfers. Above-threshold payments require owner approval and a fresh designated-attestor signature. Owner signatures use ERC-1271-compatible SignatureChecker. SafeERC20 and nonReentrant protect token interactions; accounting changes roll back if transfer fails. Refunds cannot replenish period budgets.

## Open release blockers

1. Execute all contract tests and stateful invariants, and implement/execute viem-to-contract digest parity. Source files and formatting do not prove runtime behavior.
2. Implement and verify the World issuer integration and independent attestor service. Currently there is no cryptographic JWT verification in the application. Plain test claims cannot authorize real payments.
3. Owner identity binding is delegated to the attestor: the contract does not compare ownerSubHash to an onchain enrollment. This is the supplied trust model, not independent onchain identity enforcement. Secure enrollment and immutable approval records are essential.
4. Role separation is operational: the contract accepts owner-selected agent/attestor addresses without forcing distinct keys. Do not describe the system as two independent factors if deployment assigns the same authority to both roles.
5. Limited allowance is an owner setup requirement, not a restriction on ERC-20 approve. UI must reject unlimited approvals and show allowance/revocation clearly. Contracts still enforce policy caps if an owner grants more allowance externally.
6. GasGuard is currently an internal primitive. The unfinished facilitator must derive simulation results and fee estimates itself, never accept simulationSucceeded or reserved costs from client input. Unknown broadcasts require chain reconciliation before retries.
7. Test official USDT behavior, decimals and balances through live RPC. No replacement token qualifies. Current token mocks only cover local behavior.
8. Registry IDs are permissionlessly first-come registered; merchant identity must not be inferred from a human-readable name alone. Verify the registered owner and payout.

## Performance status

Compiler optimizer and via-IR are configured, but gas and latency have not been measured. No throughput, fee or instant-settlement claims are justified. Measure automatic pay, human-approved pay, create, revoke and refund with forge gas reports; confirm actual testnet receipts and total relayer fees. Report wallet interaction and confirmation time separately from API latency. Keep mandatory security checks while optimizing.

## Regression additions

Added lower-budget regression: reducing the cap below already-spent value preserves history, reports zero remaining and rejects further payment. Added a fully signed human approval replay after revoke. Neither is claimed executed yet.

## Contract requirement-to-test map

All entries are source mappings, not claims of complete or passing coverage.

| ID | Function(s) | Execution |
|---|---|---|
| T-01 | `Mandate.t.sol: testT01AttackerCannotUseVictimAllowance` | Unexecuted |
| T-02 | `Mandate.t.sol: testT02TamperedAmount` | Unexecuted |
| T-03 | `Mandate.t.sol: testT03TamperedPayout` | Unexecuted |
| T-04 | `Mandate.t.sol: testT04PayoutVersionChanged` | Unexecuted |
| T-05 | `Mandate.t.sol: testT05InactiveMerchant` | Unexecuted |
| T-06 | `Mandate.t.sol: testT06HardPerTransactionCap` | Unexecuted |
| T-07 | `Mandate.t.sol: testT07CumulativePeriodCap` | Unexecuted |
| T-08 | `Mandate.t.sol: testT08LimitChangePreservesSpend` | Unexecuted |
| T-09 | `Mandate.t.sol: testT09PeriodRolloverPreservesHistory` | Unexecuted |
| T-10 | `Mandate.t.sol: testT10NonceReplay` | Unexecuted |
| T-11 | `Mandate.t.sol: testT11DuplicateOrderNewNonce` | Unexecuted |
| T-12 | `Mandate.t.sol: testT12HumanThresholdRequiresOwner` | Unexecuted |
| T-13 | `Mandate.t.sol: testT13AttestationMustBindOwnerApproval` | Unexecuted |
| T-14 | `Mandate.t.sol: testT14WrongAttestorCannotApprove` | Unexecuted |
| T-15 | `Mandate.t.sol: testT15StaleAndFutureAuthentication` | Unexecuted |
| T-16 | `Mandate.t.sol: testT16RevocationRejectsUnusedIntent`<br>`Mandate.t.sol: testT16RevocationRejectsFullySignedHumanApproval` | Unexecuted |
| T-17 | `Mandate.t.sol: testT17PolicyChangesInvalidateFullApproval` | Unexecuted |
| T-18 | `Mandate.t.sol: testT18ExpiredIntent` | Unexecuted |
| T-19 | `Mandate.t.sol: testT19ExpiredMandate` | Unexecuted |
| T-20 | `Mandate.t.sol: testT20PausedMandate` | Unexecuted |
| T-21 | `Mandate.t.sol: testT21MerchantNotAllowed` | Unexecuted |
| T-22 | `Mandate.t.sol: testT22DifferentChainSignatureRejected`<br>`Mandate.t.sol: testT22DifferentContractSignatureRejected` | Unexecuted |
| T-23 | `Mandate.t.sol: testT23MalleableSignatureRejected` | Unexecuted |
| T-24 | `WalletAndReentrancy.t.sol: testT24ReentrantTokenCannotExecuteSecondPayment` | Unexecuted |
| T-25 | `Mandate.t.sol: testT25InsufficientAllowanceRollsBackAllEffects` | Unexecuted |
| T-26 | `Mandate.t.sol: testT26UnauthorizedRefund` | Unexecuted |
| T-27 | `Mandate.t.sol: testT27RefundCannotExceedPaymentOrRestoreBudget` | Unexecuted |
| T-28 | `Mandate.t.sol: testT28AllAdministrativeCallsRequireOwner` | Unexecuted |
| T-29 | `WalletAndReentrancy.t.sol: testT29SmartWalletOwnerApprovesExactDigest` | Unexecuted |
| T-30 | `MandateInvariant.t.sol: invariant_T30AccountingReplayAndRefundBounds` | Unexecuted |

## Human-run evidence update

The human-run full suite compiled and reported 72 passed / 2 failed / 0 skipped (74 includes inherited duplicate tests). Stateful invariant testing passed 256 runs with 16,384 calls. Both failures were inherited T-22 instances; the trace shows the test did not restore the original chain. The fix uses vm.getChainId() and asserts different digests before requiring rejection. That fix is not yet execution-verified. Earlier “Unexecuted” table labels describe the pre-run baseline, now superseded by this evidence except for changed tests and new work.

Compiler warnings were not suppressed. Access-control mutations already emit LimitsUpdated, AgentRotated, AttestorChanged and PauseChanged. The treasury transfer intentionally uses the recorded creator rather than relayer msg.sender; the victim-allowance regression passed in the human output. The uint128 amount cast follows a check against uint128 perTxLimit. Timestamp windows and post-transfer event placement remain explicit protocol/trust assumptions; pay/refund use nonReentrant. These observations are not a security audit or a reason to skip regression execution.

## Risk loop update (current evidence supersedes baseline above)

Human supplied 75 passing Solidity tests after T22 correction and fixed-vector parity. The earlier unexecuted table and 72/2 trace describe historical checkpoints, not the current known result. jose/attestor/owner-binding implementations and local signed fixtures now exist, but real issuer/deployment remain unverified. Latest backend suite is separately recorded in STATUS.

Re-read 03 contract storage, EIP712/check ordering and current pay/refund source as an attacker. No production contract change justified by this pass. Nonces/spent/payment state update only after signatures/approval, and failed SafeERC20 transfers revert those effects. Revocation is execution-order dependent: it blocks a payment executed after epoch bump; it cannot undo an already executed payment. Permissionless relayers may submit a valid signed intent first, which is not invalid-signature nonce griefing. Refund intentionally remains available after pause/revoke and never restores budget. Payout fallback rejection does not block a standard ERC20 transfer because there is no receiver callback; token behavior still needs official-USDT execution.

NEW AdversarialEdges.t.sol tests, all UNEXECUTED until human output:
- testRiskRevokeFrontRunsInFlightPayment
- testRiskAllowanceExhaustedMidSequenceRollsBack
- testRiskThirdPartyCannotGriefNonceWithInvalidSignature
- testRiskRefundAfterRevokeAndPausePreservesSpend
- testRiskPeriodBoundaryExactly
- testRiskRegistryChangeSameBlockRejectsCachedTerms
- testRiskMalformedAndOversizedAgentSignatures
- testRiskMalformedHumanSignaturesCannotConsumeIntent
- testRiskRevertingPayoutDoesNotReceiveNativeCallback

These inherit the base suite, so output counts will include repeated base tests. No safety test removed/skipped; no timing/ordering guarantee beyond onchain transaction ordering is asserted.
