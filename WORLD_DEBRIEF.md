# World ID Agent Pass integration debrief

Status: **FIXTURE-only.** No real World issuer sign-in has happened. App registration and phone sign-in are WAITING-ON-HUMAN (HUMAN-RUN.md H4).

## Implemented and tested against local fixtures
Issuer discovery, authorization code + S256 PKCE, `max_age=0` (apps/api/src/world-oidc.mjs:24), state/nonce/browser-cookie binding, jose signature + issuer/audience/expiry/auth_time checks (apps/api/src/world-token.mjs:2), owner subject binding with wallet signature, separate loopback attestor. Signed RS256/JWKS fixture tests passed (docs/proof/loop-M3-signed-fixtures.txt, docs/proof/world-fixtures-verified.txt). This is not World verification.

## Friction actually recorded
- World sandbox developer MCP was not available in the agent sessions, so app registration could not be done through it (STATUS.md, W4 row and "Environment" section).
- Fetching the official World ID skill: the `.md` endpoint failed; the HTML version loaded (STATUS.md, "Official World docs and MCP compatibility review").
- auth.world.org guide retrieval failed through the earlier agent's documentation browser (prior debrief, sandbox-era). Not attributed to World infrastructure.
- `jose` was initially missing (ERR_MODULE_NOT_FOUND) in the sandbox; installed in a normal terminal, after which fixtures passed (docs/proof/LOOP-LOG.md, docs/proof/loop-M3-jwt-attempt.txt).

## Not yet known
Time to first real verification, provider client-auth compatibility, whether a transaction-binding message is supported. Recorded only after a real sandbox success and one denied attempt.
