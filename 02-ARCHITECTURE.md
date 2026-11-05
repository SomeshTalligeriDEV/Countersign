# 02 · Architecture

## 1. Principles

1. **The contract is the security boundary.** The backend, relayer and frontend are helpers. None of them alone can move funds or change payment terms.
2. **Agents never hold value.** Funds move `treasury → payout` inside `Mandate.pay()` via `transferFrom` on a limited allowance.
3. **Every payment term is signed.** Amount, merchant, payout address, registry version, order, epoch and deadline are in the signed digest.
4. **Separate keys, separate powers.** World attestor, relayer and owner are different keys. A single compromised key can't pay a tampered or over-limit payment.
5. **Status comes from chain logs**, never from a client callback.

## 2. Components

```mermaid
flowchart LR
  subgraph Buyer["Buyer side"]
    AG["AI agent\n@countersign/agent\n(signs PaymentIntent)"]
    OW["Company owner\nwallet + World app"]
  end
  subgraph Seller["Seller side"]
    MAPI["Demo merchant API\n@countersign/merchant"]
    MD["Merchant view"]
  end
  subgraph CS["Countersign backend (apps/api)"]
    API["REST API + facilitator"]
    APR["Approval service\n(World OIDC validation)"]
    ATT["Attestor signer\n(separate process + key)"]
    GG["GasGuard"]
    RL["Relayer\n(WBT gas key)"]
    OBS["Chain observer"]
    WH["Webhook worker"]
    DB[("SQLite")]
  end
  subgraph WC["Whitechain Sepolia · 1874"]
    MR["MerchantRegistry"]
    MAN["Mandate"]
    USDT[("USDT 0xcedf…5a7")]
    TR["Treasury EOA\n(limited allowance)"]
  end
  WORLD["auth.world.org\n(OIDC)"]
  ENS["ENSv2 · Sepolia\n(optional)"]

  AG -->|"request"| MAPI
  MAPI -->|"402 + terms"| AG
  AG -->|"signed intent"| API
  API --> GG --> RL --> MAN
  MAN -->|"reads payout+version"| MR
  MAN -->|"transferFrom(treasury, payout)"| USDT
  TR -.->|"approve(limit)"| USDT
  OW -->|"opens /approve/:id"| APR
  APR <--> WORLD
  APR -->|"validated + digest"| ATT
  ATT -->|"attestation sig"| API
  OW -->|"owner EIP-712 sig"| API
  OBS -->|"PaymentExecuted logs"| MAN
  OBS --> DB --> WH --> MAPI
  MAPI -.->|"optional: resolve agent"| ENS
```

## 3. Trust model

| Component | Can it move funds alone? | If compromised |
|---|---|---|
| `Mandate` contract | Yes, within the allowance and its own rules | Loss is capped by the treasury allowance, so keep it small. Pause switch. |
| Agent key | No. It can sign intents only within per-tx, period and threshold limits, to allowlisted merchants. | Attacker spends up to the remaining period budget below the threshold. Revoke via epoch. |
| Owner wallet | No, above threshold it needs the World attestation too | Attacker still needs a fresh World sign-in as the owner |
| World attestor key | No, it needs the owner's signature on the same digest | Attacker still needs the owner wallet. Rotate the attestor via the owner. |
| Relayer key | No. It only pays gas. | Attacker drains WBT up to the GasGuard budget. Funds stay safe. |
| Backend DB | No | Wrong statuses or webhooks. The chain is the source of truth. |
| `MerchantRegistry` owner of a merchant | Can change its own payout | Old approvals become invalid (version check). It can't redirect signed payments. |

**Residual risk to state in the README:** an attacker with both the owner wallet **and** the attestor key could approve payments up to the hard caps. That's why the allowance stays small and the caps are hard.

## 4. Flow A: small payment (below threshold), fully automatic

```mermaid
sequenceDiagram
  autonumber
  participant A as Agent
  participant M as Merchant API (middleware)
  participant F as Countersign facilitator
  participant G as GasGuard + Relayer
  participant C as Mandate
  participant T as USDT

  A->>M: GET /api/report
  M-->>A: 402 { scheme:"countersign-v1", chainId:1874, mandateContract, merchantId, payout, registryVersion, amount:"500000", orderId, resourceHash, deadline }
  A->>A: Local policy check (amount <= its known limits)
  A->>A: Sign EIP-712 PaymentIntent
  A->>M: GET /api/report + X-PAYMENT: base64(intent + sig)
  M->>F: POST /v1/settle { intent, agentSig }
  F->>G: GasGuard.check → simulate eth_call
  G->>C: pay(intent, agentSig, emptyApproval)
  C->>C: checks (07 invariants) → effects (spent, nonce, paid)
  C->>T: transferFrom(treasury, payout, amount)
  C-->>F: PaymentExecuted(paymentId, …)
  F-->>M: { txHash, paymentId }
  M-->>A: 200 + data + X-PAYMENT-RESPONSE
```

## 5. Flow B: risky payment, 2-of-2 human approval

```mermaid
sequenceDiagram
  autonumber
  participant A as Agent
  participant M as Merchant API
  participant API as Countersign API
  participant O as Owner (browser + wallet + World app)
  participant W as auth.world.org
  participant AT as Attestor
  participant C as Mandate

  A->>M: POST /api/order (total 40 USDT)
  M-->>A: 402 terms (amount 40 ≥ threshold)
  A->>API: POST /v1/approvals { intent, agentSig }
  API->>API: Verify agentSig, simulate checks, store pending (digest D, TTL 120s)
  API-->>A: 202 { approvalId, status:"pending_human" }
  API-->>O: notify (dashboard + link /approve/:approvalId)
  O->>API: GET /approve/:id → shows amount, merchant name, payout, order, deadline
  O->>W: authorize (PKCE, max_age=0, state=approvalId, nonce=H(D))
  W-->>O: redirect with code
  O->>API: /auth/world/callback?code&state
  API->>W: POST /token (client_secret on server only)
  API->>API: Validate id_token (iss, RS256/JWKS, aud, exp, nonce==H(D), auth_time ≤ 120s, sub == owner sub)
  API->>AT: sign WorldAttestation over D
  O->>O: Wallet signs EIP-712 PaymentApproval (same D terms)
  O->>API: POST /v1/approvals/:id/owner-signature
  API->>C: pay(intent, agentSig, {ownerSig, attestorSig})
  C-->>API: PaymentExecuted
  API-->>A: approval status: settled (agent polls or webhook)
```

**Failure paths (all must be demoable):**

| Path | What happens | Result |
|---|---|---|
| Owner cancels at World | `access_denied` on callback | No attestation, status `denied` |
| Owner waits more than 120s | Approval TTL passes, or `deadline` passes onchain | No attestation, status `expired`. Late signatures revert `Expired`. |
| Different World user signs in | `sub` ≠ registered owner `sub` | No attestation, status `wrong_human` |
| Stale session reused | `auth_time` older than 120s | Rejected, status `stale_auth` |
| Backend tries to swap merchant | Owner signed digest D, attestor signed D' | `pay()` reverts `BadApproval` |

## 6. Flow C: revoke

Owner clicks Revoke. The owner wallet calls `Mandate.revoke(mandateId)` (owner pays gas, or the relayer submits an owner-signed revoke). `epoch++`. Any intent or approval signed with the old epoch reverts `StaleEpoch` once the revoke transaction has executed. Payments mined before it stay final.

## 7. Flow D: refund (P1)

The merchant payout wallet approves `Mandate` once for refunds. The merchant clicks Refund in the merchant view, which calls `refund(paymentId, amount)` from the payout wallet (merchant pays gas, since the merchant is the business, not the payer). The contract enforces `refunded + amount ≤ paid` and moves `payout → treasury`, emitting `PaymentRefunded`.

## 8. Repo layout

```
countersign/
  contracts/            Foundry: src/Mandate.sol, src/MerchantRegistry.sol, test/, script/
  apps/api/             Fastify + viem + better-sqlite3: API, facilitator, approvals, relayer, observer, webhooks
  apps/attestor/        Tiny separate service holding ATTESTOR_KEY, signs only validated digests
  apps/web/             Next.js: owner dashboard, /approve/:id, merchant view, demo controls
  apps/demo-merchant/   Separate Express app using @countersign/merchant (the "20 lines")
  apps/demo-agent/      Node script: buys report, places order, attack scenarios
  packages/merchant/    @countersign/merchant middleware
  packages/agent/       @countersign/agent client
  packages/shared/      EIP-712 types, ABIs, constants (chain 1874, USDT address)
  docs/                 these files
  README.md  WHITECHAIN_FEEDBACK.md  WORLD_DEBRIEF.md
```

## 9. Configuration

```env
CHAIN_ID=1874
RPC_URL=https://rpc.testnet.whitechain.io
EXPLORER=https://explorer.testnet.whitechain.io
USDT=0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7
MANDATE=0x...            # after deploy
REGISTRY=0x...
RELAYER_KEY=0x...        # WBT only
ATTESTOR_KEY=0x...       # attestor service only, never in apps/api
WORLD_ISSUER=https://sandbox.auth.world.org   # auth.world.org in production
WORLD_CLIENT_ID=...
WORLD_CLIENT_SECRET=...  # server only
WORLD_REDIRECT_URI=https://<host>/auth/world/callback
APPROVAL_TTL_SECONDS=120
GASGUARD_DAILY_WBT=0.2
```

Check USDT `decimals()` at startup and never hard-code 6.
