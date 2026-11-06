# EzPayz integration review

Source: https://github.com/SomeshTalligeriDEV/EzPayz
Checkout: /Users/somesh.s.talligeri/Desktop/EzPayz-review.tfoIPj
Reviewed main HEAD: 0ffd7cc59c899fcc70673b5d65b5e27999282338 (2026-11-06T09:29:04+05:30).

Read AGENTS.md, PLAN.md, selected README/PROGRESS sections and relevant payment/config/SDK source. This is a selective review, not a full audit. The original checkout was not edited. No git merge was performed.

## Accepted change

Adapted packages/sdk/src/amount.ts into Countersign packages/shared/src/amount.mjs and wired it into merchant quotes. Removed the source's default six-decimal assumption: token decimals are mandatory runtime input. Added strict decimal validation, uint256 bounds and precise bigint formatting. Attribution is in the source file. Tests cover 0/6/18/36/255 decimals, precision loss, invalid input and overflow.

## Frontend instruction

User explicitly requires keeping Countersign's frontend. Do not import EzPayz React/Vite UI, styles, mock services or DEMO configuration. No frontend code has been copied. Existing Countersign design/provenance constraints still apply.

## Compatibility findings

- EzPayz uses Fastify/Postgres/Prisma/BullMQ and subscription/EIP-3009 payment authorization; Countersign uses the specified Mandate/Registry protocol and SQLite. Blind merging would change contract guarantees and schema semantics.
- apps/web/src/config/app.ts still declares demoMode:true and mock delays. This is not proof that every frontend route is mocked, but prohibits treating the whole frontend as live by default.
- Source search found no World ID, OIDC or Agent Pass implementation in apps/packages source. World work must continue in Countersign.
- GasGuard source explicitly labels budget/rate checks incomplete. Do not replace Countersign's stronger reservation checks with it.
- Deployment addresses and tx claims are teammate-reported evidence, not independently RPC-verified here, and not deployments of Countersign's contracts.
- PLAN.md is dated October 31 and deployment comments reference November 1. Record dated history for submission provenance; do not assert start-fresh eligibility or rewrite history.

## Remaining work

Review further backend/queue/wallet utilities only when they fit Countersign's spec. Implement frontend integrations in Countersign, without importing the teammate UI. No secrets were read or copied. Real World credentials, jose installation and issuer verification remain outstanding.
