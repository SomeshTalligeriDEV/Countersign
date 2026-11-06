# World ID Agent Pass integration debrief

Status: **FIXTURE-only.** No real World issuer sign-in has happened. App registration and phone sign-in are WAITING-ON-HUMAN (HUMAN-RUN.md H4).

## Implemented and tested against local fixtures
Issuer discovery, authorization code + S256 PKCE, `max_age=0` (apps/api/src/world-oidc.mjs:24), state/nonce/browser-cookie binding, jose signature + issuer/audience/expiry/auth_time checks (apps/api/src/world-token.mjs:2), owner subject binding with wallet signature, separate loopback attestor. Signed RS256/JWKS fixture tests passed (docs/proof/loop-M3-signed-fixtures.txt, docs/proof/world-fixtures-verified.txt). This is not World verification.

## Live read-only checks (REAL)
`pnpm world:smoke` 2026-11-06 against sandbox (`https://sandbox.auth.world.org`) and production (`https://auth.world.org`): discovery 200, issuer match, same-origin endpoints, PKCE S256, RS256 id_token, `auth_time` claim, `iss` in authz response, device grant endpoint, JWKS RSA key resolved by jose: RESULT PASS for both (docs/proof/F2-world-smoke.txt). No sign-in was performed.

## Friction actually recorded
- Device-flow tokens omit `nonce` (per auth.world.org OIDC guide), so the device path cannot bind via nonce; Countersign relies on `auth_time` freshness instead (apps/api/src/world-device.mjs, FIXTURE test in apps/api/test/world-device.test.mjs). Device flow is not yet routed in server.mjs.
- The step-up guide does not use the term "Agent Pass"; mapping the prize name to the OIDC flows was our inference (docs/proof/INTEGRATION-SOURCES.md).
- World sandbox developer MCP was not available in the agent sessions, so app registration could not be done through it (STATUS.md, W4 row and "Environment" section).
- Fetching the official World ID skill: the `.md` endpoint failed; the HTML version loaded (STATUS.md, "Official World docs and MCP compatibility review").
- auth.world.org guide retrieval failed through the earlier agent's documentation browser (prior debrief, sandbox-era). Not attributed to World infrastructure.
- `jose` was initially missing (ERR_MODULE_NOT_FOUND) in the sandbox; installed in a normal terminal, after which fixtures passed (docs/proof/LOOP-LOG.md, docs/proof/loop-M3-jwt-attempt.txt).

## Not yet known
Time to first real verification, provider client-auth compatibility, whether a transaction-binding message is supported. Recorded only after a real sandbox success and one denied attempt.
