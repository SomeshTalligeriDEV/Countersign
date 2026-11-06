# A2 / A16 (success): real World sign-in → human-approved USDT payment (REAL)

Issuer: `https://sandbox.auth.world.org` (real World IdP; World states sandbox proofs use mocked identities). Client: CIMD public client, `client_id` = `https://<tunnel>/.well-known/world-client.json` served by our API (portal self-registration returned `account_not_eligible`); PKCE S256, `max_age=0`, nonce bound per flow. First attempt returned `invalid_scope: "CIMD hosts require openid offline_access."` → scope fixed.

1. Owner onboarding 9d21d06d… : World sign-in → `world_ok` (backend validated ID token: iss, aud, nonce, auth_time ≤120 s) → owner (0x1079…5c7D) signed binding message with deployer keystore → `{"status":"bound"}` (2026-11-06T19:29:35Z).
2. Agent `order-40` (ORDER_AMOUNT 1.50 > 1.00 approval threshold) → `pending_human`, approval 0759ba6c-6b81-4707-af31-1f9962a1d715 (19:30:13Z).
3. Owner World sign-in on approval link → `world_ok` (19:31:46Z).
4. Owner EIP-712 PaymentApproval signature → attestor co-sign → relayer pay(): `submitted` 19:32:02Z.
5. Settled: tx [0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531](https://explorer.testnet.whitechain.io/tx/0x98fa814e805ab35e55124370539bc0c1889aef519d5c408800be2efc709cb531) receipt status `true`; paymentId 0xbc0e07729d424d59d1526476f6f560502113e17c25a74aac3ddda1c1aae0c930; agent received the report.
