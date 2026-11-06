# Separate attestor service

Run `npm --prefix apps/attestor start` in a separate process after securely loading this directory's env configuration. DATABASE_PATH must point to the same absolute SQLite file used by the API. ATTESTOR_KEY belongs only in this process. ATTESTOR_HMAC_SECRET must be a separate, at-least-32-byte secret shared with the API; never reuse merchant webhook secrets.

The service binds only to 127.0.0.1:3002 (ATTESTOR_PORT can change the port). POST /attest accepts exactly `{ "approvalId": "..." }`, with `X-Countersign-Attestor-Signature` using the same timestamp/raw-body HMAC format as webhook signing. It rejects unsigned, altered, old and oversized requests. Single-use database claims prevent repeated signing, including concurrent requests. Completed signatures are retained in attestor_signatures for API recovery; there is no public signature retrieval endpoint yet.

Failure after claiming but before persistence consumes the claim. Do not reset it automatically; a new approval is required. The API client, signature recovery integration and real World OIDC verification remain unfinished. Tests directly mark fixture approvals world_ok and are not proof of real issuer verification. This service trusts the API's verification state and the shared database; process separation does not protect against an attacker with database write access.
