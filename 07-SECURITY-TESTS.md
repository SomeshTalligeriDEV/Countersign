# 07 · Security Tests (must pass before recording the demo)

Foundry tests in `contracts/test/`, plus API tests in `apps/api/test/`. Each test tries to **break** an invariant. Use a mock ERC-20 locally. The real USDT is used only on testnet.

## 1. Invariants

- **I1** Funds move only via `pay()` / `refund()`, and only from `policy.owner` (treasury) to the registry payout.
- **I2** `amount ≤ perTxLimit`, and `spent[period] + amount ≤ periodLimit`, always.
- **I3** `spent` never decreases. Policy updates, refunds and revokes don't reset it.
- **I4** Every executed payment's amount, merchant, payout, registry version, order, epoch and deadline equal what the agent signed.
- **I5** Above the threshold, execution needs the owner's signature and an attestor signature over the same approval digest, with fresh `authTime`.
- **I6** After `revoke` (or any epoch bump) executes, no older intent or approval can execute.
- **I7** Each nonce and each `(mandate, merchant, orderId)` executes at most once.
- **I8** `refunded ≤ amount` per payment.

## 2. Contract tests

| ID | Attack | Expected |
|---|---|---|
| T-01 | Attacker creates a mandate that pulls from a victim treasury that approved `Mandate` | Impossible: owner = msg.sender. Victim balance unchanged. |
| T-02 | Seller changes `amount` after the agent signed | `BadIntentSig` |
| T-03 | Seller changes `payout` in calldata | `RegistryMismatch` (and `BadIntentSig` if the registry matches the new payout) |
| T-04 | Merchant calls `updatePayout` between approval and execution | `RegistryMismatch` (version bumped) |
| T-05 | Merchant set inactive | `RegistryMismatch` |
| T-06 | Payment over `perTxLimit` | `OverPerTx` |
| T-07 | Several payments that together exceed `periodLimit` | Last one `OverPeriod` |
| T-08 | Spend $90 of $100, owner calls `updateLimits` (even raising them), agent spends again | Counter keeps $90; only `newLimit − 90` allowed |
| T-09 | Period rollover: warp past `periodLength` | New period index; previous `spent` untouched |
| T-10 | Replay same nonce | `NonceUsed` |
| T-11 | Same `orderId` with a new nonce | `AlreadyPaid` |
| T-12 | Above threshold, no approval | `BadOwnerSig` |
| T-13 | Owner sig valid, attestation over a different digest (backend swapped merchant) | `BadApproval` |
| T-14 | Attestation signed by a non-attestor key | `BadAttestation` |
| T-15 | `authTime` older than `MAX_AUTH_AGE`, or in the future | `StaleAuth` |
| T-16 | Valid approval, then `revoke`, then submit | `StaleEpoch` |
| T-17 | Valid approval, then `updateLimits`/`rotateAgent`/`setAttestor`, then submit | `StaleEpoch` |
| T-18 | Deadline passed | `Expired` |
| T-19 | Mandate expiry passed | `MandateExpired` |
| T-20 | Paused mandate | `Paused` |
| T-21 | Merchant not allowlisted | `MerchantNotAllowed` |
| T-22 | Signature for another chainId or contract (domain separation) | `BadIntentSig` |
| T-23 | Malleable signature (high `s`) | Reverts (OZ ECDSA) |
| T-24 | Reentrant token (mock calls back into `pay`) | Reverts (`nonReentrant`) |
| T-25 | Treasury allowance below amount | Reverts in `safeTransferFrom`, no state change |
| T-26 | Refund by non-payout | `NotPayout` |
| T-27 | Partial refund, then over-refund | Second reverts `OverRefund` |
| T-28 | Non-owner calls admin functions | `NotOwner` |
| T-29 | ERC-1271 owner wallet signs approval | Accepted |
| T-30 | Fuzz: random amounts and sequences keep I2, I3, I7 and I8 | Invariant test passes |

Write T-30 as a Foundry `invariant_` test with a handler that randomly calls `pay`, `updateLimits`, `revoke`, `refund` and `warp`.

## 3. Backend tests

| ID | Attack | Expected |
|---|---|---|
| A-01 | `/v1/settle` with a below-threshold intent and a bad sig | 400 `bad_intent_sig`, nothing broadcast |
| A-02 | Relayer asked to call any other contract or function | `gasguard_rejected: not_allowlisted_call` |
| A-03 | Intent that would revert | `gasguard_rejected: would_revert:<Error>`, nothing broadcast |
| A-04 | Over per-mandate hourly tx budget | `gasguard_rejected: budget` |
| A-05 | World callback with `access_denied` | Approval `denied`, attestor never called |
| A-06 | id_token with wrong `aud`, bad signature, wrong `nonce` or wrong `iss` | Rejected |
| A-07 | id_token for a different `sub` | `wrong_human` |
| A-08 | `auth_time` older than 120s | `stale_auth` |
| A-09 | Approval TTL elapsed | `expired`, attestor refuses |
| A-10 | Attestor called twice for one approval | Second refused (single use) |
| A-11 | Attestor called with a digest in the body | Ignored; it reads the digest from the DB |
| A-12 | Owner signature from a non-owner wallet | Rejected |
| A-13 | Webhook with a bad HMAC or an old timestamp | Rejected by `cs.webhook` |
| A-14 | `hashTypedData` (viem) == `hashIntent` / `hashApproval` (contract) | Equal for fixed vectors |

## 4. Run

```bash
cd contracts && forge test -vvv && forge test --match-test invariant -vvv
cd apps/api && pnpm test
```

Add a GitHub Actions workflow that runs both on each push, and put the badge in the README.
