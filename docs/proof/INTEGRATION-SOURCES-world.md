# World integration sources (fetched 2026-11-06)

| URL | Used for |
|---|---|
| https://auth.world.org/docs/ | Supported flows: auth code + PKCE S256, device grant (RFC 8628), `(iss, sub)` pairwise binding, step-up (RFC 9470) |
| https://auth.world.org/docs/guides/getting-started | Production issuer `https://auth.world.org`; same-environment registration/discovery rule |
| https://auth.world.org/docs/guides/step-up | `max_age=0` freshness, `acr_values`/`claims` (validate returned `acr` yourself), device flow always fresh, human checkpoints, headless = device grant. No "Agent Pass" term on this page |
| https://auth.world.org/docs/guides/testing | Sandbox issuer `https://sandbox.auth.world.org`; no simulator; sandbox World ID via app "Manual verify"; wait ~1h; checklist used for HUMAN-RUN-world.md |
| https://auth.world.org/docs/guides/oidc | Token auth methods (client_secret_post supported), RS256 JWKS, validate `iss` on callback, device poll rules (`authorization_pending`, `slow_down` +5s, 503 never approval, device tokens omit `nonce`, 20 min code) |
| https://sandbox.auth.world.org/.well-known/openid-configuration (curl) | Live discovery: endpoints, `device_authorization_endpoint`, `claims_supported` incl. `auth_time`/`acr`/`amr`, `authorization_response_iss_parameter_supported:true` |
| https://auth.world.org/.well-known/openid-configuration (curl) | Same for production |
| https://docs.world.org/world-id/idkit/integrate | IDKit 4 server verify = `POST https://developer.world.org/api/v4/verify/{rp_id}`, forward payload as-is, store nullifier per action |
| https://ethglobal.com/events/mumbai/prizes/world | Agent Pass prizes require official Agent Pass integration + backend validation + protected action + failed path; IDKit is required **only** for the separate "Best Use of IDKit" prizes |

Decision: IDKit verify path NOT implemented. Countersign targets the Agent Pass prize, which the prize page says does not require IDKit (see docs/WORLD-INTEGRATION-REVIEW.md: IDKit proofs are not OIDC identities and must not be converted into one).

Decision: device flow implemented in `apps/api/src/world-device.mjs` (docs support it for headless clients); not routed in server.mjs yet.
