# HUMAN-RUN: real World login (WAITING-ON-HUMAN, UNEXECUTED)

Prereq: sandbox World ID app (TestFlight on iOS), sandbox World ID created via "Add proof of human" -> "Manual verify", wait about 1 hour.

1. `pnpm world:smoke` -> expect `RESULT PASS` with `env=sandbox issuer=https://sandbox.auth.world.org`.
2. Register an app in the **sandbox** developer portal. Redirect URI: `https://<api-origin>/auth/world/callback` (and `/auth/world/onboard/callback`). Token auth: `client_secret_post`.
3. In the gitignored `.env`: `WORLD_ENV=sandbox`, `WORLD_ISSUER=https://sandbox.auth.world.org`, `WORLD_CLIENT_ID`, `WORLD_CLIENT_SECRET`, `WORLD_REDIRECT_URI`. Optional `WORLD_ACR=https://world.org/oidc/acr/orb`.
4. Start the API. `curl <api>/v1/network | jq .world` -> `{"env":"sandbox","issuer":"https://sandbox.auth.world.org","configured":true}`.
5. Create an approval (agent request) and open `<api>/auth/world/start?approvalId=<id>` in a browser -> 302 to `https://sandbox.auth.world.org/api/v1/authorize?...&code_challenge_method=S256&max_age=0&nonce=...`.
6. Approve in the World app -> callback JSON `{"approvalId":"<id>","status":"world_ok","next":"owner_wallet_signature_required"}`.
7. Failure path: repeat with a different World ID -> `{"error":"wrong_human"}`; cancel in app -> `{"error":"denied"}`; reload the callback URL -> `{"error":"callback_used_or_expired"}` or `invalid_oauth_state`.
8. Before submission, repeat steps 2-7 with `WORLD_ENV=production` and a real Orb-verified World ID; badge field shows `"env":"production"`.
