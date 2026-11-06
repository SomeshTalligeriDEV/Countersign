# Submission answers: evidence-dependent draft

Whitechain on-chain evidence is real (below); World Agent Pass is real against the sandbox issuer (docs/proof/A2-world-approval.md). Public code permalinks, ratings, hosting and ENS-write evidence remain TODO-HUMAN. Root 13-SUBMISSION-FORM-DRAFT.md is preserved as the supplied spec.

## Whitechain

**How used:** Implemented Mandate and MerchantRegistry contracts targeting Whitechain Sepolia1874 and official USDT 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. The mandate pulls bounded treasury funds to a registry-bound payout, checks replay/epoch/budget/expiry and requires additional owner/attestor signatures above threshold. A dedicated relayer sponsors payment execution (agent holds 0 USDT / 0 WBT).

**Deployed (Whitechain testnet 1874):**
- MerchantRegistry [0x2686f693A2C959568e650e0A5563E6244f2329E2](https://explorer.testnet.whitechain.io/address/0x2686f693A2C959568e650e0A5563E6244f2329E2)
- Mandate [0x923298375911A173da34C715da2718c0c9889EbA](https://explorer.testnet.whitechain.io/address/0x923298375911A173da34C715da2718c0c9889EbA)
- Source verification: VERIFIED on Blockscout (both contracts, after an explorer outage; proof/VERIFY-OUTAGE.md)
- First official-USDT payment 0.50: [0x6862…4021](https://explorer.testnet.whitechain.io/tx/0x68629137bf52b628824e92723b299d2b6dcf5703920eda318c4f402af1734021)
- Relayed payments: [0x80a2…8078](https://explorer.testnet.whitechain.io/tx/0x80a23cc2a8da4d8209f5dc2cb2c479874ab175332e052b04d9ad31e043e48078), [0x713f…39ae](https://explorer.testnet.whitechain.io/tx/0x713fdfa883b7ed7acaebfc5a281f9a77c7cb10cc0622f6626c07420b677939ae), [0xcc8d…9eb3](https://explorer.testnet.whitechain.io/tx/0xcc8d0d3d0941fa8e2072f8a08dbc45e9e664fbc82ebcae435a295cb248089eb3); refund 0.25 [0x921d…6fe3](https://explorer.testnet.whitechain.io/tx/0x921d428645cbf91100523d79be8dc102aacccec8f354aaca343f576d8b706fe3)
- On-chain reverts and all other txs: [INTEGRATION-REPORT.md](proof/INTEGRATION-REPORT.md); services run locally only (no public URL yet).
 Contract tests: 118/118 local forge (docs/proof/G1-forge-test.txt). Official USDT read-only probe: 6 decimals, EIP-2612 permit and EIP-3009 present (docs/proof/USDT-CAPABILITIES.md); none used or executed.

**Applicability:** Designed for small agent payments and merchant integration with company-funded gas. Scale eligibility with owner-paid initial allowance/setup is TODO-HUMAN sponsor clarification, not established qualification. Operate evidence requires the actual merchant integration and live settlement demonstration.

**Code** (repo-relative; permalink TODO-HUMAN after push, no git remote exists yet):
- `contracts/src/Mandate.sol:146` createMandate, `:201` revoke, `:235` pay, `:269` refund
- `contracts/src/MerchantRegistry.sol:22` register, `:29` updatePayout, `:38` setActive
- `apps/api/src/facilitator.mjs:22` Facilitator (relayer), `:34` settle
- `apps/api/src/gasguard.mjs:2` GasGuard, `:11` reserve
- `packages/merchant/src/index.mjs:4` merchant middleware
- Tests: `contracts/test/Mandate.t.sol`, `contracts/test/AdversarialEdges.t.sol`; executed 118/118 in docs/proof/G1-forge-test.txt

**Ease rating:** TODO-HUMAN after real deployment, verification and settlement; no invented numerical rating.

**Feedback:** Compiler/test settings were actionable. Deployment friction recorded: verification outage, 5 gwei base fee vs our 1 gwei cap, RPC timeouts, observer needing ranged getLogs, official test USDT only from the team. Workspace DNS and port restrictions are not sponsor faults. See [feedback](../WHITECHAIN_FEEDBACK.md).

## World Agent Pass

**How used:** Implemented discovery, code+PKCE, max_age=0, jose JWT/JWKS checks, action-bound nonce, authentication freshness, immutable owner subject binding with wallet proof, separate authenticated attestor and owner PaymentApproval signature. Real sign-in against `https://sandbox.auth.world.org` (mocked identities per World) using a CIMD public client (portal registration returned `account_not_eligible`), served over a Cloudflare quick tunnel: owner onboarding bound, then a 1.50 USDT over-threshold payment was approved and settled (tx 0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531). Failures: stale_auth after real sign-in refused (`approval_not_ready`, no tx); expired approval, no tx. Discovery + JWKS PASS for sandbox and production (docs/proof/F2-world-smoke.txt). Production issuer not run.

**Applicability:** The protected action is a bounded USDT payment. Sandbox identities are mocked, so this is not production identity assurance. A real sandbox success and two real failures are captured (docs/proof/A2-world-approval.md).

**Code** (repo-relative; permalink TODO-HUMAN after push):
- `apps/api/src/world-oidc.mjs:4` createWorldOidc, `:24` PKCE + max_age=0 params, `:39` token verification call
- `apps/api/src/world-token.mjs:2` verifyWorldToken
- `apps/api/src/owner-binding.mjs:5` createOwnerBinding
- `apps/attestor/src/attestor.mjs:4` createAttestor
- `apps/api/src/owner-signature.mjs:3` createOwnerSignatureService
- `apps/api/src/world-cimd.mjs` CIMD client metadata document
- `apps/api/src/world-device.mjs` device flow (FIXTURE-tested, not routed)
- World sign-in evidence is REAL (sandbox); IDKit not built.

**Rating:** TODO-HUMAN after real issuer integration. [Debrief](../WORLD_DEBRIEF.md): ~20 min to first success via CIMD after ~1 h of portal blockers.

## ENS

**How used:** packages/ens reads agent policy text records via the ENS Universal Resolver (viem, Sepolia) and builds ENSv2 PermissionedRegistry/Resolver txs for a per-agent subname, its own resolver, policy text records and revoke. Live read-only resolve PASS (docs/proof/F3-ens-smoke.txt); /owner and /r show an ENS identity with a Live/Fixture badge. ENS writes (`pnpm ens:setup`) are UNEXECUTED; no Countersign subname exists yet. The Mandate contract does not read ENS. Notes: [ENS-NOTES.md](ENS-NOTES.md).

**Code:** `packages/ens/src/index.mjs`, `scripts/ens-smoke.mjs`, `scripts/ens-setup.mjs`, `web/src/components/countersign/EnsIdentity.tsx`. Tests: `packages/ens/test/ens.test.mjs` (encoding only).

## Other technologies

No extra partner integration is claimed. EzPayz code is not used (rewritten from scratch, see README "Prior work disclosure").

## Required final fields

- Live web/API: TODO-HUMAN (services run locally only).
- Public repo and actual commit: TODO-HUMAN.
- Six-step results twice: [G6-demo-run.txt](proof/G6-demo-run.txt) (5/6 PASS each; the World step was later completed for real: proof/A2-world-approval.md). Video URL: TODO-HUMAN.
- Contract and transaction links: see Whitechain section above; both source-verified on the explorer.
- AI tools: OpenAI Codex (earlier sandbox: implementation, local Node tests, doc lookup); Claude Code (laptop: forge 118/118, pnpm test 93/93, doctor, world:smoke, ens:smoke, USDT read-only probe, docs). No fabricated history or real-world success.
- Prior code: [W9 inventory](proof/W9-prior-code-inventory.md) (chupke removed, EzPayz-derived code rewritten, create-next-app scaffold configs disclosed). TODO-HUMAN creation dates, licenses, prior submissions and fresh/Continuity decision. Pactra relationship remains unanswered.
