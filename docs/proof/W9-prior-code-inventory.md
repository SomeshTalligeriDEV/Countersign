# W9 Prior-code inventory

Generated 2026-11-06. Base: docs/PRIOR-CODE-INVENTORY.md, `git show 27f079d --stat` (supplied `ui /` tree, renamed to `web/` in eeaf6a0), `grep -ri ezpayz`, import tracing in web/src.

License: no LICENSE file anywhere in the repo (`find . -name 'LICENSE*'` outside node_modules = none). web/package.json is `"name": "zacc", "private": true`, no license field. Public/private: no public repo URL for chupke/zacc in any README (web/README.md links only to vercel/next.js). EzPayz has a GitHub URL (https://github.com/SomeshTalligeriDEV/EzPayz); whether it is public is UNKNOWN (not fetched), license UNKNOWN (no license file found per docs/EZPAYZ-INTEGRATION.md).

"Used?" means imported/loaded by active Countersign code after this W9 change.

| File / dir | Source project | License | Public? | Used by Countersign? | Action |
| --- | --- | --- | --- | --- | --- |
| `web/chupke/` (python app, docs, tests, .env.example) | chupke (supplied ui) | none found | UNKNOWN | No. Not in pnpm test, not imported | Recommend removal (human) |
| `web/chupke.zip` | chupke | none found | UNKNOWN | No | Recommend removal (human) |
| `web/AGENTS.md`, `web/README.md` | supplied ui (zacc, create-next-app text) | none found | UNKNOWN | No (docs) | Recommend removal/rewrite (human) |
| `web/package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `next-env.d.ts`, `tsconfig.tsbuildinfo` | supplied ui (mostly create-next-app scaffolding) | none found; scaffold is Vercel MIT template | UNKNOWN | **Yes**: build config for the whole web app | NEEDS HUMAN DECISION (generic scaffold; package name still `zacc`) |
| `web/Dockerfile` | supplied ui, modified | none found | UNKNOWN | Yes (deploy) | NEEDS HUMAN DECISION |
| `web/public/{file,globe,next,vercel,window}.svg` | create-next-app defaults via supplied ui | Vercel template | UNKNOWN | No refs found | Recommend removal |
| `web/public/ghost.png` | chupke | none found | UNKNOWN | Yes, by `Ghost.tsx` (landing only) | See landing row |
| `web/src/app/favicon.ico` | supplied ui | none found | UNKNOWN | Yes (auto-served) | NEEDS HUMAN DECISION (replace icon) |
| `web/src/app/globals.css` | supplied ui, modified | none found | UNKNOWN | **No longer** (was loaded by root layout) | REPLACED by new `countersign.css` + `landing-motion.css`; recommend removal |
| `web/src/app/layout.tsx` | supplied ui, modified | none found | UNKNOWN | Yes (root layout of all routes) | Content is now Countersign-only (metadata + html/body); import rewired. NEEDS HUMAN DECISION on provenance label |
| `web/src/app/page.tsx` + `components/{Nav,Hero,LogoMarquee,SeeItWork,WhatItDoes,LanguageMarquee,HowItWorks,Safety,FAQ,WaitlistCTA,Footer,Ghost,TryIt}.tsx` | chupke landing (supplied ui) | none found | UNKNOWN | **Yes**: `/` landing page | NEEDS HUMAN DECISION. ~650 lines of marketing UI; not rewritten (design/copy decision, not small) |
| `web/src/components/DepositCard.tsx` | chupke | none found | UNKNOWN | No (not imported) | Recommend removal |
| `web/src/lib/{authSession,bizGuard,bizProxy,otpStore,sendOtpEmail}.ts` | chupke | none found | UNKNOWN | No: only imported by each other/DepositCard; auth/biz routes are retirement stubs | Recommend removal |
| `web/src/app/api/auth/*`, `api/biz/*`, `app/page.tsx`, `login/page.tsx` | supplied ui, replaced with stubs/redirects | none found | UNKNOWN | Routes exist but do no prior logic | Recommend removal (human) |
| `web/src/app/api/network/route.ts` | supplied ui path, body is Countersign (Whitechain 1874) | none found | UNKNOWN | Yes | Path only is prior; NEEDS HUMAN DECISION whether to re-create |
| `packages/shared/src/amount.mjs` | EzPayz `packages/sdk/src/amount.ts` @0ffd7cc | UNKNOWN (no license file) | UNKNOWN | Yes (merchant quotes) | Already "independently rewritten" per prior doc, with attribution. NEEDS HUMAN DECISION (teammate permission) |
| `apps/api/src/approvals.mjs` | pattern from EzPayz `idempotency.ts` | UNKNOWN | UNKNOWN | Yes | Pattern only, no code copied (per prior doc). NEEDS HUMAN DECISION |
| `web/src/components/countersign/*`, `web/src/lib/countersign-*.ts`, owner/approve/merchant/demo/r routes | Countersign (new) | n/a | n/a | Yes | Clean; import only new libs |
| `web/src/app/countersign.css`, `web/src/app/landing-motion.css` | Countersign (new, W9) | n/a | n/a | Yes | Written from scratch, no code copied |

## Open human decisions
1. Landing page `/` (13 chupke components + ghost.png) is still prior code in active use. Rewrite or replace with a minimal Countersign landing?
2. EzPayz: confirm teammate permission/license and public status for amount.mjs and approvals.mjs pattern.
3. Delete unused prior code: web/chupke/, web/chupke.zip, DepositCard.tsx, src/lib chupke libs, auth/biz stub routes, app/ and login/ redirects, default public SVGs, globals.css.
4. Scaffold files (package.json named `zacc`, Dockerfile, favicon, configs): rename/re-create or disclose.
5. Pre-existing: `next build` fails prerendering `/approve/[id]` with and without the W9 change (not caused by W9).

## F5 update (2026-11-06): human-approved removal and rewrites
Before each deletion `grep -rn` over web/src, web/e2e, web/Dockerfile, web/next.config.ts confirmed no remaining importer outside the deleted set.

Removed:
- `web/chupke/`, `web/chupke.zip`
- `web/src/components/{Nav,Hero,LogoMarquee,SeeItWork,WhatItDoes,LanguageMarquee,HowItWorks,Safety,FAQ,WaitlistCTA,Footer,Ghost,TryIt,DepositCard}.tsx`
- `web/public/ghost.png`, `web/public/{file,globe,next,vercel,window}.svg` (`web/public/.gitkeep` kept so the Dockerfile `COPY public` still works)
- `web/src/lib/{authSession,bizGuard,bizProxy,otpStore,sendOtpEmail}.ts`
- `web/src/app/api/auth/*`, `web/src/app/api/biz/*`, `web/src/app/login/`
- `web/src/app/globals.css`, `web/src/app/landing-motion.css`

Rewritten from scratch:
- `web/src/app/page.tsx`: minimal Countersign landing (links to /owner, /merchant, /demo), same Tailwind style as the Countersign pages; no prior code.
- `packages/shared/src/amount.mjs`: new implementation (regex split + padded BigInt), same exports and error codes. No written EzPayz permission exists in docs/proof, so the earlier attributed version was replaced.
- `apps/api/src/approvals.mjs` `create()`: idempotency is now a single `INSERT ... ON CONFLICT(intent_digest) DO UPDATE ... RETURNING id` statement; the EzPayz-pattern comment and the insert-then-select pattern are gone.
- `web/package.json` name `zacc` -> `countersign-web` (package-lock.json still shows `zacc` until the next `npm install`; not in scope to touch).

Still prior/scaffold (unchanged): `web/src/app/app/` redirect, `web/AGENTS.md`, `web/README.md`, Dockerfile, favicon, configs.
