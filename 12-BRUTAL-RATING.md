# 12 · Brutal Rating of the v6 Plan

These are my judgment calls on the design as written, not predictions. Nothing is built yet, and judges score working demos, not docs.

| Area | Score | Why |
|---|---|---|
| Real-world problem | 8/10 | Agent wallet drains and uncapped x402 spending are real 2026 incidents. The pain is real; paying demand is unproven. |
| Architecture | 8.5/10 | Contract is the boundary, funds pulled from a limited allowance, every term signed, keys split |
| Security design (on paper) | 8/10 | 2-of-2 approval bound to the digest, epochs, monotonic budgets, registry versioning, 30 attack tests. Not audited. The owner wallet + attestor pair is still a residual risk. |
| Originality | 6/10 | AgentPass and Google AP2 cover the pattern. The edge is contract-level tamper rejection plus the merchant side, which is execution, not invention. |
| Sponsor fit: Whitechain Scale | 8.5/10 | Exactly what the track describes, if real USDT settles and GasGuard rejection is shown |
| Sponsor fit: World Agent Pass | 8/10 | The protected action is a real payment, with failure paths. Mocked proofs and sandbox setup are the risk. |
| Sponsor fit: ENSv2 | 5.5/10 | Useful (discovery, scoped roles, expiry commitment) but not essential. Judges may ask why ENS. It's optional for that reason. |
| Feasibility in about 27 hours | 5/10 for everything, 7/10 for P0 with 2 to 3 people | Contracts + relayer + World + SDK + web is a lot. Solo, cut to P0 and skip ENS. |
| Demo potential | 8.5/10 | Six steps with real successes and real onchain failures is a judge-friendly story |
| Business model | 6/10 | Pricing fits the pain (per agent, per approval), but nothing is validated. Three design-partner chats would move this most. |
| **Sponsor-prize competitiveness** | **Good** | Strong if every qualification item ships and the demo is reliable |
| **Finalist competitiveness** | **Possible, not likely** | Needs flawless execution and a sharp story. Originality caps it. |

## The five things most likely to sink it

1. **No test USDT.** The faucet gives only WBT. Without USDT there's no qualifying payment. Solve it in the first hours.
2. **World sandbox friction.** A sandbox identity can take about an hour, and the mock setup is new. Start at hour one, and record a backup video the moment it works.
3. **Scope creep.** ENS, voice and extras eat the hours the six-step demo needs. Respect the 18:00 go/no-go and the cut order.
4. **Eligibility.** Reusing an existing UI or StableGate code written before the event breaks the start-fresh rule. Decide now: rewrite, use a public template, or enter Continuity.
5. **Digest mismatch bugs.** If viem and Solidity hash the EIP-712 structs differently, nothing settles. Test A-14 first.

## What would raise it

- Real quotes from three teams running payment-capable agents (business 6 → 7.5).
- A flawless, rehearsed six-step demo with explorer links (demo 8.5 → 9.5).
- The voice "Jarvis" agent getting a spoken prompt injection blocked on stage, **only** after everything else works (wow factor, not a track score).
