# Deployment status

CI runs backend tests, contract formatting/tests, and the supplied UI lint/build independently. Publication to GHCR occurs only after all jobs succeed on a push to main, using the exact tested commit and an immutable commit tag. Neither workflow has run remotely yet; a public GitHub repository is still required.

The UI Dockerfile runs as a non-root user and includes an HTTP health check. Build from the repository root:

```sh
docker build -f 'ui /Dockerfile' -t countersign-web .
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
