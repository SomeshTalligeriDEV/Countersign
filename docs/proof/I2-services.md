# I2 services (local, loopback) — 2026-11-06

Addresses: Mandate 0x923298375911A173da34C715da2718c0c9889EbA, MerchantRegistry 0x2686f693A2C959568e650e0A5563E6244f2329E2, chain 1874, DEPLOYMENT_BLOCK 12366502.

## Key handling (verified in source)
- API relayer: `apps/api/src/server.mjs` reads raw hex `RELAYER_KEY` from env (`privateKeyToAccount`); only when `RELAYER_ENABLED=1`. No keystore support.
- Attestor: raw hex `ATTESTOR_KEY` in env (`apps/attestor/src/server.mjs`), separate process.
- Demo agent: raw hex `AGENT_KEY` in env (`apps/demo-agent/src/cli.mjs`, `run-all.mjs`).
- Keys are derived from Foundry keystores straight into gitignored files, never printed:
  `cast wallet private-key --account deployer --password-file ~/.foundry/deployer.pw` -> `RELAYER_KEY` in apps/api/.env;
  `cast wallet private-key --account agent --password-file ~/.foundry/agent.pw` -> `AGENT_KEY` in apps/demo-agent/.env.

## Env files (all gitignored, checked with `git check-ignore`)
- apps/api/.env: HOST, PORT (3011; :3001 is held by a pre-existing user API process), DATABASE_PATH, WHITECHAIN_RPC_URL, MANDATE_ADDRESS, REGISTRY_ADDRESS, DEPLOYMENT_BLOCK, ATTESTOR_HMAC_SECRET, RELAYER_ENABLED, RELAYER_KEY, RELAYER_PAUSED, GASGUARD_DAILY_WEI, GASGUARD_MANDATE_DAILY_WEI, GASGUARD_MAX_FEE_WEI, WEBSOCKET_ENABLED, WEBSOCKET_ORIGINS. Optional: WORLD_ISSUER, WORLD_CLIENT_ID, WORLD_CLIENT_SECRET, WORLD_REDIRECT_URI, WORLD_ACR (all four or none), DEMO_MODE, TRUSTED_PROXY_IPS.
- apps/attestor/.env: ATTESTOR_KEY, MANDATE_ADDRESS, DATABASE_PATH, ATTESTOR_HMAC_SECRET (same value as API), ATTESTOR_PORT=3002 (API client hard-codes http://127.0.0.1:3002).
- apps/demo-agent/.env: AGENT_KEY, WHITECHAIN_RPC_URL, MANDATE_ADDRESS, REGISTRY_ADDRESS, MANDATE_ID, MERCHANT_ID, MAX_AMOUNT_BASE_UNITS (left empty, orchestrator sets), REPORT_URL, COUNTERSIGN_API=http://127.0.0.1:3011, COUNTERSIGN_WEB, DEMO_CONTROL_SECRET (empty), DEMO_PORT, DEMO_DATABASE_PATH.
- API and attestor share DATABASE_PATH=<repo>/.run/countersign.sqlite.

## Start / stop (from repo root, zsh)
```
mkdir -p .run
(cd apps/attestor && nohup node --env-file=.env src/server.mjs >| ../../.run/attestor.log 2>&1 & echo $! >| ../../.run/attestor.pid)
(cd apps/api && nohup node --env-file=.env src/server.mjs >| ../../.run/api.log 2>&1 & echo $! >| ../../.run/api.pid)
curl -s 127.0.0.1:3002/health/live; curl -s 127.0.0.1:3011/health/ready; curl -s 127.0.0.1:3011/v1/network
kill $(cat .run/api.pid) $(cat .run/attestor.pid)
```
Observer runs inside the API process (needs DEPLOYMENT_BLOCK); its cursor persists in the DB and resumes on restart.

## Health (12:48 UTC)
- attestor :3002 `/health/live` -> 200 `{"status":"alive"}`
- api :3011 `/health/live` -> 200 `{"status":"alive"}`
- api :3011 `/health/ready` -> 503 `{"chainId":1874,"block":"12372917","tokenDecimals":6,...,"observer":{"state":"stopped",...},"settlementEnabled":true,"world":{"env":"sandbox","issuer":"https://sandbox.auth.world.org","configured":false}}`

## Not green
- Observer: BLOCKED by flaky RPC. Backfills one block per ~3 RPC calls from 12366502; any RPC error stops it permanently (by design). Twice it stopped (cursor 12366558, then 12366565). RPC probe: latencies 0.5–10.7 s, one curl TLS error (exit 35). ~6.4k blocks left to backfill. Options: retry when RPC is stable, or (orchestrator decision) a fresh DB with DEPLOYMENT_BLOCK just before registerMerchant 12372123.
- Webhooks: `webhook-worker.mjs` is not started by any process (only used in tests); observer writes to `outbox` but nothing delivers. Wiring it needs an app-source change (out of scope here).
- World: WAITING-ON-HUMAN, no WORLD_CLIENT_ID/SECRET.
