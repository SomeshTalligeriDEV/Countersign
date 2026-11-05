# 09 · Demo, Video and Submission

## 1. The six-step demo

| # | Step | What the judge sees | Proves |
|---|---|---|---|
| 1 | **Company funding** | Owner creates a mandate (per-tx $50, daily $100, human threshold $10) and approves a **limited** 200 USDT allowance | Non-custodial, bounded risk |
| 2 | **Agent pays automatically** | Agent buys a $0.50 report: 402, then a signed intent, then settled. Agent holds no USDT or WBT. Explorer shows treasury → merchant. | Whitechain Scale: invisible payment, business pays gas |
| 3 | **World approval of exact terms** | Agent orders $40. `/approve` shows merchant, payout and amount. Owner does a fresh World sign-in, then signs in the wallet, and it settles. Then a second order: owner cancels, and nothing moves. | World Agent Pass: protected action plus failed path |
| 4 | **Tampering attack** | Evil seller changes $40 to $400 (or swaps payout). The agent's own submission reverts: `BadIntentSig` / `RegistryMismatch` on the explorer. | Contract-level enforcement |
| 5 | **Budget attack** | Agent tries payments past the remaining daily budget, and gets `OverPeriod` | Hard caps |
| 6 | **Revocation** | Owner revokes. Replaying a previously approved, unused payment reverts with `StaleEpoch`. | Revocation invalidates older approvals |

Also show, in about 5 seconds each: the GasGuard log rejecting an arbitrary relayer call, and (if built) the ENS agent card read live from Sepolia.

## 2. Video script (3:30, within the 2 to 4 minute rule)

| Time | Scene |
|---|---|
| 0:00 to 0:15 | Hook: "In May a Morse-code prompt made Grok's agent send $150k. Agents need limits they can't talk their way out of." |
| 0:15 to 0:35 | One diagram: agent → merchant 402 → Countersign → `Mandate` on Whitechain. "The contract is the security boundary." |
| 0:35 to 0:55 | Step 1: owner sets limits and a limited allowance |
| 0:55 to 1:20 | Step 2: $0.50 auto payment, explorer link, "the agent has zero WBT" |
| 1:20 to 2:05 | Step 3: $40 approval with exact terms, World sign-in, wallet sign, settle. Cancel path. |
| 2:05 to 2:35 | Steps 4 and 5: tamper revert and budget revert on the explorer |
| 2:35 to 2:55 | Step 6: revoke, replay fails |
| 2:55 to 3:15 | Merchant view: received payment, webhook, refund. The 20-line integration on screen. |
| 3:15 to 3:30 | Business model in one line, limitations in one line, team |

Record each step separately as a backup, so a failed live step can be shown from video. Show every party: owner, agent, merchant.

## 3. README template

```markdown
# Countersign
Contract-enforced spending mandates for AI agents paying in USDT on Whitechain, with transaction-bound World ID approval.

## Live demo
<url> · Video: <url>

## Deployed (Whitechain Sepolia, chain 1874), verified
- Mandate: <explorer link>
- MerchantRegistry: <explorer link>
- First real USDT payment (main flow): <tx explorer link>

## Why this needs onchain stablecoin settlement on Whitechain
Card rails can't enforce a spending policy that the paying software itself can't change, can't settle a $0.50 machine payment profitably, and can't give the merchant a final, publicly verifiable record that a verified human approved this exact payment. A mandate contract settling official USDT on Whitechain does all three, and the business sponsors gas so the agent never holds WBT.

## Architecture
<diagram from docs/02> + trust model table

## Setup
pnpm i · cp .env.example .env · forge test · pnpm dev

## Security properties (and the tests that prove them)
<I1..I8 with test IDs>

## Relayer: who pays gas and what stops draining it
<GasGuard table>

## Current limitations
- World proofs in the hackathon environment are mocked. Not production identity assurance.
- An attacker holding both the owner wallet and the attestor key could approve up to the hard caps.
- Whitechain enforces signed ENS commitments (namehash, expiry), not live ENS state.
- x402-style scheme, not the standard x402 "exact" EIP-3009 scheme.
- Not audited. Testnet only.

## Built at ETHGlobal Mumbai 2026
<commit history note; if Continuity: before vs during section>
```

## 4. `WHITECHAIN_FEEDBACK.md` (fill in honestly as you go)

```markdown
# Whitechain feedback
- What worked: <e.g. Hardhat config from docs worked first try, 1s blocks>
- Where we got stuck: <e.g. getting test USDT: faucet gives only WBT>
- What the docs were missing: <e.g. USDT token interface (permit/EIP-3009?), Foundry verify example, gas costs>
```

## 5. `WORLD_DEBRIEF.md` (required by the Agent Pass track)

```markdown
# World ID Agent Pass integration debrief
- Time to first successful verification: <hh:mm>
- Friction encountered: <e.g. redirect URI rules, mock env setup>
- Missing capability or documentation: no way to bind an action digest or display payment terms in the device flow or ID token; we had to add our own approval page + attestor
- The one improvement with the greatest impact: a signed action digest (binding message) carried into the ID token
```

## 6. Pitch Q&A (prepare these answers)

| Likely question | Answer |
|---|---|
| Isn't this AgentPass? | AgentPass approves with a Ledger and caps in app logic. We enforce terms in the settlement contract, so a tampered payout or price reverts, approvals are bound to the exact digest, and revocation is onchain. Plus a merchant SDK and real USDT settlement. |
| Why not a smart-account spending limit? | A limit alone doesn't bind the merchant, payout version and order, or require a fresh human for risky payments. And merchants can't verify it. |
| Are the World proofs real? | Mocked in this environment, and we say so. The integration is real: OIDC, backend validation, attestation bound to the digest. |
| What if your backend is hacked? | It can't change terms (owner signs the digest) or exceed hard caps. The worst case needs owner wallet and attestor key, and is capped by the allowance. |
| Who pays and why? | Companies running agents, per agent per month, because one drained agent costs more than years of fees. <Add what design partners told you.> |
| Why Whitechain? | Sub-cent fees and 1s blocks make $0.50 machine payments viable, plus official USDT and gas sponsorship. |

## 7. Final submission checklist

- [ ] Partners selected: Whitechain, World, plus ENS only if 06 shipped (max 3)
- [ ] Contracts verified on the Whitechain explorer (links in README)
- [ ] Real USDT payment in the main flow (link in README)
- [ ] "Why Whitechain" line in README
- [ ] README: setup, architecture, limitations
- [ ] `WHITECHAIN_FEEDBACK.md`
- [ ] `WORLD_DEBRIEF.md`
- [ ] World: success path + denied/expired path + backend validation shown in video
- [ ] ENS (if selected): live demo link, no hard-coded values, open source
- [ ] Commit history steady across the event
- [ ] AI tool usage documented (ETHGlobal rule)
- [ ] Video 2 to 4 minutes showing owner, agent and merchant
- [ ] Live demo URL works on a phone
- [ ] Submitted before 06:00 IST Sat (hard deadline 09:00)
