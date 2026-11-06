# Prize qualification requirements (LIVE fetch)

Source: https://ethglobal.com/events/mumbai/prizes, fetched 2026-11-06 with curl (attempt 1: `curl: (28) Operation timed out after 30006 milliseconds`; attempt 2: HTTP 200, 1,154,696 bytes). Requirements are quoted verbatim from the page's "Qualification Requirements" lists. Linked sponsor pages ("Open page →") were not fetched separately; the prize page carries the full requirement text.

Status key: MET (evidence linked) · PARTIAL · MISSING · MISSING-NEEDS-DEPLOY (blocked on W2 deploy/funds, HUMAN-RUN H1–H3).

## Whitechain — "Operate · Stablecoin Payments for Business" ($5,000) — Countersign's target track

| Sponsor | Requirement (quoted) | Mapped file/test/proof | Status |
|---|---|---|---|
| Whitechain | "Contracts deployed on Whitechain Sepolia (chain ID 1874) and verified on the Whitechain explorer" | contracts/foundry.toml (`solc_version = "0.8.30"`, `evm_version = "prague"`, per docs); docs/proof/G1-forge-test.txt (118/118); docs/proof/W8-deploy-steps.md | MISSING-NEEDS-DEPLOY |
| Whitechain | "At least one payment in USDT (0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7) settled on Whitechain in your main flow, with the explorer link in your README. Payments in a test token you minted yourself won't count" | packages/shared/src/chain.mjs (`USDT_ADDRESS`, `explorerTx`); apps/api/src/chain.mjs (`wrong_token` guard, runtime `decimals()`); docs/proof/USDT-CAPABILITIES.md | MISSING-NEEDS-DEPLOY |
| Whitechain | "A line in your README on why this flow needs onchain stablecoin settlement on Whitechain and what a regular payment rail couldn't do here" | README.md — no such line found by grep ("why"/"rail") on 2026-11-06 | MISSING (README owned by another agent) |
| Whitechain | "A public GitHub repo that shows steady progress through the hackathon rather than one big upload at the end, with a README that explains setup, architecture and current limitations" | `git log` 14 commits 2026-11-06 04:04 → 13:35 IST; `git remote -v` empty (no public repo yet, HUMAN-RUN H5); README has limitations/TODO-HUMAN sections | PARTIAL |
| Whitechain | "A demo video of 2 to 4 minutes that shows each party involved" | scripts/video-checklist.mjs; none recorded | MISSING-NEEDS-DEPLOY |
| Whitechain | "A WHITECHAIN_FEEDBACK.md in your repo, a few honest lines on what worked, where you got stuck and what our docs were missing" | WHITECHAIN_FEEDBACK.md (exists; says no deploy yet). Candidate doc-gap found here: docs cite `viem/chains` `whitechainSepolia`, viem 2.35.0 ships only legacy `whitechainTestnet` (2625) | PARTIAL (needs deploy-time friction) |
| Whitechain ("What we want to see", not a qualification gate) | "A drop in piece, widget, SDK, payment link API or plugin that a separate demo app adds in about 20 lines" / "Both views in the demo, the merchant and the paying customer" / "Extra credit if your flow goes past the first payment, like a refund…" | packages/merchant (charge, middleware, webhooks + tests); web /merchant, /r/[paymentId] (W5 FIXTURE screenshots); refund in apps/api/src/merchant-service.mjs | PARTIAL (FIXTURE until deploy) |

Whitechain "Tokenize · Real World Finance on Whitechain" ($4,000) has the same first three requirements quoted above ("Contracts deployed…", "At least one payment in USDT…", "A line in your README…"). Countersign is a payments product, not RWA; the page says "Paying an invoice belongs in Operate". Not targeted.

## World

| Sponsor | Requirement (quoted) | Mapped file/test/proof | Status |
|---|---|---|---|
| World — World ID Agent Pass ($5,000; $2,500 Continuity-only variant has identical text) | "Integrate with the official World ID Agent Pass." | apps/api/src/world-oidc.mjs, world-env.mjs (issuers `https://sandbox.auth.world.org` / `https://auth.world.org`); docs/proof/F2-world-smoke.txt | PARTIAL (no real sign-in; HUMAN-RUN H4) |
| World — Agent Pass | "Demonstrate the complete journey: identity or verification request, user completion, validated result, and the protected application or agent action." | apps/api/test/world-http.test.mjs, approved-relay.test.mjs (FIXTURE JWTs) | MISSING-NEEDS-DEPLOY (FIXTURE only) |
| World — Agent Pass | "Demonstrate a denied, expired, cancelled, or otherwise unsuccessful path where the protected action does not occur." | apps/api/test/approvals.test.mjs, world-device.test.mjs (denied/stale_auth/wrong_human, FIXTURE) | PARTIAL (FIXTURE only) |
| World — Agent Pass | "Validate identity results in a secure backend; do not expose client secrets or treat an unvalidated client response as authorization." | apps/api/src/world-oidc.mjs, world-token.mjs (backend jose/JWKS validation); facilitator.mjs re-checks `world_sub_hash===owner_sub_hash`, `auth_time` ≤120 s | MET in code (FIXTURE-tested; real issuer UNEXECUTED) |
| World — Agent Pass | "Include a short integration debrief/feedback: time to first success, friction encountered, missing capability or documentation, and the one improvement with the greatest impact." | WORLD_DEBRIEF.md (states FIXTURE-only; no time-to-first-success yet) | PARTIAL |
| World — Best Use of IDKit ($2,500) | "Integrate IDKit in a functioning application, mini app, or onchain flow." / "Use at least one supported World ID credential and verify the result on the server or onchain as appropriate." / "Clearly explain the specific product event requiring trust and why the chosen credential is the minimum sufficient assurance." / "Demonstrate a successful verification and one meaningful alternative path…" / debrief | No IDKit in repo (grep `idkit` in apps/web/packages: no hits) | MISSING (not targeted) |

## ENS

| Sponsor | Requirement (quoted) | Mapped file/test/proof | Status |
|---|---|---|---|
| ENS — Best Use of ENSv2 ($7,000) | "Project must be built on ENSv2 on Ethereum mainnet or Sepolia." | packages/ens/src/index.mjs (PermissionedRegistry/Resolver builders, Sepolia); scripts/ens-setup.mjs (UNEXECUTED); docs/proof/F3-ens-smoke.txt (read-only Sepolia resolve) | PARTIAL (writes UNEXECUTED: need Sepolia ETH + owned parent) |
| ENS — ENSv2 | "ENSv2 features should be central to the product, not a cosmetic add-on." | per-agent subname + own resolver + policy text records + revoke (packages/ens) | PARTIAL (judgement; contract does not read ENS) |
| ENS — ENSv2 | "Your demo must be functional and not just include hard-coded values." | web/src/app/api/countersign/ens/, EnsIdentity.tsx (in progress by another agent) | MISSING-NEEDS-DEPLOY |
| ENS — ENSv2 | "Upon submission, your project showcase must have a link to a live demo and the code needs to be open source and accessible on Github or a similar platform." | no remote, no live URL (HUMAN-RUN H5) | MISSING-NEEDS-DEPLOY |
| ENS — Best Integration of ENSv2 into an Existing Project ($3,000, Continuity-only) | "Integration must use ENSv2 on Ethereum mainnet and integrate it into an existing project." | mainnet forbidden by project hard rules (testnet only) | MISSING (ineligible by rule) |
