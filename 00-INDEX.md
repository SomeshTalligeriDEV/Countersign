# Countersign: Build Docs Index

> Contract-enforced spending mandates for AI agents that pay businesses in USDT on Whitechain, with transaction-bound human approval through World ID Agent Pass.

**Event:** ETHGlobal Mumbai 2026 · **Deadline:** Sat Nov 7, 09:00 IST · **Docs version:** v6.1 (Nov 6, 03:30 IST)

## Read in this order

| File | What it is | Who needs it |
|---|---|---|
| [01-PRD.md](01-PRD.md) | Problem, users, scope, success criteria, tracks | Everyone |
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Components, trust model, flows | Everyone |
| [03-CONTRACTS.md](03-CONTRACTS.md) | `Mandate` + `MerchantRegistry` spec, EIP-712 structs, invariants | Contracts dev |
| [04-BACKEND.md](04-BACKEND.md) | API, relayer + GasGuard, World approval, attestor, facilitator | Backend dev |
| [05-SDK-WEB-AGENT.md](05-SDK-WEB-AGENT.md) | Merchant SDK, agent client, web app screens, demo agent | Frontend / SDK dev |
| [06-ENS-OPTIONAL.md](06-ENS-OPTIONAL.md) | ENSv2 identity layer (build last, cut if late) | Whoever finishes first |
| [07-SECURITY-TESTS.md](07-SECURITY-TESTS.md) | Attack tests that must pass before demo | Contracts + backend dev |
| [08-BUILD-PLAN.md](08-BUILD-PLAN.md) | Hour-by-hour plan, commit cadence, cut order | Team lead |
| [09-DEMO-SUBMISSION.md](09-DEMO-SUBMISSION.md) | Six-step demo, video script, README, feedback files, checklist | Team lead |
| [10-AGENT-SKILLS-AND-TOOLS.md](10-AGENT-SKILLS-AND-TOOLS.md) | Official skills, MCP servers and SDKs per track (install first) | Everyone |
| [11-BUILD-PROMPT.md](11-BUILD-PROMPT.md) | Master prompt for the coding agent, with gates and rules | Whoever drives the agent |
| [12-BRUTAL-RATING.md](12-BRUTAL-RATING.md) | Honest scores and the five things most likely to sink it | Everyone |

## What changed from v5 (from the outside review)

1. **Limited treasury allowance**, not unlimited. Pause switch. `ReentrancyGuard`, `SafeERC20`, checks-effects-interactions.
2. **Human approval is a 2-of-2 signature over the exact payment digest:** the owner's wallet signature **and** a World attestation signature over the same `PaymentApproval` digest. A compromised backend can't change the merchant. A stolen owner wallet can't pass without a fresh World sign-in.
3. **Spending counters never reset on policy change.** Accounting periods are computed onchain from timestamps. Policy updates bump the authorization epoch but never touch `spent`.
4. **Signed payout + registry version.** `pay()` checks that the registry's current payout and version equal the signed ones. Any registry change invalidates old approvals.
5. **Precise revocation claim:** "Revocation invalidates every older approval immediately after the revoke transaction executes. It can't undo a payment that executed before it."

## Non-negotiables (qualification items)

- Contracts on **Whitechain Sepolia (chain ID 1874)**, verified on the explorer.
- At least one payment in **official USDT `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`** in the main flow, explorer link in the README. No self-minted token.
- World: full journey, a failed path, backend-only validation, debrief.
- Public repo with steady commits, README (setup, architecture, limitations, "why Whitechain" line), `WHITECHAIN_FEEDBACK.md`, 2 to 4 minute video showing every party.

## Quick start

1. Install the tools in [10](10-AGENT-SKILLS-AND-TOOLS.md), including `npx skills add whitechain-labs/skills --skill whitechain-dev`.
2. Create a new public repo and copy these files into `docs/`.
3. Paste the prompt from [11](11-BUILD-PROMPT.md) into the coding agent.

## Eligibility warning

If any StableGate code was written **before** the hackathon started, it can't go in a "start fresh" submission. Either rewrite from scratch at the event, or enter the Continuity track and document "before vs during" in the README. Decide this **before** the first commit.
