# Countersign

Bounded USDT payments for AI agents, targeting Whitechain Sepolia (1874). A treasury owner defines a mandate; its agent signs exact payment terms. The contract checks merchant payout/version, limits, nonce, order, epoch and expiry. Payments at the human threshold additionally require a fresh identity attestation and owner-wallet approval.

**Work in progress:** no independently verified Countersign deployment, real official-USDT payment, real World issuer sign-in or live URL has been recorded. See [STATUS.md](STATUS.md) and [human runbook](docs/proof/HUMAN-RUN.md). Component tests are not end-to-end deployment evidence.

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

Human-run `docs/proof/G1-forge-with-vectors.txt`: 75 Solidity tests passed, including inherited duplicates, T30 invariant runs and A14 Solidity parity. Shared viem vectors passed three tests. Latest Node/UI proof is linked in STATUS.md.

- Treasury ownership: T01; owner is createMandate caller.
- Tampered terms/payout/version: T02–T05 and local facilitator signature/simulation tests.
- Spending limits and monotonic accounting: T06–T09/T30.
- Nonce/order replay and revocation: T10/T11/T16/T17.
- Fresh two-party approval: T12–T15; backend JWT/attestor/owner tests use disclosed local identities.
- Reentrancy/ERC1271/refund caps: T24/T26/T27/T29.
- GasGuard: allowlisted pay only, simulation first, reservations, per-mandate/global budgets and pause. Signed transaction bytes/hash/nonce persist before broadcast; restart retries identical bytes. Unknown nonce outcomes block further work.

M2's permitted cut: reservations cover execution gas, not complete OP fee components. Dedicated single relayer process/signer required. Automatic deep-reorg recovery, production multi-process claims, identity recovery/rebinding and full webhook transport are unfinished. Wallet browser execution and real provider discovery/client-auth compatibility are unverified. No independent audit or production-security claim.

The configured relayer is intended to sponsor payment gas from test WBT; no actual sponsored payment has been recorded. Offchain company/merchant billing is a proposed business model, not implemented billing. Low-cost payments are the reason for targeting Whitechain; no measured fee/latency claims are made yet.

## Deployment and submission

[HUMAN-RUN.md](docs/proof/HUMAN-RUN.md) contains deploy/verify/first-payment, World and browser steps. [DEPLOYMENT.md](DEPLOYMENT.md) describes current container/CI status. No actual contract addresses, tx links or hosted URLs are invented here. Record them after execution.

Still needed: real USDT pay, verified contracts, real World success plus failure, attack/revoke demos twice, recorded browser evidence, live URL, final CI, video and submission form.

## Before and during / provenance

The supplied UI included an earlier Chupke project. EzPayz main was separately reviewed; selected amount/idempotency patterns were adapted, then the decimal parser independently rewritten. Existing prior code/history still needs an eligibility decision. See [prior-code inventory](docs/PRIOR-CODE-INVENTORY.md) and [EzPayz review](docs/EZPAYZ-INTEGRATION.md). No fresh-start eligibility or Continuity/prize interpretation is asserted. Pactra's relationship and the Scale-track one-time treasury allowance question remain unanswered by the human/staff.

## AI tools used

OpenAI Codex assisted with code, tests, documentation, repository inspection and official-documentation browsing. Skills consulted include blockchain-master, frontend-design-guidelines and World's official integration skill; current World MCP availability/configuration is documented separately. Tools used include local Node/TypeScript/ESLint tests, human-run Foundry tests and documentation web lookup. Test chain/World fixtures are disclosed; no fake real-world success evidence was generated.

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

New adversarial Solidity tests are in contracts/test/AdversarialEdges.t.sol and remain UNEXECUTED. Earlier75-test evidence does not cover them. See docs/CLAIM-AUDIT.md.
