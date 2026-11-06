# Deployment status

CI runs backend tests, contract formatting/tests, and the supplied UI lint/build independently. Publication to GHCR occurs only after all jobs succeed on a push to main, using the exact tested commit and an immutable commit tag. Neither workflow has run remotely yet; a public GitHub repository is still required.

The UI Dockerfile runs as a non-root user and includes an HTTP health check. Build from the repository root:

```sh
docker build -f 'web/Dockerfile' -t countersign-web .
docker run --rm -p 3000:3000 countersign-web
```

This currently packages the supplied UI, not a completed Countersign frontend. No automatic production rollout is configured until the API, attestor, integrations and destination exist. An image publication is not a live deployment.

Dependency installation is currently blocked by local DNS. Lockfiles must be generated and reviewed once registry access works; switch CI/container installation to frozen lockfiles before release. Current manifests are not a reproducible dependency closure. Pin GitHub Actions to reviewed commit SHAs before production.

## Storage and workers

The backend persistence primitive uses Node 24's built-in SQLite with WAL, transactions and a busy timeout. Use a persistent local volume. Do not run multiple independent relayers with the same signing key. Reservations survive restart and remain charged when broadcast outcome is unknown. Chain reconciliation is still required before automatic retries or releasing reservations.

Redis/BullMQ is not currently required or integrated. For distributed webhook workers, retain SQLite's transactional outbox as the source of truth and dispatch committed outbox IDs to BullMQ. Configure Redis persistence and noeviction; jobs must be idempotent. Never blindly retry transaction broadcasting.

## Release gates

- Complete the specified contract/API tests and digest parity tests.
- Verify official USDT address, decimals and chain ID through RPC.
- Deploy and verify contracts; record real settlement evidence.
- Configure separate relayer and attestor keys, World client and redirect URI, and wallet provider.
- Exercise owner, agent and merchant journeys, including denied and expired approval paths.
- Verify backups, recovery, webhook retries, observer backfill and transaction reconciliation.
- Deploy the exact tested image digest; retain the prior digest for rollback. Database migration rollback requires a tested backup strategy.

## Loop deployment increment (supersedes older component status)

API and attestor source image: apps/api/Dockerfile. It installs locked Node dependencies and compiles the actual contracts in a Foundry stage so the runtime adapter has generated ABIs. Image tag availability/build is unverified here. The attestor uses the same image but a separate process/secret environment. Local compose is deploy/compose.yml; its attestor shares the API network namespace so localhost HMAC traffic stays private. Never expose port3002.

Copy service examples into gitignored deploy/api.env and deploy/attestor.env. Keep ATTESTOR_KEY only in attestor.env. Both mount the same SQLite volume. Configure actual deployment addresses, both World redirects and browser origins. The local compose ports bind loopback; this is a local preview, not a public live URL. Production requires HTTPS/WSS proxying, exact public origins/redirects and persistent storage. Update the websocket build argument before rebuilding web for deployment.

```sh
docker compose -f deploy/compose.yml config --quiet
docker compose -f deploy/compose.yml build
docker compose -f deploy/compose.yml up -d
```

UNEXECUTED. Do not print resolved compose config because it can expose environment secrets; --quiet validates without dumping values. Readiness may be 503 while unconfigured/backfilling/disabled, even when process liveness is green. No hosted deployment destination or credentials are provided yet. CI now includes signed local JWT tests and API dependency installation; remote workflow remains unverified.

## Browser and demo services

Playwright is isolated in web/e2e/package.json so the existing web runtime lockfile stays valid. From a normal terminal:
```sh
npm install --prefix web/e2e --ignore-scripts
cd web/e2e
npx playwright install chromium
npm test
```
Mocked wallet/API tests are fixture evidence only. Save the generated e2e lockfile for reproducible future runs. CI installs Chromium and runs this suite; remote execution is unverified.

The demo control service runs separately via `npm --prefix apps/demo-agent run control`, holds only the agent key, binds 127.0.0.1:4001 and requires DEMO_CONTROL_SECRET shared with the web server. Web/API both require DEMO_MODE=1 for demo operations. Never expose this control service publicly. It supports only fixed scenario names, does not execute arbitrary shell commands, and stores run results in SQLite. The local compose does not launch it automatically. API/Web/attestor source Dockerfiles exist; attestor/Dockerfile requires building/tagging countersign-runtime first. No Docker image build has been verified here.

WebSockets need TLS-compatible Upgrade forwarding and idle timeout above the 30s heartbeat. Set exact WEBSOCKET_ORIGINS, public WSS build URL and both World callback URIs. Socket invalidation is not settlement proof. External app URLs, secrets and hosting credentials remain TODO-HUMAN.
