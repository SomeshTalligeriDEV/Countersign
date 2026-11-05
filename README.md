# Countersign

Contract-enforced spending mandates for agents paying merchants in USDT, with transaction-bound human approval.

## Current implementation

The shared EIP-712 schema, MerchantRegistry and Mandate Solidity source are written. Registry and initial Mandate security tests are written. Sixteen Node tests pass for raw-body webhook authentication serialized relay work and persistent GasGuard reservations; these primitives are not yet integrated into a running API. Compilation and execution have **not** been verified: dependency and Solidity compiler downloads fail with DNS errors in the current environment. No contracts are deployed and no payment has settled. The backend, World integration, wallets and application adaptation remain to be implemented.

The supplied Next.js application remains in the exact `ui ` directory (including its trailing space). Its landing page now describes Countersign using the supplied layout and components. Legacy login and app routes are still awaiting replacement and are not Countersign payment flows.

## Development

Install Node.js, pnpm and Foundry. Run `pnpm install`, then `pnpm test:contracts`. Run `pnpm dev` to start the supplied UI. Dependencies and Solidity 0.8.30 must be downloadable on first setup.

## Intended architecture

Agent → merchant payment challenge → API / GasGuard → Mandate → official USDT transfer from owner treasury to merchant. Above-threshold payments additionally require owner EIP-712 authorization and a separate World attestor signature. Confirmed chain logs will be the settlement source of truth.

The contract makes the creator the treasury owner, never accepts an arbitrary treasury, preserves period spending across policy changes and refunds, and supports ERC-1271 owner approvals. Merchant allowlist updates increment the epoch as an additional replay defense. Token decimals must be read at runtime by integrations.

## Why Whitechain

The proposed flow uses onchain stablecoin settlement so spending limits, payment terms and authorization can be checked by a contract and independently inspected by merchants. The relayer is intended to sponsor gas. No measured latency or fee claim is made before deployment.

## Submission evidence

Official event source: https://ethglobal.com/events/mumbai/prizes

Still required: verified Whitechain deployments, official-USDT settlement transaction, successful World approval and failure paths, contract and API security tests, live demo, public repository with genuine development history, sponsor feedback and a 2–4 minute video. ENS is optional and not implemented.

## Starting point and AI disclosure

The user supplied the numbered project specifications and the `ui ` application before implementation in this workspace. Original UI authorship and creation date have not been independently verified; eligibility must be disclosed accurately. No historical commits have been fabricated.

OpenAI Codex assisted with repository inspection, official-documentation lookup, workspace setup and contract implementation.

## Limitations

Uncompiled, unaudited, undeployed work in progress. No claim of hackathon qualification or production readiness. The planned World testing environment does not imply production identity assurance. Owner identity binding must be enforced by the attestor service; the contract verifies the designated attestor's signature. Compromise of owner and attestor together remains a risk within hard caps and treasury allowance. The payment protocol is x402-style, not the standard x402 exact scheme.

CI and container publication configuration: see [DEPLOYMENT.md](DEPLOYMENT.md). Not yet executed remotely.

Offline npm cache recovery installed the supplied UI dependencies and generated its lockfile. Its TypeScript check and lint now pass. Read-only API diagnostics are available through `node apps/api/src/server.mjs`: `/health/live`, `/health/ready`, `/v1/network`. Readiness fails with HTTP 503 without working configured Whitechain RPC; no sample chain data is returned. Payment endpoints remain unimplemented.

The landing page has no fake waitlist submission or static successful payment fallback. Its network widget proxies the configured `COUNTERSIGN_API_URL` diagnostics service and reports unavailable states. System fonts replace network-fetched Google fonts for offline builds; the original custom typography is therefore not preserved exactly.

Approval persistence now implements PKCE/state/nonce generation, browser-bound one-time callback consumption, expiry, validated-claim checks and atomic one-time attestation claims. These are internal primitives, not exposed World endpoints: cryptographic JWT verification, code exchange, owner onboarding and attestor signing are not yet integrated. Tests use local fixtures only.
