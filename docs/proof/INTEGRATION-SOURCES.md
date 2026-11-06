# Integration sources (merged)

Merged 2026-11-06 from INTEGRATION-SOURCES-whitechain.md, INTEGRATION-SOURCES-world.md, INTEGRATION-SOURCES-ens.md (originals kept). Headings demoted one level; content unchanged.

## Whitechain integration sources (fetched 2026-11-06)

| URL | Fetched | Used for |
|---|---|---|
| https://ethglobal.com/events/mumbai/prizes | 2026-11-06 (curl, 200, 2nd attempt; 1st timed out at 30 s) | Whitechain "Operate" and "Tokenize" qualification requirements (PRIZE-REQUIREMENTS.md) |
| https://docs.whitechain.io/llms.txt | 2026-11-06 | Page index |
| https://docs.whitechain.io/learn/network/reference.md | 2026-11-06 | Chain id 1874 (0x752), RPC `https://rpc.testnet.whitechain.io`, WS `wss://rpc.testnet.whitechain.io/ws`, explorer `https://explorer.testnet.whitechain.io`, EVM `prague`, Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, rate limit 50 rps / burst 500 / `429` + `Retry-After: 1`, "handle 429 with exponential backoff starting from Retry-After" |
| https://docs.whitechain.io/learn/network/testnet.md | 2026-11-06 | Same network params, rate-limit table |
| https://docs.whitechain.io/build/deploy/deploy-with-foundry.md | 2026-11-06 | `solc = "0.8.30"`, `evm_version = "prague"`, verifier URL `https://explorer.testnet.whitechain.io/api/` (contracts/foundry.toml already matches) |
| https://docs.whitechain.io/build/dapps/use-viem.md | 2026-11-06 | viem client setup |
| https://rpc.testnet.whitechain.io (cast, read-only) | 2026-11-06 | chain id, USDT metadata/decimals, EIP-2612 / EIP-3009 probe (USDT-CAPABILITIES.md) |

Note: the docs reference `whitechainSepolia` from `viem/chains`, but the installed viem 2.35.0 has only `whitechainTestnet` (id 2625, legacy L1 testnet, rpc-testnet.whitechain.io). Countersign therefore defines 1874 itself in `packages/shared/src/chain.mjs`.

## World integration sources (fetched 2026-11-06)

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

## ENS integration sources (fetched 2026-11-06)

- https://docs.ens.domains/llms-full.txt (fetched 2026-11-06, 1,790,939 bytes). Sections used: ENSv2 Permissioned Resolver (setText(bytes name,...), DNS-encoded name via `toHex(packetToBytes(name))`, multicall, grantSetterRoles / revokeRoles / revokeRootRoles, ROLE_SET_TEXT = 1<<4, "no per-name scoping → one resolver per agent"), Permissioned Registry (register(label, owner, registry, resolver, roleBitmap, expiry) with absolute expiry; setResolver/unregister take anyId = labelhash), Verifiable Factory (deployProxy, OwnedResolver/UserRegistry salt schemes), ENSv2 readiness (viem >= 2.35.0 resolves via Universal Resolver).
- Sepolia contract addresses: the docs page renders them from a component (not present in llms-full.txt); see https://docs.ens.domains/learn/deployments#sepolia-ensv2 and verify before running scripts/ens-setup.mjs. 06-ENS-OPTIONAL.md lists ETHRegistry 0xd4eb…a8b4 and PermissionedResolverImpl 0x115e…2b2c (UNVERIFIED by this loop).
- viem 2.35.0 (installed in packages/ens): `sepolia.contracts.ensUniversalResolver = 0xeeeeeeee14d718c2b47d9923deab1335e144eeee` (from node_modules/viem/_esm/chains/definitions/sepolia.js).
- ENSjs not used: viem alone covers reads and tx encoding. Context7 was not available (MCP unauthenticated).
