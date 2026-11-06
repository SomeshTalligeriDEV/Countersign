# World ID Agent Pass integration debrief

Status: **REAL against the sandbox issuer** `https://sandbox.auth.world.org` (World states sandbox proofs use mocked identities). Client: CIMD public client served by our API over a Cloudflare quick tunnel. Success: 1.50 USDT human-approved payment, tx [0x98fa…b531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531). Failures: stale_auth after a real sign-in refused (`approval_not_ready`, no tx); expired approval, no tx. Evidence: docs/proof/A2-world-approval.md. Production issuer not run. IDKit not built.

## Time to first success
Portal registration attempts: ~1 h, blocked. CIMD code started ~19:10Z 2026-11-06; first real approval settled 19:32:02Z (~20 min).

## Implemented (also tested against local fixtures)
Issuer discovery, authorization code + S256 PKCE, `max_age=0` (apps/api/src/world-oidc.mjs:24), state/nonce/browser-cookie binding, jose signature + issuer/audience/expiry/auth_time checks (apps/api/src/world-token.mjs:2), owner subject binding with wallet signature, separate loopback attestor. Signed RS256/JWKS fixture tests passed (docs/proof/loop-M3-signed-fixtures.txt, docs/proof/world-fixtures-verified.txt). Fixtures alone are not World verification; the real sandbox run is above.

## Live read-only checks (REAL)
`pnpm world:smoke` 2026-11-06 against sandbox (`https://sandbox.auth.world.org`) and production (`https://auth.world.org`): discovery 200, issuer match, same-origin endpoints, PKCE S256, RS256 id_token, `auth_time` claim, `iss` in authz response, device grant endpoint, JWKS RSA key resolved by jose: RESULT PASS for both (docs/proof/F2-world-smoke.txt). (Read-only check.)

## Friction actually recorded
- Client registration returned `account_not_eligible` on both portals (sandbox.auth.world.org/portal and developer.world.org), so no client id/secret could be issued.
- CIMD (client ID metadata document) was the way through, but its required metadata fields for agent hosts are not documented; we found them by trial (apps/api/src/world-cimd.mjs).
- First CIMD attempt failed with `invalid_scope: "CIMD hosts require openid offline_access."`; `offline_access` was not mentioned in the docs we followed.
- Callbacks must be HTTPS, so `http://localhost` could not be used; we ran the API behind a Cloudflare quick tunnel.
- Device-flow tokens omit `nonce` (per auth.world.org OIDC guide), so the device path cannot bind via nonce; Countersign relies on `auth_time` freshness instead (apps/api/src/world-device.mjs, FIXTURE test in apps/api/test/world-device.test.mjs). Device flow is not yet routed in server.mjs.
- The step-up guide does not use the term "Agent Pass"; mapping the prize name to the OIDC flows was our inference (docs/proof/INTEGRATION-SOURCES.md).
- World sandbox developer MCP was not available in the agent sessions, so app registration could not be done through it (STATUS.md, W4 row and "Environment" section).
- Fetching the official World ID skill: the `.md` endpoint failed; the HTML version loaded (STATUS.md, "Official World docs and MCP compatibility review").
- auth.world.org guide retrieval failed through the earlier agent's documentation browser (prior debrief, sandbox-era). Not attributed to World infrastructure.
- `jose` was initially missing (ERR_MODULE_NOT_FOUND) in the sandbox; installed in a normal terminal, after which fixtures passed (docs/proof/LOOP-LOG.md, docs/proof/loop-M3-jwt-attempt.txt).

## Missing documentation
CIMD client metadata fields (which are required, allowed values, the `offline_access` requirement) for agent hosts.

## One improvement with the greatest impact
Document CIMD for agent hosts end to end (metadata fields, required scopes), and make `account_not_eligible` say why and what to do instead.

## Not yet known
Production issuer behavior, whether a transaction-binding message is supported.
