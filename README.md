# Countersign

**Spending mandates for AI agents, settled in USDT on Whitechain, with human approval through World ID and an agent identity on ENS.**

An owner gives an AI agent a budget. The agent signs exact payment terms; a relayer pays the gas; the **Mandate contract** enforces the limits at the moment USDT moves. Above a threshold, the payment also needs a fresh **World ID** sign-in by the owner plus an owner-wallet signature. The agent is published as **`agent1.countersign.eth`** on ENSv2, with its policy mirrored in text records that the app checks live against the chain.

| | |
|---|---|
| **Live demo** | https://web-rouge-one-10.vercel.app |
| **Repository** | https://github.com/SomeshTalligeriDEV/ETHGLOBAL (public, CI green) |
| **Demo video** | _to be added_ |
| **Chain** | Whitechain Sepolia testnet, chain ID 1874 |
| **ENS agent** | `agent1.countersign.eth` (ENSv2, Sepolia) |

> The web app is on Vercel. The API, relayer, attestor and chain observer run on the build machine behind a Cloudflare quick tunnel (`https://detector-absorption-calculate-methodology.trycloudflare.com`), so the live backend is available only while that machine and tunnel are up.

---

## Prize requirements at a glance

### Whitechain: Stablecoin Payments for Business

| Requirement | Status | Evidence |
|---|---|---|
| Contracts deployed on Whitechain Sepolia (1874) and verified | ✅ | MerchantRegistry [0x2686…29E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2), Mandate [0x9232…9EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA), both source-verified on Blockscout |
| USDT payment (`0xcedfB561…55a7`) settled in the main flow | ✅ | first payment [0x6862…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021), plus 3 relayed and 1 human-approved ([A12-payments.csv](docs/proof/A12-payments.csv)) |
| Why on-chain stablecoin settlement | ✅ | [section below](#why-on-chain-stablecoin-settlement-on-whitechain) |
| Public repo with steady progress; README with setup, architecture, limitations | ✅ | commit history; this README |
| Demo video, 2–4 minutes, every party shown | ⏳ | being recorded |
| `WHITECHAIN_FEEDBACK.md` | ✅ | [WHITECHAIN_FEEDBACK.md](WHITECHAIN_FEEDBACK.md) |
| _Extras:_ drop-in SDK, merchant and customer views, refunds, CSV export, webhooks | ✅ | `packages/merchant`, `/merchant`, `/r/[paymentId]`, refund [0x921d…6fe3](https://explorer.testnet.whitechain.io/tx/0x921d428645cbf91100523d79be8dc102aacccec8f354aaca343f576d8b706fe3), [A11-webhooks.txt](docs/proof/A11-webhooks.txt) |

### Whitechain: Scale · Payments Nobody Notices (also applicable)

| Requirement | Status | Evidence |
|---|---|---|
| Payer pays USDT without holding WBT | ✅ | the agent wallet holds 0 USDT and 0 WBT; it only signs an EIP-712 intent; the relayer submits `pay()` ([G2-onchain.md](docs/proof/G2-onchain.md)) |
| How the business pays gas, how the relayer gets WBT, what stops draining | ✅ | [Gas sponsorship section](#gas-sponsorship-and-drain-protection) |
| Same base qualifications (verified contracts, USDT payment, README line, repo, video, feedback) | ✅ / ⏳ video | as above |

### World ID Agent Pass

| Requirement | Status | Evidence |
|---|---|---|
| Integrate the official Agent Pass | ✅ | OIDC against `https://sandbox.auth.world.org` (`apps/api/src/world-oidc.mjs`, `world-cimd.mjs`) |
| Full journey: request, user completes, validated result, protected action | ✅ | owner signs in with World, the backend validates the token, then a 1.50 USDT payment settles: [0x98fa…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531) |
| Unsuccessful path where the action does not occur | ✅ | stale authentication after a real sign-in is refused, and an unanswered approval expires; neither sends a transaction ([A2-world-approval.md](docs/proof/A2-world-approval.md)) |
| Validate in a secure backend, no exposed secrets | ✅ | server-side PKCE S256, `max_age=0`, nonce, JWKS signature, `iss`/`aud`/`auth_time` ≤ 120 s; no client secret in use |
| Integration debrief | ✅ | [WORLD_DEBRIEF.md](WORLD_DEBRIEF.md) |

### ENS: Best Use of ENSv2

| Requirement | Status | Evidence |
|---|---|---|
| Built on ENSv2 (Sepolia) | ✅ | `countersign.eth` has its own **UserRegistry**; `agent1.countersign.eth` has its own **PermissionedResolver** ([A15-ens-onchain.md](docs/proof/A15-ens-onchain.md)) |
| ENSv2 central, not cosmetic | ✅ | per-agent namespace; policy published as text records; agent key limited to two records via Enhanced Access Control (`grantSetterRoles`); a live drift check compares ENS with the Mandate |
| ENSIP-26 agent records | ✅ | `agent-endpoint[web]` and `agent-context` set on `agent1.countersign.eth` and editable by the agent's own key, while the policy records are not ([tx](https://sepolia.etherscan.io/tx/0x5dec4f06eba43c58ebb4690e5edf43c2a12c6b4be9df7a72266c48854e65c93b)) |
| Functional, no hard-coded values | ✅ | `/api/countersign/ens/agent1.countersign.eth/drift` reads Sepolia and Whitechain live: 7/8 MATCH ([A15-ens-live.txt](docs/proof/A15-ens-live.txt)) |
| Live demo link and open-source code | ✅ | links above |

Feature acceptance on the live chain: **14/16 PASS** ([ACCEPTANCE.md](docs/proof/ACCEPTANCE.md)). Not done: A7 (registry change after approval, covered by contract tests only) and A14 (owner dashboard clicked with a real wallet).

---

## How it works

```
 Owner ── creates mandate (limits, merchants, attestor) ──► Mandate contract (Whitechain)
   │                                                            ▲
   │ World ID sign-in + wallet signature (over threshold)      │ pay(intent, agentSig, ownerSig, attestation)
   ▼                                                            │
 Attestor ── co-signs fresh World approval ──► Relayer + GasGuard (pays gas, simulates first)
                                                                ▲
 Agent ── signs exact payment terms (amount, merchant, order) ──┘    Agent holds no USDT and no gas
 Merchant ◄── USDT + signed webhook + on-chain receipt
 ENS agent1.countersign.eth ── mirrors the policy; the app shows MATCH/MISMATCH against the chain
```

1. **Owner** approves a USDT allowance and creates a mandate: per-transaction limit, period budget, approval threshold, allowed merchants and attestor.
2. **Agent** asks a merchant for a priced resource and signs the exact intent.
3. **Relayer** simulates `pay()`, GasGuard checks target, selector, fee caps and budgets, and only then broadcasts.
4. **Contract** checks signatures, merchant payout and version, limits, nonce, order, epoch, expiry and pause, then moves USDT from owner to merchant.
5. **Over the threshold**, the API holds the payment until the owner completes a fresh World sign-in and signs with their wallet; the attestor co-signs, and the contract verifies both.
6. **Merchant** gets the USDT, an HMAC-signed webhook and a receipt page; refunds are capped at the amount paid.

## System design

```
                    ┌──────────────────────── Ethereum Sepolia (ENSv2) ───────────────────────┐
                    │ countersign.eth ─ UserRegistry (ours) ─ agent1 ─ PermissionedResolver    │
                    │   text: countersign.limits / .merchants / .attestor / .mandate / .epoch  │
                    │   ENSIP-26: agent-endpoint[web], agent-context (agent key may edit only  │
                    │   these two via grantSetterRoles); addr = agent wallet                   │
                    └───────────────▲──────────────────────────────────────────────────────────┘
                                    │ live read (Universal Resolver)      drift check MATCH/MISMATCH
 ┌─────────────┐  402 terms   ┌─────┴──────────┐  settle / approvals   ┌───────────────────────────┐
 │ Demo agent  │◄────────────►│ Merchant + SDK │──────────────────────►│ Countersign API           │
 │ signs EIP-  │  signed      │ packages/      │◄── HMAC webhooks ─────│ • facilitator (simulate)  │
 │ 712 intent  │  intent      │ merchant       │                       │ • GasGuard (budgets/caps) │
 │ 0 USDT/WBT  │              └────────────────┘                       │ • approvals + World OIDC  │
 └─────────────┘                                                       │ • observer (3 blocks,     │
                                                                       │   reorg checks) + SQLite  │
 ┌─────────────┐ World sign-in (PKCE, max_age=0) ┌──────────────────┐  └────┬──────────┬──────────┘
 │ Owner       │────────────────────────────────►│ World Agent Pass │──────►│ ID token │ attest   │
 │ wallet sig  │◄── approval page /approve/[id] ─│ sandbox.auth.    │  JWKS │ verified ▼          │
 └─────────────┘                                 │ world.org        │       │   ┌──────────────┐  │
                                                 └──────────────────┘       │   │ Attestor     │  │
                                                                            │   │ (separate    │  │
                                                                            │   │ key/process) │  │
                                                                            │   └──────┬───────┘  │
                    ┌────────────── Whitechain Sepolia (1874) ──────────────────────────▼────────┐
                    │ Mandate.pay(intent, agentSig, ownerSig?, attestation?) ── USDT transferFrom │
                    │ owner → merchant payout; MerchantRegistry binds payout + version           │
                    └─────────────────────────────────────────────────────────────────────────────┘
```

### How each sponsor is used

- **Whitechain** is the settlement and enforcement layer. `Mandate` holds no funds: it pulls official USDT from the owner's allowance directly to the merchant's registered payout, and it reverts if any rule fails. Limits are per transaction and per period, plus nonce, order dedup, epoch (revoke), expiry and pause. `MerchantRegistry` binds a merchant ID to a payout address and version, so a tampered payout fails on-chain. Refunds are capped at the amount paid. The observer projects status only after 3 confirmations.
- **World ID Agent Pass** is the human-approval layer for payments at or above the threshold. The API starts an OIDC code flow with PKCE, `max_age=0` and a per-flow nonce. It validates the ID token server-side (JWKS signature, `iss`, `aud`, `nonce`, `auth_time` ≤ 120 s) and checks that the World subject matches the owner bound at onboarding. Only then does the separate attestor sign. The contract requires both the attestor signature and the owner's EIP-712 signature over the exact approval digest.
- **ENSv2** gives the agent a namespace and a public, verifiable policy. We own the registry under `countersign.eth`, and each agent gets its own PermissionedResolver. The owner holds root roles; the agent key can edit only its ENSIP-26 endpoint and context records. The app reads the records live and shows MATCH or MISMATCH against the Mandate state on Whitechain. Revoking bumps the epoch on-chain and clears the ENS records.

## Gas sponsorship and drain protection

- **Who pays:** the operator's relayer pays gas for `pay()`. The payer (agent) never needs WBT and never sends a transaction.
- **Funding:** the relayer key is funded with testnet WBT from the Whitechain faucet. In this deployment the relayer and the deployer share one key (`0x1079…5c7D`); in production they would be separate.
- **What stops draining** ([`apps/api/src/gasguard.mjs`](apps/api/src/gasguard.mjs), [`facilitator.mjs`](apps/api/src/facilitator.mjs)):
  - only the Mandate address and the `pay` selector are allowed;
  - every call is simulated first, and a failing simulation is never broadcast;
  - per-mandate and global gas budgets are reserved before broadcast and survive restarts;
  - max fee and gas limit caps apply, and an operator pause is available.
- **Recorded GasGuard denials:** `gas_price_or_limit` and `not_allowlisted_call` ([G2-onchain.md](docs/proof/G2-onchain.md), [G6-demo-run.txt](docs/proof/G6-demo-run.txt)).

## Why on-chain stablecoin settlement on Whitechain

The agent's spending limits, merchant payout binding, replay protection and human-approval threshold are enforced by the Mandate contract at the moment USDT moves. Neither the agent, the relayer nor our API can exceed them. A card or bank rail would only let us enforce these rules in our own server, which the agent's operator would have to trust, and it could not give the merchant a final, publicly verifiable settlement it can check on the explorer. Whitechain gives low-cost payments in official USDT; we have no measured fee or latency figures yet.

## Live on Whitechain testnet

| | Address / transaction |
|---|---|
| MerchantRegistry | [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2) |
| Mandate | [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA) |
| Official USDT | `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` |
| First payment (0.50 USDT) | [0x68629137…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021) |
| Human-approved payment (1.50 USDT, World) | [0x98fa814e…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531) |
| Rejected on-chain: tampered amount, tampered payout, over budget, paused, over-refund | links in [INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md) |

Every setup transaction: [G2-onchain.md](docs/proof/G2-onchain.md). The six-step demo ran twice on the live chain ([G6-demo-run.txt](docs/proof/G6-demo-run.txt)).

## Architecture

| Path | Role |
|---|---|
| `contracts/` | `MerchantRegistry` and `Mandate` (Solidity 0.8.30, `prague`; official USDT fixed at deploy) |
| `apps/api/` | HTTP API, SQLite, World OIDC, approvals, chain observer (3-block confirmation, reorg checks), relayer + GasGuard, webhook worker |
| `apps/attestor/` | separate process holding the attestor key; signs only after recomputing the approval from the database |
| `apps/demo-agent/`, `apps/demo-merchant/` | agent CLI (purchases and attack scenarios) and a demo merchant using the SDK |
| `packages/merchant/` | drop-in merchant SDK: charge, middleware, webhook verification |
| `packages/agent/`, `packages/shared/` | signed intents, EIP-712 types, the single chain definition, exact decimal math |
| `packages/ens/` | ENSv2 reads, record and role transaction builders, drift check |
| `web/` | Next.js: owner dashboard, approval page, merchant view, receipts, demo |

## Setup

Requirements: Node ≥ 24.10, pnpm, Foundry.

```sh
pnpm install
pnpm test                         # Node suites: 97 pass
forge test --root contracts -vvv  # contracts: 118 pass
pnpm doctor                       # read-only chain, token and config checks
pnpm world:smoke                  # live World discovery + JWKS
pnpm ens:smoke agent1.countersign.eth   # live ENS read on Sepolia
npm ci --prefix web && npm --prefix web run dev
```

Copy each `.env.example` to a gitignored `.env` next to it. Start services with `node --env-file=.env src/server.mjs`. `ATTESTOR_KEY` lives only in `apps/attestor` and `RELAYER_KEY` only in `apps/api`; never put keys in `NEXT_PUBLIC_*` variables. Deployment uses Foundry keystores (`pnpm human:deploy`) and never takes raw keys. ENS writes use `pnpm ens:setup` (dry run by default, `--execute` to send).

**World without portal registration:** set `WORLD_CLIENT_ID` to `https://<api-origin>/.well-known/world-client.json`. The API serves that client metadata document (CIMD) and runs as a public PKCE client, so no client secret is needed.

## Security properties mapped to tests

Forge 118/0 across 6 suites ([G1-forge-test.txt](docs/proof/G1-forge-test.txt)); `pnpm test` 97/0. These are local tests against mocks; the live-chain evidence is listed above.

| Property | Contract tests | API tests |
|---|---|---|
| Only owner funds move | `testT01AttackerCannotUseVictimAllowance`, `testSmallPaymentMovesOnlyOwnerFunds` | |
| Tampered amount, payout or version; inactive merchant | `testT02`–`testT05`, `testRiskRegistryChangeSameBlockRejectsCachedTerms`, registry `testStrangerCannotRedirectPayout` | `A-01 tampered signed intent never broadcasts` |
| Per-transaction and period limits | `testT06`–`testT09`, `invariant_T30AccountingReplayAndRefundBounds` (256 runs) | |
| Replay, duplicate orders, revocation | `testT10`, `testT11`, `testT16*`, `testT17PolicyChangesInvalidateFullApproval`, `testRiskRevokeFrontRunsInFlightPayment` | duplicate settlement blocked |
| Human threshold: owner + attestor + freshness | `testT12`–`testT15`, `testHumanApprovalSettlesExactDigest` | `threshold payment cannot use automatic path`, owner binding required |
| Expiry, pause, allowlist, domain separation, malleability | `testT18`–`testT23` | |
| Reentrancy, atomic rollback, ERC-1271 owners | `testT24`, `testT25`, `testT29SmartWalletOwnerApprovesExactDigest` | |
| Refund bounds, admin auth | `testT26`–`testT28` | observer refund rollback |
| Relayer cannot be used for arbitrary calls | | GasGuard `A-02/A-03`, `A-04` budgets survive restart |
| RPC failures never re-sign or double-spend | | relay-errors 429 / nonce / replacement tests |
| World token and callback validation | | world-http, owner-binding, world-cimd tests |

## Limitations

- **Hosting:** the backend runs on the build machine behind a quick tunnel, not durable hosting.
- **World:** sandbox issuer only (mocked identities, per World); IDKit not built; the headless device flow is implemented but not routed.
- **ENS:** the Mandate cannot read ENS. ENS is the agent's name, public policy mirror and role layer. The merchants-hash row is not comparable on-chain, and the revoke flow is built but not executed, so the demo name stays live.
- **Not run live:** A7 (registry change after approval) and owner-dashboard clicks with a real wallet; browser tests use a mocked wallet.
- **Engineering:** single relayer process; gas reservations cover execution gas only; no deep-reorg recovery; no independent audit.

## Feedback and reports

- [WHITECHAIN_FEEDBACK.md](WHITECHAIN_FEEDBACK.md): what worked, the verification outage, docs gaps.
- [WORLD_DEBRIEF.md](WORLD_DEBRIEF.md): time to first success, friction, the one improvement we'd make.
- [INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md): real vs fixture, per sponsor.
- [BUILD_REPORT.md](BUILD_REPORT.md): final build status.

## Prior work disclosure

From [W9-prior-code-inventory.md](docs/proof/W9-prior-code-inventory.md):
- The supplied UI contained an earlier project (chupke). Its code, components, assets and routes were removed, and the landing page was rewritten from scratch.
- EzPayz (teammate project): `amount.mjs` and approval idempotency were rewritten from scratch; no EzPayz code remains.
- Starter config (web `package.json`, `tsconfig`, `next.config`, ESLint config, Dockerfile, favicon) comes from create-next-app scaffolding.

## AI tools used

- **OpenAI Codex** (early phase): source editing and local lint/type checks.
- **Claude Code** (main phase): contracts and tests, API, integrations, deployment scripts, on-chain runs and documentation, under the author's direction.
- Every transaction, test count and link in this README comes from a recorded run in `docs/proof/`.

<!-- COUNTERSIGN-EVIDENCE:START -->
## Recorded deployment evidence

See "Live on Whitechain testnet" above and [INTEGRATION-REPORT.md](docs/proof/INTEGRATION-REPORT.md). Still to do: demo video and durable backend hosting.

<!-- COUNTERSIGN-EVIDENCE:END -->
