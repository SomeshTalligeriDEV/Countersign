# 01 · PRD: Countersign

> Design specification, not verified build evidence. Present-tense goals and historical incident references below are not independently revalidated by this build. Use STATUS.md, BUILD_REPORT.md and docs/ONE-PAGE-BRIEF.md for demonstrated behavior.

## 1. One-liner

Countersign lets a company's AI agents pay businesses in USDT on Whitechain inside limits a smart contract enforces. A tampered price or payout address is rejected onchain. Any payment above the human threshold needs the owner to approve the exact terms with a fresh World ID sign-in.

## 2. Problem

| Who | Pain today | Evidence |
|---|---|---|
| Company running agents | An agent holding a wallet can be tricked into sending funds. Limits enforced in app code or by the LLM can be bypassed. | Grok/Bankr drain, May 2026, about $150k to $174k after an NFT escalated permissions and a Morse-code prompt was treated as a command ([Giskard](https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet)) |
| Company running agents | Payment SDKs trusted the seller's requested amount and recipient | x402 SDK flaws: a hostile server could request the full balance before the Aug 2026 fixes ([CSA, Oct 25 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-x402-agent-payment-sdk-flaws-20261025-csa/)) |
| Company running agents | Asking a human to approve every payment kills automation | Average x402 payment is about $0.52, and a confirmation takes 5 to 15 seconds ([CryptoSlate](https://cryptoslate.com/tiny-x402-payments-expose-gap-holding-ai-agents-back/)) |
| Merchant / API seller | Needs to know a payment is final and was authorized, without holding customer funds | Card rails settle T+2 with disputes. Wallet-address payments have no invoice state. |

## 3. What we claim and don't claim

**We claim:**
- Payments execute only through `Mandate.pay()`, which enforces per-transaction, per-period and human-threshold limits onchain.
- The final amount, merchant, payout address and order are bound by signatures. Changing any of them reverts.
- Above the threshold, settlement needs the owner's wallet signature **and** a World attestation over the same digest.
- Revocation invalidates every older approval immediately after the revoke transaction executes.
- Agents never hold USDT or WBT. The business pays gas through a relayer with drain protection.

**We don't claim:**
- That we stop prompt injection. We cap and contain its damage.
- Protection from chargebacks or disputes. We give a verifiable record of authorization, not legal immunity.
- Production identity assurance. Hackathon World proofs use mock identities.
- That Whitechain reads live ENS state. It enforces signed commitments (namehash, expiry).
- Zero setup. The company funds a treasury and sets one limited allowance.

## 4. Users

| Persona | Goal | Surface |
|---|---|---|
| **Company owner** | Create a mandate, set limits, approve risky payments, revoke | Web dashboard + `/approve/:id` page |
| **AI agent** (buyer) | Pay for APIs and orders without holding funds | `@countersign/agent` client |
| **Merchant** (seller) | Get paid in USDT, receive webhooks and receipts, refund | `@countersign/merchant` middleware + dashboard |
| **Operator** (us) | Keep the relayer funded and safe | GasGuard config + logs |

## 5. Scope

### P0: must ship (the demo depends on it)

| ID | Feature |
|---|---|
| C1 | `MerchantRegistry` (payout + version, owner-only updates) |
| C2 | `Mandate`: limited treasury allowance, per-tx limit, per-period limit, human threshold, merchant allowlist, epoch, pause, nonces, payment IDs |
| C3 | Agent `PaymentIntent` signatures (below threshold) |
| C4 | 2-of-2 `PaymentApproval` (owner signature + World attestor signature) above threshold |
| C5 | Revoke (epoch bump) and policy update that never resets spending |
| B1 | Relayer + GasGuard: allowlisted calls only, `eth_call` simulation, budgets, rate limits, pause |
| B2 | Payment API + chain observer (status from logs) + signed webhooks |
| B3 | World Agent Pass approval: OIDC auth code + PKCE, `max_age=0`, backend validation, owner `sub` binding, attestor signing |
| S1 | Merchant middleware with a 402 challenge (x402-style), used by a **separate** demo merchant app in about 20 lines |
| S2 | Agent client that signs intents and calls the facilitator |
| W1 | Web: owner dashboard, approval page, merchant view, attack buttons for the demo |
| T1 | Security test suite (07) green |

### P1: should ship

| ID | Feature |
|---|---|
| R1 | Merchant refund (full and partial, capped onchain) |
| W2 | CSV export of payments |
| E1 | ENSv2 agent identity layer (06) |

### Cut: don't build, don't claim

Subscriptions, payment links, email receipts, Arkiv, Chainlink, Lightning, multi-chain, fiat off-ramp, KYC, escrow, dispute resolution, marketplace.

## 6. Prize tracks (max 3 partners)

| Partner / track | Why it fits | Must show |
|---|---|---|
| **Whitechain Scale** (primary) | Agent pays USDT with zero crypto steps. Business pays gas. Relayer drain protection is executable. | Gasless agent payment, relayer funding source, GasGuard rejection |
| **Whitechain Operate** (secondary) | Drop-in middleware, merchant and payer views, refund past the first payment | Separate demo app in about 20 lines, both views, refund |
| **World ID Agent Pass** | The protected action is a real payment, and World attests to the exact digest | Request, completion, backend validation, settlement; plus denied, expired and wrong-human paths |
| **ENSv2** (only if E1 ships) | Agent subnames with scoped roles. Merchants discover and verify agents without our API. | Live Sepolia reads, scoped-role rejection, signed expiry enforced on Whitechain |

If E1 isn't done by the cut-off in 08, don't select ENS. Pick only the partners you fully qualify for.

## 7. Success criteria

- [ ] Real USDT settles on Whitechain from the treasury to the merchant payout via `Mandate.pay()`, with the explorer link in the README
- [ ] Tampered amount, merchant or payout reverts onchain, even when the agent submits it
- [ ] Over-budget payment reverts onchain
- [ ] Above-threshold payment settles only with owner signature + World attestation
- [ ] World denied, expired and wrong-human paths produce no attestation and no settlement
- [ ] Revoke, then replaying an unused old approval reverts onchain
- [ ] GasGuard rejects an arbitrary relayer request, shown live
- [ ] Separate demo merchant app integrates in about 20 lines (line count shown)
- [ ] All 07 tests pass in CI

## 8. Business model (assumptions to validate, not market data)

| Revenue line | Price | Who pays | Why it fits the pain |
|---|---|---|---|
| Per-agent subscription | $10 to $20 per agent per month | Company | Covers policy, approvals, audit log. One drained agent costs more than years of fees. |
| Approval fee | about $0.25 per human approval | Company | Charged only when risk is high and value is visible |
| Merchant fee | about 0.5% on orders above $5 | Merchant | Final settlement plus verifiable authorization record on high-value orders |

No per-payment fee on micro-payments: at $0.50, a 0.3% fee is $0.0015, about the gas cost. **Validation step:** talk to three teams running payment-capable agents at the event, and put what they said in the pitch.

## 9. Competition and positioning

| Competitor | Overlap | Our difference |
|---|---|---|
| AgentPass (ETHGlobal Cannes 2026) | ENS agents, caps, World ID, Ledger approval | Merchant side, contract-enforced tamper rejection, 2-of-2 approval bound to the digest, onchain epoch revocation, real Whitechain USDT |
| Google AP2 mandates, Visa/Mastercard agent programs | Intent and cart mandates | Open, onchain, stablecoin-native, merchant-verifiable without a network |
| Coinbase x402 + spend controls | Agent payments, $1 default cap | Policy and approvals enforced by a contract, not the client SDK |

**Honest position:** strong execution of a known pattern. Aim for sponsor prizes. A finalist slot needs exceptional execution.
