# Submission answers: evidence-dependent draft

Do not submit this as completed integration evidence. Public code permalinks, ratings and live results remain TODO-HUMAN until genuine execution and repository publication. Root 13-SUBMISSION-FORM-DRAFT.md is preserved as the supplied spec.

## Whitechain

**How used:** Implemented Mandate and MerchantRegistry contracts targeting Whitechain Sepolia1874 and official USDT 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. The mandate pulls bounded treasury funds to a registry-bound payout, checks replay/epoch/budget/expiry and requires additional owner/attestor signatures above threshold. A dedicated relayer can sponsor payment execution. Nothing is deployed on-chain yet; deployment and actual USDT transfer are WAITING-ON-HUMAN. Contract tests: 118/118 local forge (docs/proof/G1-forge-test.txt). Official USDT read-only probe: 6 decimals, EIP-2612 permit and EIP-3009 present (docs/proof/USDT-CAPABILITIES.md); none used or executed.

**Applicability:** Designed for small agent payments and merchant integration with company-funded gas. Scale eligibility with owner-paid initial allowance/setup is TODO-HUMAN sponsor clarification, not established qualification. Operate evidence requires the actual merchant integration and live settlement demonstration.

**Code** (repo-relative; permalink TODO-HUMAN after push, no git remote exists yet):
- `contracts/src/Mandate.sol:146` createMandate, `:201` revoke, `:235` pay, `:269` refund
- `contracts/src/MerchantRegistry.sol:22` register, `:29` updatePayout, `:38` setActive
- `apps/api/src/facilitator.mjs:22` Facilitator (relayer), `:34` settle
- `apps/api/src/gasguard.mjs:2` GasGuard, `:11` reserve
- `packages/merchant/src/index.mjs:4` merchant middleware
- Tests: `contracts/test/Mandate.t.sol`, `contracts/test/AdversarialEdges.t.sol`; executed 118/118 in docs/proof/G1-forge-test.txt

**Ease rating:** TODO-HUMAN after real deployment, verification and settlement; no invented numerical rating.

**Feedback:** Compiler/test settings were actionable. Real deployment/funding experience is not yet recorded. Workspace DNS and port restrictions are not sponsor faults. See [feedback](../WHITECHAIN_FEEDBACK.md).

## World Agent Pass

**How used:** Implemented discovery, code+PKCE, max_age=0, jose JWT/JWKS checks, action-bound nonce, authentication freshness, immutable owner subject binding with wallet proof, separate authenticated attestor and owner PaymentApproval signature. Signed local JWT fixture tests passed. Live read-only discovery + JWKS checks PASS for sandbox and production issuers (docs/proof/F2-world-smoke.txt); no sign-in performed. Real issuer sign-in, provider/client-auth compatibility and protected live payment are TODO-HUMAN.

**Applicability:** The protected action is a bounded USDT payment. Fixture identity success is not real World verification and is not production identity assurance. A real success and at least one failure must be captured before selecting this track as completed.

**Code** (repo-relative; permalink TODO-HUMAN after push):
- `apps/api/src/world-oidc.mjs:4` createWorldOidc, `:24` PKCE + max_age=0 params, `:39` token verification call
- `apps/api/src/world-token.mjs:2` verifyWorldToken
- `apps/api/src/owner-binding.mjs:5` createOwnerBinding
- `apps/attestor/src/attestor.mjs:4` createAttestor
- `apps/api/src/owner-signature.mjs:3` createOwnerSignatureService
- `apps/api/src/world-device.mjs` device flow (FIXTURE-tested, not routed)
- World sign-in evidence is FIXTURE-only; discovery/JWKS is REAL read-only.

**Rating:** TODO-HUMAN after real issuer integration. [Debrief](../WORLD_DEBRIEF.md) separates executed fixtures from missing real evidence.

## ENS

**How used:** packages/ens reads agent policy text records via the ENS Universal Resolver (viem, Sepolia) and builds ENSv2 PermissionedRegistry/Resolver txs for a per-agent subname, its own resolver, policy text records and revoke. Live read-only resolve PASS (docs/proof/F3-ens-smoke.txt); /owner and /r show an ENS identity with a Live/Fixture badge. ENS writes (`pnpm ens:setup`) are UNEXECUTED; no Countersign subname exists yet. The Mandate contract does not read ENS. Notes: [ENS-NOTES.md](ENS-NOTES.md).

**Code:** `packages/ens/src/index.mjs`, `scripts/ens-smoke.mjs`, `scripts/ens-setup.mjs`, `web/src/components/countersign/EnsIdentity.tsx`. Tests: `packages/ens/test/ens.test.mjs` (encoding only).

## Other technologies

No extra partner integration is claimed. EzPayz code is not used (rewritten from scratch, see README "Prior work disclosure").

## Required final fields

- Live web/API: TODO-HUMAN.
- Public repo and actual commit: TODO-HUMAN.
- Video URL and six-step results twice: TODO-HUMAN.
- Verified contract and transaction links: generated in [EVIDENCE.md](proof/EVIDENCE.md) after saving deployed.json.
- AI tools: OpenAI Codex (earlier sandbox: implementation, local Node tests, doc lookup); Claude Code (laptop: forge 118/118, pnpm test 93/93, doctor, world:smoke, ens:smoke, USDT read-only probe, docs). No fabricated history or real-world success.
- Prior code: [W9 inventory](proof/W9-prior-code-inventory.md) (chupke removed, EzPayz-derived code rewritten, create-next-app scaffold configs disclosed). TODO-HUMAN creation dates, licenses, prior submissions and fresh/Continuity decision. Pactra relationship remains unanswered.
