# Countersign: seven-slide reader and speaker notes

Illustrations are explanatory, not screenshots. Public links are reported separately from fresh verification.

## 1. Your agent. Your rules.

Countersign addresses a specific authorization problem: an autonomous agent should be allowed to request a purchase without receiving unrestricted control of a treasury. It combines a Whitechain spending-policy contract, fresh World sandbox authentication plus an exact owner signature, and ENSv2 identity discovery and scoped record administration. The illustrations are fictional explanatory artwork; they are not screenshots, identity proofs or evidence of deployed behavior. No claim of independent audit, production readiness or a new cryptographic primitive is made. Intended users are organizations and developers integrating bounded agent purchases, not holders of a new project token.

Sources:

- README.md
- docs/PROTOCOL_SPECIFICATION.md
- research/paper/main.tex

## 2. Three protocols. One bounded payment.

The owner is the treasury: createMandate uses msg.sender, not an arbitrary funding-account parameter. The owner approves a limited allowance to Mandate and chooses agent, attestor, limits, merchants and expiry. A separate merchant application integrates @countersign/merchant; @countersign/agent signs exact intents. The facilitator validates, simulates and reserves GasGuard budget before relay. The observer projects actual events, with three successor blocks as an application confirmation policy rather than irreversible L1 finality. Signed webhooks, receipt history and CSV export support merchant integration. Refunds are bounded by paid amount and require the original payout account to authorize and fund them; there is no forced reversal. API, attestor and RPC trust remain explicit. The latest README reports Cloudflare web and a Render API/attestor container, with ephemeral storage and idle-sleep limitations.

Sources:

- contracts/src/Mandate.sol
- contracts/src/MerchantRegistry.sol
- apps/api/src/facilitator.mjs
- packages/merchant/src/index.mjs
- packages/agent/
- apps/attestor/
- deploy/render-start.sh

## 3. A name is not spending authority.

Recorded ENS identity: agent1.countersign.eth on Ethereum Sepolia chain 11155111. UserRegistry 0x4aDb9CecA5b9A70000C3F7Df5Af0831535f649Ca; PermissionedResolver 0x64b67a1903eD1923F98A3a74Cc4Ed539be40d456. Official ENSv2 documentation confirms that text-key roles apply across a resolver instance, not one name; a dedicated resolver is part of agent isolation. Endpoint/context keys follow draft ENSIP-26; countersign policy records are application-specific. Historical drift reported 7/8 comparisons: the merchant-set aggregate is missing because the deployed contract uses a mapping, not a directly comparable set hash. Do not manufacture 8/8. Missing governance/name binding also prevents whole-passport VERIFIED. The optional persistent monitor fails closed for affected relayed requests; it does not block direct Whitechain calls that satisfy contract policy. ENS revocation and Whitechain epoch changes are separate, non-atomic operations. Fork interfaces compile, but deployed-state negative/revocation execution remains unverified in saved acceptance records.

Sources:

- packages/ens/src/
- packages/ens/fork/Delegation.t.sol
- docs/proof/A15-ens-onchain.md
- docs/release/ENS-MONITOR.md
- https://docs.ens.domains/ensv2/permissioned-resolver/

## 4. 0.50 USDT: request → signature → receipt.

Automatic payments occur below the configured humanThreshold, never above hard perTx/period caps. At or above the threshold the contract requires additional approval. PaymentIntent fields: mandateId, merchantId, payout, registryVersion, amount, orderId, resourceHash, nonce, epoch, deadline. EIP-712 domain is Countersign version 1, runtime chain ID and verifying Mandate. Token identity is immutable deployment state. Runtime token decimals are read rather than assuming six in general code. Chain 1874 official USDT: 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7. Mandate: 0x923298375911A173da34C715da2718c0c9889EbA. Registry: 0x2686f693A2C959568e650e0A5563E6244f2329E2. The deployed route uses approve + transferFrom; no successful permit/EIP-3009 flow or universal gasless onboarding is claimed. README at commit 5688b18 records the later 0.50 transfer linked below; this presentation pass could not freshly retrieve the RPC/explorer. Ledger persists transaction bytes/hash/nonce before broadcast; ambiguous submissions require reconciliation. One relayer signer/process and incomplete OP fee accounting remain limitations.

Sources:

- contracts/src/Mandate.sol
- apps/api/src/relay-ledger.mjs
- apps/api/src/gasguard.mjs
- apps/api/src/observer.mjs
- https://explorer.testnet.whitechain.io/tx/0x3b7fe78d21cf28f3fe883a04ed7617bba6a22f62889775da41ccd465c27009d9

## 5. A login is not a payment approval.

Historical proof A2-world-approval records a 1.50-USDT payment after a World sandbox sign-in, owner signature and attestor signing; command order-40 used a configured 1.50 price and 1.00 threshold. World sandbox identities are mocked test identities, not production personhood. OIDC authorization-code flow uses PKCE S256, max_age=0, random state, browser binding and a nonce combining stored approval digest with fresh randomness. jose/JWKS validates ID-token signature, issuer/audience, nonce, timestamps, subject and configured assurance. world_ok is not permission to pay. The owner signs PaymentApproval binding intentDigest, mandate, merchant, payout, amount, epoch and deadline; ERC-1271 owners are supported. The separate attestor reads/recomputes stored digests and signs WorldAttestation, including authTime. Contract MAX_AUTH_AGE is 300 seconds; API approval/freshness window is at most 120 seconds and intent deadlines still apply. The onchain contract trusts the attestor for identity interpretation; it does not validate a World token itself. Session/origin-checked cancellation cannot erase exported signatures. Failed/denied/expired/wrong_human/stale_auth paths include local fixtures; preserve the separate historical live refusal records. The artwork is explanatory, not a phone screenshot or successful live demonstration.

Sources:

- apps/api/src/world-oidc.mjs
- apps/api/src/approvals.mjs
- apps/api/src/owner-signature.mjs
- apps/attestor/
- docs/proof/A2-world-approval.md
- https://auth.world.org/docs/guides/step-up
- https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531

## 6. Signed terms. Enforced limits. Explicit failures.

pay() checks mandate existence, pause, signed deadline, mandate expiry, epoch, consumed nonce, paid order, merchant allowlist, active registry payout/version, perTx/period bounds, agent signature and threshold approvals before state updates and transfer. nonReentrant and SafeERC20 protect token-call behavior. Spending counters persist across limit/agent/attestor changes and refunds. Revoke increments epoch: it invalidates old-epoch authorizations after inclusion, but a fresh signature by the still-authorized agent can execute. Pause does not increment epoch; an unused unexpired signature may revive on unpause. API-level GasGuard rejection is not an onchain revert; a simulated revert is not a mined transaction either. Not every test label represents unique coverage: inherited Solidity tests repeat. The current evidence verifier validates file integrity separately from receipt/calldata, token events and reconstructible historical policy under RPC trust; unsupported historical ERC-1271 or ambiguous same-block state remains UNVERIFIED. Threats not solved include compromised owner keys, misleading trusted display, malicious merchant delivery, backend/attestor collusion, threshold splitting within budget and deep-reorg consequences. No independent audit or formal proof is claimed.

Sources:

- contracts/src/Mandate.sol
- contracts/test/AdversarialEdges.t.sol
- contracts/test/MandateInvariant.t.sol
- packages/ens/src/payment-evidence.mjs
- docs/release/SECURITY-REVIEW.md
- docs/ASSUMPTIONS_AND_LIMITATIONS.md

## 7. Inspect the proof. Keep the gaps visible.

Current presentation pass reran npm test: 157 passed, zero failed/skipped, log presentation/evidence/node-tests.txt. The 131 Solidity executions and three cross-language vectors are from preserved release logs, not newly rerun for this deck; Solidity count includes inherited repetitions and benchmark cases. Human browser production build passed at an earlier checkout; 35 browser fixtures passed and 5 failed, with source fixes awaiting rerun. ENS fork compilation is distinct from execution. Two historical six-step runs remain 5/6; later standalone payments do not retroactively finish those runs. Latest README at 5688b18 reports Cloudflare frontend https://countersign.someshtalligeri12.workers.dev and Render API https://countersign-api-44lz.onrender.com, a 2:39 video, and a later 0.50 payment. Endpoint retrieval failed in this pass, so current uptime/video playback is unverified. Render notes disclose ephemeral disk and API/attestor co-location; process separation is not strong key isolation. The user supplied https://zenodo.org/records/24025815, but this pass could not retrieve its metadata/PDF; do not invent a DOI, deposited version, license or peer review. A local revision gives Whitechain, World and ENS equal architectural/evaluation attention. Historical gas observations remain single-case local mock-token measurements, not network benchmarks. AI assisted code/research/artwork/deck generation; artwork is original illustrative output. Prior-code creation dates, contributor rights and submission eligibility remain human responsibilities. Next action: inspect contracts and transaction evidence, complete missing live/browser tests, review the balanced paper and verify the intended published version.

Sources:

- presentation/evidence/node-tests.txt
- docs/evidence/final-video-checks/local/checks.json
- docs/evidence/acceptance/20261107T000728602239Z/results.json
- README.md
- research/PUBLICATION-STATUS.md
- https://github.com/SomeshTalligeriDEV/ETHGLOBAL
- https://zenodo.org/records/24025815

