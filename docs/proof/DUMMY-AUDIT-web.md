# DUMMY-AUDIT (web/src) — F4 cycle, 2026-11-06

Command: `grep -rniE 'mock|stub|fake|dummy|todo|placeholder' web/src`

| file:line | hit | status |
|---|---|---|
| web/src/components/countersign/OwnerView.tsx:33 | `placeholder="0x…"` (HTML input hint attribute for the mandate ID field) | kept — native input hint, not dummy data or a stubbed integration |

No other hits in production paths. Mocked wallets/APIs exist only in `web/e2e/*.spec.mjs` (test-only, each file headed FIXTURE/MOCKED-WALLET).

Mode labelling in UI: ENS badge (`Live · Sepolia` / `Fixture`, EnsIdentity.tsx) and new World badge (`World: Live` / `Sandbox` / `not configured` / `unknown`, ui.tsx `WorldModeBadge`) both derive from real API responses (`/api/countersign/ens/*`, `/api/network` → API `/v1/network` `world.env`/`world.configured`); nothing is hard-coded as Live.
