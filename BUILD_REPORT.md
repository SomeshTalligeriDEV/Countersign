# Countersign build handoff

Latest risk checkpoint: **75 backend/helper tests**, signed JWT fixtures/shared vectors and UI lint/types pass. Nine new Solidity adversarial tests remain UNEXECUTED. New doctor/resumable deploy/video helpers are documented in HUMAN-RUN step18. No new real-world evidence received.

This is a source/test checkpoint, not submission readiness or a claim that the application works on Whitechain end to end.

## Evidence available

- 71 backend/helper tests passed: docs/proof/cycle5-local-tests.txt. This includes real local signatures, injected fake-chain settlement/rejections, an ordered six-step fixture demo and evidence validation.
- Signed local World JWT fixtures passed: docs/proof/six-cycle-world-fixtures.txt. NOT a real issuer sign-in.
- Shared viem digest tests: docs/proof/six-cycle-shared-tests.txt.
- UI lint and TypeScript passed: docs/proof/cycle5-lint.txt and cycle5-types.txt.
- Human laptop contract evidence: 75 Solidity tests passed in docs/proof/G1-forge-with-vectors.txt, including inherited duplicates and invariants. Newly added script compilation has not been supplied.
- Local compose config validation passed without resolving secret env files: docs/proof/cycle5-compose-validation.txt. No Docker image or remote CI build executed.
- Playwright tests exist but are UNEXECUTED: initial attempt failed because playwright is not installed (cycle2-playwright-attempt.txt). No tests were skipped to obtain green.

## Six requested cycles

| Cycle | Implemented | Practical limit |
| --- | --- | --- |
| 1 M5 demo | Attack CLI, arbitrary GasGuard call, read-only results UI, authenticated separate agent control service, ordered run-all | Fake-chain/model tests pass; two real runs, registry-change onchain proof and explorer reverts still missing |
| 2 M4 remainder | Refund sequence, original-payout/cap checks, plain-English errors, owner/approval mocked-wallet browser tests | Browser tests and wallet/refund execution unexecuted |
| 3 evidence | npm run evidence reads deployed.json, emits EVIDENCE.md and managed README block | Input is absent; all live evidence is TODO-HUMAN. Generator never claims RPC verification |
| 4 M6 docs | README, sponsor feedback/debrief and docs/13 submission answers with source links | Ratings, public permalinks, eligibility and live proof remain TODO-HUMAN |
| 5 M7 config | Web/API/attestor Docker source, private-loopback compose, WebSocket notes, backend/JWT/browser CI | Image build, browser dependency lock generation, hosted deployment and remote CI unexecuted |
| 6 provenance | Full file inventory below and in docs/PRIOR-CODE-INVENTORY.md | Human/staff decision still required; no fresh/Continuity eligibility asserted |

## Real versus fixture-only

Production uses configured RPC/official USDT, jose issuer verification, wallet signatures and confirmed contract logs. Unconfigured services fail explicitly. Local test accounts, World identities, chain responses and dummy transaction hashes exist only in tests. The /demo control runner invokes actual configured agent commands; it does not manufacture success. WebSockets invalidate views, which then fetch authoritative data. API rejection has no onchain revert hash and must not be described as one.

No actual Countersign deployment addresses, first payment tx, real World sign-in, live web/API URL or successful remote CI URL have been supplied in deployed.json. See generated docs/proof/EVIDENCE.md for missing fields. No repo URL/commit link is invented. Agent cannot commit under this workspace's Git permission protocol; all edits remain for human review/commit. Commit count for the current work is not claimed.

## Open risks and limitations

- Provider discovery/token-client authentication compatibility needs a real Agent Pass run. Both approval and onboarding callback URIs must be registered.
- Onboarding binds an existing mandate to a fresh verified identity plus wallet proof; automatic identity rebinding/recovery is not supported.
- Relayer requires one dedicated signer/process. Budgets reserve execution gas only (per permitted cut), not full OP fee accounting. Deep reorg reconciliation is manual. Unknown nonce outcomes block further submissions.
- Wallet setup/refund progress is page-local; inspect wallet/chain before restarting after navigation or unknown outcomes.
- Demo control service is localhost-only, separately configured with a server-only secret, and not automatically started by compose. Fixed scenario commands only; never expose publicly.
- over-budget requires suitable period/perTx/threshold settings. Revoke/replay needs a fresh unused intent and actual owner revocation inside its deadline. Human approval needs an actual owner/device step. No full two-run live proof exists.
- Prior-code origins, licenses/submissions, Pactra relationship and Scale initial-approve gas eligibility are unanswered. Existing global UI styling still has supplied-code provenance.

## Exact human handoff

1. Complete HUMAN-RUN step11: fund owner with official test USDT/WBT, compile/test new scripts, deploy/verify both contracts and run first payment. Save public addresses/txs and exact errors only. Never paste keys.
2. Complete step14: register both callbacks, configure service-local credentials, start real sandbox identity onboarding, complete one approval and one denied attempt. Save evidence without tokens/cookies.
3. Install web/e2e dependencies and Chromium and run browser fixtures per step17. Save generated lockfile. Then manually exercise real owner setup, allowance, allowlist, pause/revoke, merchant/payout/refund, approval and receipt.
4. Start demo control as documented; run all six steps twice with explicit owner actions and record terminal output plus actual transaction/revert links. Exercise arbitrary-relayer-call separately. API-only blocks are labelled as such.
5. Save docs/proof/deployed.json using deployed.example.json schema. Run npm run evidence and inspect every explorer/source link. Do not enter fixture hashes.
6. Build images, configure HTTPS/WSS hosting, persistent DB and isolated secrets; obtain a live URL and successful remote CI. Use the true public origins in World redirects/WebSocket settings.
7. Resolve provenance/track questions; commit genuine increments, add public immutable code links and honest ratings to docs/13 answers, record the video, then submit the form before the event deadline.


## Prior-code inventory

# Prior-code inventory

NEEDS HUMAN DECISION: origins, licenses, prior submissions, disclosure and fresh/Continuity eligibility. No history has been rewritten. Retirement or independent rewrites do not erase source provenance.

| Current file | Source | License | Classification |
| --- | --- | --- | --- |
| `web/AGENTS.md` | `supplied ui /AGENTS.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/Dockerfile` | `supplied ui /Dockerfile` | Unverified | Supplied prior-project material; public/private unverified; subsequently modified |
| `web/README.md` | `supplied ui /README.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke.zip` | `supplied ui /chupke.zip` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/.env.example` | `supplied ui /chupke/.env.example` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/.gitignore` | `supplied ui /chupke/.gitignore` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/README.md` | `supplied ui /chupke/README.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/__init__.py` | `supplied ui /chupke/chupke/__init__.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/agent.py` | `supplied ui /chupke/chupke/agent.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/api.py` | `supplied ui /chupke/chupke/api.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/bitrefill.py` | `supplied ui /chupke/chupke/bitrefill.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/bot.py` | `supplied ui /chupke/chupke/bot.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/config.py` | `supplied ui /chupke/chupke/config.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/gifts.py` | `supplied ui /chupke/chupke/gifts.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/ledger.py` | `supplied ui /chupke/chupke/ledger.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/mandate.py` | `supplied ui /chupke/chupke/mandate.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/pools.py` | `supplied ui /chupke/chupke/pools.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/scam_shield.py` | `supplied ui /chupke/chupke/scam_shield.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/static/pie.html` | `supplied ui /chupke/chupke/static/pie.html` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/zcash_wallet.py` | `supplied ui /chupke/chupke/zcash_wallet.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/chupke/zip321.py` | `supplied ui /chupke/chupke/zip321.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/ARCHITECTURE.md` | `supplied ui /chupke/docs/ARCHITECTURE.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/BITREFILL_PROBLEMS.md` | `supplied ui /chupke/docs/BITREFILL_PROBLEMS.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/BUILD.md` | `supplied ui /chupke/docs/BUILD.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/CHECKLIST.md` | `supplied ui /chupke/docs/CHECKLIST.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/DEMO.md` | `supplied ui /chupke/docs/DEMO.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/PIE_INTEGRATION.md` | `supplied ui /chupke/docs/PIE_INTEGRATION.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/docs/SUBMISSION.md` | `supplied ui /chupke/docs/SUBMISSION.md` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/requirements.txt` | `supplied ui /chupke/requirements.txt` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/tests/test_api.py` | `supplied ui /chupke/tests/test_api.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/chupke/tests/test_core.py` | `supplied ui /chupke/tests/test_core.py` | Unverified | Supplied prior-project material; public/private unverified |
| `web/eslint.config.mjs` | `supplied ui /eslint.config.mjs` | Unverified | Supplied prior-project material; public/private unverified |
| `web/next-env.d.ts` | `supplied ui /next-env.d.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/next.config.ts` | `supplied ui /next.config.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/package-lock.json` | `supplied ui /package-lock.json` | Unverified | Supplied prior-project material; public/private unverified |
| `web/package.json` | `supplied ui /package.json` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/file.svg` | `supplied ui /public/file.svg` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/ghost.png` | `supplied ui /public/ghost.png` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/globe.svg` | `supplied ui /public/globe.svg` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/next.svg` | `supplied ui /public/next.svg` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/vercel.svg` | `supplied ui /public/vercel.svg` | Unverified | Supplied prior-project material; public/private unverified |
| `web/public/window.svg` | `supplied ui /public/window.svg` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/app/api/auth/login/route.ts` | `supplied ui /src/app/api/auth/login/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/auth/logout/route.ts` | `supplied ui /src/app/api/auth/logout/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/auth/me/route.ts` | `supplied ui /src/app/api/auth/me/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/auth/verify/route.ts` | `supplied ui /src/app/api/auth/verify/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/balance/route.ts` | `supplied ui /src/app/api/biz/balance/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/cancel/route.ts` | `supplied ui /src/app/api/biz/cancel/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/chat/route.ts` | `supplied ui /src/app/api/biz/chat/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/confirm/route.ts` | `supplied ui /src/app/api/biz/confirm/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/deposit/route.ts` | `supplied ui /src/app/api/biz/deposit/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/orders/route.ts` | `supplied ui /src/app/api/biz/orders/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/biz/rules/route.ts` | `supplied ui /src/app/api/biz/rules/route.ts` | Unverified | Supplied prior-project material; public/private unverified; current handler replaced with retirement stub |
| `web/src/app/api/network/route.ts` | `supplied ui /src/app/api/network/route.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/app/app/page.tsx` | `supplied ui /src/app/app/page.tsx` | Unverified | Supplied prior-project material; public/private unverified; current page replaced with redirect |
| `web/src/app/favicon.ico` | `supplied ui /src/app/favicon.ico` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/app/globals.css` | `supplied ui /src/app/globals.css` | Unverified | Supplied prior-project material; public/private unverified; subsequently modified |
| `web/src/app/layout.tsx` | `supplied ui /src/app/layout.tsx` | Unverified | Supplied prior-project material; public/private unverified; subsequently modified |
| `web/src/app/login/page.tsx` | `supplied ui /src/app/login/page.tsx` | Unverified | Supplied prior-project material; public/private unverified; current page replaced with redirect |
| `web/src/app/page.tsx` | `supplied ui /src/app/page.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/DepositCard.tsx` | `supplied ui /src/components/DepositCard.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/FAQ.tsx` | `supplied ui /src/components/FAQ.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/Footer.tsx` | `supplied ui /src/components/Footer.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/Ghost.tsx` | `supplied ui /src/components/Ghost.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/Hero.tsx` | `supplied ui /src/components/Hero.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/HowItWorks.tsx` | `supplied ui /src/components/HowItWorks.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/LanguageMarquee.tsx` | `supplied ui /src/components/LanguageMarquee.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/LogoMarquee.tsx` | `supplied ui /src/components/LogoMarquee.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/Nav.tsx` | `supplied ui /src/components/Nav.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/Safety.tsx` | `supplied ui /src/components/Safety.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/SeeItWork.tsx` | `supplied ui /src/components/SeeItWork.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/TryIt.tsx` | `supplied ui /src/components/TryIt.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/WaitlistCTA.tsx` | `supplied ui /src/components/WaitlistCTA.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/components/WhatItDoes.tsx` | `supplied ui /src/components/WhatItDoes.tsx` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/lib/authSession.ts` | `supplied ui /src/lib/authSession.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/lib/bizGuard.ts` | `supplied ui /src/lib/bizGuard.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/lib/bizProxy.ts` | `supplied ui /src/lib/bizProxy.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/lib/otpStore.ts` | `supplied ui /src/lib/otpStore.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/src/lib/sendOtpEmail.ts` | `supplied ui /src/lib/sendOtpEmail.ts` | Unverified | Supplied prior-project material; public/private unverified |
| `web/tsconfig.json` | `supplied ui /tsconfig.json` | Unverified | Supplied prior-project material; public/private unverified |
| `web/tsconfig.tsbuildinfo` | `supplied ui /tsconfig.tsbuildinfo` | Unverified | Supplied prior-project material; public/private unverified |

## EzPayz-derived adaptations

| Current file | Source | License | Classification |
| --- | --- | --- | --- |
| `packages/shared/src/amount.mjs` | EzPayz `packages/sdk/src/amount.ts`, commit `0ffd7cc59c899fcc70673b5d65b5e27999282338` | No license file found in reviewed checkout; permission scope unverified | Teammate project, not a public-library dependency; parser independently rewritten during this build; history disclosed |
| `apps/api/src/approvals.mjs` | Durable uniqueness pattern reviewed in EzPayz `apps/api/src/plugins/idempotency.ts`, same commit | No license file found; permission scope unverified | Teammate-project pattern adapted to SQLite unique insert; no Prisma plugin copied |

EzPayz source: https://github.com/SomeshTalligeriDEV/EzPayz . Clone availability does not establish a reuse license or start-fresh eligibility. No more source copied. Ask human/staff whether it is prior/private work and what disclosure is required. Pactra relationship remains TODO-HUMAN.

## Public libraries versus project code

Next.js, React, viem, jose, ws, OpenZeppelin and test tooling are public library dependencies with upstream licenses; they are distinct from the supplied project code above. Exact license/supply-chain audit is not completed. New Countersign components under web/src/components/countersign and new owner/approve/merchant/demo/r routes were authored during this session; they still consume the supplied global layout/theme, so frontend-wide clean-room eligibility is not claimed.

Inventory is based on baseline ui-tree mappings and visible source review. Archived web/chupke and the zip are prior-project material even when unused. Token/compiler binaries and node_modules are not listed as authored project files.
