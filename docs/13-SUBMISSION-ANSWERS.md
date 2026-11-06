# Submission answers: evidence-dependent draft

Do not submit this as completed integration evidence. Public code permalinks, ratings and live results remain TODO-HUMAN until genuine execution and repository publication. Root 13-SUBMISSION-FORM-DRAFT.md is preserved as the supplied spec.

## Whitechain

**How used:** Implemented Mandate and MerchantRegistry contracts targeting Whitechain Sepolia1874 and official USDT 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. The mandate pulls bounded treasury funds to a registry-bound payout, checks replay/epoch/budget/expiry and requires additional owner/attestor signatures above threshold. A dedicated relayer can sponsor payment execution. Deployment and actual USDT transfer remain TODO-HUMAN.

**Applicability:** Designed for small agent payments and merchant integration with company-funded gas. Scale eligibility with owner-paid initial allowance/setup is TODO-HUMAN sponsor clarification, not established qualification. Operate evidence requires the actual merchant integration and live settlement demonstration.

**Code:** [pay and refund contract](../contracts/src/Mandate.sol), [merchant registry](../contracts/src/MerchantRegistry.sol), [relayer](../apps/api/src/facilitator.mjs), [GasGuard](../apps/api/src/gasguard.mjs), [merchant middleware](../packages/merchant/src/index.mjs). TODO-HUMAN: replace these repository-relative links with public commit permalinks after committing the actual code.

**Ease rating:** TODO-HUMAN after real deployment, verification and settlement; no invented numerical rating.

**Feedback:** Compiler/test settings were actionable. Real deployment/funding experience is not yet recorded. Workspace DNS and port restrictions are not sponsor faults. See [feedback](../WHITECHAIN_FEEDBACK.md).

## World Agent Pass

**How used:** Implemented discovery, code+PKCE, max_age=0, jose JWT/JWKS checks, action-bound nonce, authentication freshness, immutable owner subject binding with wallet proof, separate authenticated attestor and owner PaymentApproval signature. Signed local JWT fixture tests passed. Real issuer sign-in, provider/client-auth compatibility and protected live payment are TODO-HUMAN.

**Applicability:** The protected action is a bounded USDT payment. Fixture identity success is not real World verification and is not production identity assurance. A real success and at least one failure must be captured before selecting this track as completed.

**Code:** [OIDC callback](../apps/api/src/world-oidc.mjs), [token verification](../apps/api/src/world-token.mjs), [owner binding](../apps/api/src/owner-binding.mjs), [attestor](../apps/attestor/src/attestor.mjs), [owner signature](../apps/api/src/owner-signature.mjs). TODO-HUMAN public immutable permalinks.

**Rating:** TODO-HUMAN after real issuer integration. [Debrief](../WORLD_DEBRIEF.md) separates executed fixtures from missing real evidence.

## ENS and other technologies

ENS was not implemented; do not select it. No extra partner integration is claimed. World Docs MCP configuration is a development aid, not runtime identity evidence. EzPayz is teammate source reviewed for compatibility, not a deployed Countersign dependency or independent partner integration.

## Required final fields

- Live web/API: TODO-HUMAN.
- Public repo and actual commit: TODO-HUMAN.
- Video URL and six-step results twice: TODO-HUMAN.
- Verified contract and transaction links: generated in [EVIDENCE.md](proof/EVIDENCE.md) after saving deployed.json.
- AI tools: Codex implementation/review, official documentation lookup, local Node/viem/jose/SQLite tests, human Foundry execution. No fabricated history or real-world success.
- Prior code: [inventory](PRIOR-CODE-INVENTORY.md). TODO-HUMAN creation dates, licenses, prior submissions and fresh/Continuity decision. Pactra relationship remains unanswered.
