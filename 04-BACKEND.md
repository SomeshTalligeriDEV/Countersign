# 04 · Backend Spec (`apps/api` + `apps/attestor`)

**Stack:** Node 22, Fastify, viem, better-sqlite3 (or Drizzle + SQLite), `jose` for JWT/JWKS. One process for the API, plus a **separate** process for the attestor.

## 1. Data model (SQLite)

```sql
mandates(id TEXT PK, owner TEXT, agent TEXT, attestor TEXT, owner_sub_hash TEXT, created_at INT)
merchants(id TEXT PK, name TEXT, payout TEXT, version INT, webhook_url TEXT, webhook_secret TEXT)
intents(digest TEXT PK, mandate_id TEXT, merchant_id TEXT, order_id TEXT, amount TEXT, json TEXT,
        agent_sig TEXT, status TEXT, created_at INT)
approvals(id TEXT PK, intent_digest TEXT UNIQUE, approval_digest TEXT, state TEXT, nonce_hash TEXT,
          pkce_verifier TEXT, expires_at INT, world_sub_hash TEXT, auth_time INT,
          owner_sig TEXT, attestor_sig TEXT, failure TEXT)
payments(payment_id TEXT PK, mandate_id TEXT, merchant_id TEXT, payout TEXT, amount TEXT,
         order_id TEXT, tx_hash TEXT, block INT, human_approved INT, refunded TEXT, source TEXT)
webhook_deliveries(id TEXT PK, payment_id TEXT, url TEXT, attempt INT, status INT, next_at INT)
gasguard_log(id TEXT PK, mandate_id TEXT, decision TEXT, reason TEXT, gas_used TEXT, at INT)
```

Approval states: `pending_human → world_ok → owner_signed → submitted → settled`, or terminal `denied | expired | wrong_human | stale_auth | failed`.

## 2. REST API

| Method | Path | Caller | Purpose |
|---|---|---|---|
| POST | `/v1/merchants` | Merchant | Register off-chain profile and webhook (onchain `register` done by merchant wallet) |
| GET | `/v1/terms/:merchantId` | Middleware | Current `payout` + `registryVersion` from chain (cached 5s) |
| POST | `/v1/settle` | Merchant middleware (facilitator) | Below-threshold: verify intent, GasGuard, relay `pay()` |
| POST | `/v1/approvals` | Agent | Above-threshold: create pending approval, returns `approvalId` |
| GET | `/v1/approvals/:id` | Agent, web | Status polling |
| GET | `/v1/approvals/:id/terms` | Web `/approve/:id` | Exact terms to display + EIP-712 typed data for the owner wallet |
| GET | `/auth/world/start?approvalId=` | Web | Builds the authorize URL (PKCE, state, nonce, `max_age=0`) |
| GET | `/auth/world/callback` | Browser redirect | Code exchange + id_token validation, then calls the attestor |
| POST | `/v1/approvals/:id/owner-signature` | Web | Store owner sig, check both sigs locally, relay `pay()` |
| POST | `/v1/approvals/:id/cancel` | Web | Owner cancels, state `denied` |
| POST | `/v1/refunds` | Merchant view | Returns calldata for the merchant wallet to send `refund()` |
| GET | `/v1/payments?mandateId=` | Dashboard | List, plus `/v1/payments.csv` export |
| POST | `/v1/demo/attack` | Demo only (`DEMO_MODE=1`) | Builds tampered intents for the six-step demo |

Every request body is validated with zod. Errors are typed: `{ error: "gasguard_rejected", reason: "not_allowlisted_call" }`.

## 3. Facilitator `/v1/settle` (below threshold)

1. Decode `{ intent, agentSig }`. Recompute the EIP-712 digest with **viem** (`hashTypedData`) using the shared types in `packages/shared`.
2. `recoverTypedDataAddress` must equal the mandate's `agent` (read from chain, cached 10s).
3. Pre-check every onchain rule (epoch, nonce, deadline, registry payout and version, limits, allowlist) so the API returns clean errors.
4. If `amount >= humanThreshold`, return `409 needs_approval` (the agent must use `/v1/approvals`).
5. GasGuard (section 5), then `simulateContract` (`eth_call`). On revert, decode the custom error and return it. **Never broadcast a call that simulation rejects.**
6. Broadcast with the relayer key. Return `{ txHash, paymentId }`. The observer marks status.

## 4. World Agent Pass approval (above threshold)

### 4.0 Which World environment

Put the issuer in env: `WORLD_ISSUER=https://sandbox.auth.world.org` for testing, `https://auth.world.org` for production. Every URL below is built from `WORLD_ISSUER`, and discovery is at `$WORLD_ISSUER/.well-known/openid-configuration`. The prize page says proofs are mocked and the sandbox app is no longer needed, but World's testing guide says a sandbox World ID takes about an hour to issue. **Confirm with the World booth in hour one which issuer and test identity to use.**

### 4.1 Onboarding: bind the owner's World identity

When the owner creates a mandate in the dashboard, they do one World sign-in. Store `owner_sub_hash = keccak256(iss || sub)` against the mandate. `sub` is pairwise per sector, which is fine because it's stable for our client. This is the only human who can approve.

### 4.2 Approval request

`POST /v1/approvals { intent, agentSig }`:
- Verify the agent sig and pre-check rules as in section 3.
- Compute `intentDigest`, then build `PaymentApproval` and `approvalDigest` exactly as the contract does.
- Store with `expires_at = now + 120s`. **The approval's `deadline` field equals the intent's deadline**, so the agent sets `deadline ≤ now + 180s` for approvals.
- Notify the owner (dashboard toast and link).

### 4.3 World sign-in bound to this approval

Authorize URL (OIDC, auth code + S256 PKCE):

```text
GET $WORLD_ISSUER/api/v1/authorize
  client_id=$WORLD_CLIENT_ID
  redirect_uri=$WORLD_REDIRECT_URI
  response_type=code
  scope=openid
  state=<approvalId>.<random>
  nonce=base64url(sha256(approvalDigest || random))      # stored as nonce_hash
  code_challenge=<S256(verifier)>  code_challenge_method=S256
  max_age=0                                               # force fresh authentication
  acr_values=https://world.org/oidc/acr/orb               # if available in the mock env; else omit and log
```

Callback:
1. Check `state` matches a pending approval and `iss` equals `WORLD_ISSUER` exactly. An `error=access_denied` sets state `denied`.
2. `POST $WORLD_ISSUER/api/v1/token` (form-encoded, `client_secret` server-side, `code_verifier`). Exchange the code exactly once.
3. Validate the `id_token` with `jose`: RS256 signature via `jwks_uri` from `/.well-known/openid-configuration`; `iss`; `aud == client_id`; `exp`; `nonce == stored`; `now - auth_time ≤ 120`; `keccak(iss||sub) == owner_sub_hash`. A mismatch sets state `wrong_human`, and stale auth sets `stale_auth`. Check `acr` if you requested it.
4. Call the attestor (section 6) with `{ approvalId }` only. **Never send it the digest from the browser.** The attestor reads the digest from the DB itself.

Why we built our own approval page instead of the device flow: World's device flow shows only a user code. It can't display payment terms, and the docs say binding messages aren't supported. Our page shows the terms, and the World sign-in is cryptographically tied to them through `nonce = H(approvalDigest)` and the attestor signature.

### 4.4 Owner signature, then execution

After `world_ok`, the approval page asks the owner wallet to sign `PaymentApproval` (`eth_signTypedData_v4`). The wallet shows amount, payout and merchant in plain fields. The API:
1. Recovers the signer, which must equal the mandate `owner`.
2. Checks the approval hasn't expired.
3. Simulates `pay(intent, agentSig, ownerSig, att, attestorSig)`, then broadcasts via the relayer.

## 5. Relayer + GasGuard

The relayer key holds **WBT only** (from the faucet: 0.5 WBT per 24h, GitHub account at least 30 days old). Top it up from team members' faucet claims early.

| Rule | Enforcement |
|---|---|
| Allowlisted calls | Only `Mandate.pay` and an owner-signed `revoke`, to the deployed `MANDATE` address. Anything else gives `gasguard_rejected: not_allowlisted_call`. |
| Simulation first | `simulateContract` must succeed. Otherwise `gasguard_rejected: would_revert:<Error>`. |
| Per-mandate budget | Max 30 relayed tx per mandate per hour, max 0.02 WBT per mandate per day |
| Per-IP / per-agent rate | 10 req/min on `/v1/settle` and `/v1/approvals` |
| Global cap | `GASGUARD_DAILY_WBT` total. When hit, a circuit breaker returns `relayer_unavailable`. |
| Pause | `RELAYER_PAUSED=1` kill switch |
| Gas price cap | Refuse if `maxFeePerGas` is above the configured cap |
| Nonce manager | Single in-process queue, so there are no nonce races |

Every decision is written to `gasguard_log` and shown in the dashboard. The demo shows a rejected arbitrary call.

**Who pays the gas, for the README:** the merchant or company is billed off-chain per relayed payment (business model). For the hackathon, the relayer is funded from faucet WBT.

## 6. Attestor service (`apps/attestor`)

A separate process with its own `ATTESTOR_KEY`. It listens on localhost only, with HMAC-authenticated requests from the API.

`POST /attest { approvalId }`:
1. Read the approval row **directly from the shared DB** (read-only connection). Require `state == world_ok`, not expired, and `world_sub_hash == owner_sub_hash`.
2. Recompute `approvalDigest` from the stored intent JSON. Never trust a digest passed in.
3. Mark the row attested **before** signing (single use). Sign `WorldAttestation{approvalDigest, ownerSubHash, authTime}` with EIP-712.
4. Rate limit: 5 attestations per mandate per hour.

The contract trusts `policy.attestor`, set by the owner. Rotating it means `setAttestor`, which bumps the epoch.

## 7. Chain observer

Poll `PaymentExecuted`, `PaymentRefunded` and `Revoked` logs every 2s (1s blocks). Wait 3 confirmations, then update `payments` and approvals and enqueue webhooks. On restart, backfill from the last processed block. **Status comes only from logs.**

## 8. Webhooks

`POST merchant.webhook_url` with header `X-Countersign-Signature: t=<ts>,v1=HMAC_SHA256(secret, ts + "." + body)`. Events: `payment.succeeded`, `payment.refunded`. Retry at 1m, 5m, 30m, 2h. Idempotency key = `paymentId`.

## 9. Secrets

`WORLD_CLIENT_SECRET` and `RELAYER_KEY` live only in `apps/api` env. `ATTESTOR_KEY` lives only in `apps/attestor` env. Nothing secret goes in `apps/web`. Commit `.env.example`, never `.env`.
