# Human-run commands

## ▶ LOOP 20 — WAITING-ON-HUMAN (updated Fri 18:10 IST)
Done already: contracts deployed, first real 0.50 USDT pay() (G2-onchain.md), allowance capped at 5 USDT.

1. **Git remote (I7 CI, form permalinks).** `gh repo create countersign --public --source . --remote origin && git push -u origin master` (or give the agent a remote URL). Expected: repo URL printed.
2. **World sandbox app (I3) — now the main blocker for A2/A16/order-40.** The demo order price is set to 1.50 USDT (between the 1.00 approval threshold and 2.00 per-tx cap). In the World developer portal create a sandbox app; redirect URI `http://localhost:8787/auth/world/callback` now (add `<public API origin>/auth/world/callback` after I6). Put WORLD_ENV=sandbox, WORLD_CLIENT_ID, WORLD_CLIENT_SECRET, WORLD_REDIRECT_URI into `.env` yourself (never paste them here). Then tell the agent "world app ready"; it will open an approval link and you sign in once with World App on your phone. Expected: approval page shows world_ok.
3. **ENS (I4): read-only for this submission.** The 18:00 IST cut-off passed with ENSv2 Sepolia addresses/role bitmap unverified and no `ens-owner` keystore. No ENS writes will be made. Nothing to do unless you want to attempt it after the demo.
4. **Public host (I6).** Choose where web/API/attestor run (a VPS with Docker, or a host account). Tell the agent the hostnames; Docker on this laptop is still down (colima).
5. **Real-wallet owner actions (A14).** Later: open /owner with a browser wallet on chain 1874 using the deployer account; the agent will list the exact clicks.


## ▶ NEXT LOOP INPUTS (F8, ordered; everything the deploy/verify loop needs)

All UNEXECUTED unless marked. Testnet only (Whitechain 1874, Sepolia 11155111). Values go in gitignored files only; paste back public addresses/URLs only.

**0. Tooling.** Docker daemon working (`docker info` succeeds; colima still broken: `colima delete -f && colima start`, or Docker Desktop). Foundry (`forge`, `cast`) on PATH. Git remote (H5).

**1. Keystore aliases (Foundry, never raw keys in env for deploy).**
| alias | role | funding |
|---|---|---|
| `deployer` | OWNER_ADDRESS: deploys, owns mandate, pays | WBT for ~11 txs (faucet drip; dry-run saw 1.05e14 wei on a test account, get more) + **≥1.00 official test USDT** (script hard-min 0.50 = 500000 base units) at `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7` |
| `agent` | AGENT_ADDRESS: signs intents only | none |
| `ens-owner` | ENS parent owner on Sepolia | Sepolia ETH (+ Sepolia MockUSDC for name fee) |
Separate keys (env, gitignored): relayer `RELAYER_KEY` in deploy/api.env (fund with WBT; it pays gas), attestor `ATTESTOR_KEY` in deploy/attestor.env only (its address = ATTESTOR_ADDRESS, no funds). Demo `AGENT_KEY` = the `agent` key, only in apps/demo-agent env.

**2. Deploy env (shell / root .env):** `DEPLOYER_ACCOUNT=deployer AGENT_ACCOUNT=agent OWNER_ADDRESS AGENT_ADDRESS DEMO_PAYOUT` (≠ owner) `ATTESTOR_ADDRESS`, optional `WHITECHAIN_RPC_URL` (default https://rpc.testnet.whitechain.io).
- `pnpm human:deploy:dry` → must exit 0 with `PASS keystore ... matches` for both aliases and no WARN (sample run with public test addresses: docs/proof/F8-human-deploy-dryrun.txt).
- `pnpm human:deploy` → writes docs/proof/deployed.json (MerchantRegistry, Mandate, setup.mandateId/merchantId, firstPayment tx). Then `pnpm evidence`.

**3. Service env from deployed.json.** Root/API: `MANDATE_ADDRESS REGISTRY_ADDRESS DEPLOYMENT_BLOCK TRUSTED_PROXY_IPS`. deploy/api.env: `ATTESTOR_HMAC_SECRET` (same value in attestor.env) `RELAYER_ENABLED RELAYER_KEY RELAYER_PAUSED GASGUARD_DAILY_WEI GASGUARD_MANDATE_DAILY_WEI GASGUARD_MAX_FEE_WEI WEBSOCKET_ENABLED WEBSOCKET_ORIGINS=https://<web-host>` + World vars (step 5). deploy/attestor.env: `ATTESTOR_KEY MANDATE_ADDRESS DATABASE_PATH ATTESTOR_HMAC_SECRET`. Web: `COUNTERSIGN_API_URL COUNTERSIGN_PUBLIC_API_URL NEXT_PUBLIC_COUNTERSIGN_WS_URL WEB_TRUSTED_HOPS=1 DEMO_MODE DEMO_CONTROL_SECRET ENS_SEPOLIA_RPC_URL NEXT_PUBLIC_ENS_AGENT_NAME` (public overlay sets the URL ones from hostnames).

**4. Public host (one VPS, DNS A records → VPS).** `deploy/public.env`: `COUNTERSIGN_WEB_HOST=<app.domain> COUNTERSIGN_API_HOST=<api.domain>` (hostnames only). Run: `docker compose -f deploy/compose.yml -f deploy/compose.public.yml --env-file deploy/public.env up -d --build`. URLs: `https://<web-host>`, `https://<api-host>/health/live`, `wss://<api-host>/v1/events`. Attestor port 3002 never exposed.

**5. World** — follow docs/proof/HUMAN-RUN-world.md steps 1-8 in order. Inputs: `WORLD_ENV=sandbox` (production for submission) `WORLD_ISSUER WORLD_CLIENT_ID WORLD_CLIENT_SECRET WORLD_REDIRECT_URI=https://<api-host>/auth/world/callback` (+ `/auth/world/onboard/callback` registered), optional `WORLD_ACR`.

**6. ENS** — follow docs/proof/HUMAN-RUN-ens.md steps 1-8 in order (after step 2, needs MANDATE_ADDRESS + mandateId). Inputs: `ENS_SEPOLIA_RPC_URL ENS_KEYSTORE_ACCOUNT=ens-owner ENS_PARENT_NAME ENS_AGENT_LABEL ENS_USER_REGISTRY ENS_AGENT_RESOLVER ENS_OWNER_ADDRESS ENS_AGENT_ADDRESS ENS_ATTESTOR_ADDRESS ENS_MANDATE_ADDRESS ENS_MANDATE_ID ENS_MERCHANTS_HASH ENS_POLICY_LIMITS` optional `ENS_ROLE_BITMAP`; then set `NEXT_PUBLIC_ENS_AGENT_NAME` and rebuild web.

**7. Demo.** apps/demo-agent env: `AGENT_KEY MANDATE_ADDRESS REGISTRY_ADDRESS MANDATE_ID MERCHANT_ID MAX_AMOUNT_BASE_UNITS COUNTERSIGN_API=https://<api-host> COUNTERSIGN_WEB=https://<web-host> REPORT_URL ORDER_URL` (demo-merchant running: `COUNTERSIGN_API MERCHANT_ID PORT`). `pnpm demo:all:dry` (sample: docs/proof/F8-demo-dryrun.txt) → exit 0, then `pnpm demo:all` (owner must approve order-40 with World and revoke in wallet during replay-after-revoke).


## ▶ CURRENT HANDOFF (orchestrator, Fri 6 Nov 2026 13:30 IST) — do these first

Items 1–2 below are DONE by the agent (forge 118/118 executed). Remaining blockers are yours:

**H1. Deployer keystore (W2, WAITING-ON-HUMAN).** No `deployer` keystore exists (only `pactra-deployer`, which the agent will not use).
```sh
cast wallet import deployer --interactive
cast wallet import agent --interactive      # separate key; holds no USDT/WBT
cast wallet address --account deployer      # prints public address
```
Expected: two public addresses. Paste only the addresses back.

**H2. Fund deployer (W2).** WBT from the Whitechain testnet faucet + ≥1.00 official test USDT (0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7) from the booth/Discord to the deployer address.
```sh
cast balance $(cast wallet address --account deployer) --rpc-url https://rpc.testnet.whitechain.io
cast call 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7 "balanceOf(address)(uint256)" $(cast wallet address --account deployer) --rpc-url https://rpc.testnet.whitechain.io
```
Expected: nonzero WBT; USDT ≥ 1000000 (6 decimals).

**H3. `.env` (gitignored).** `cp .env.example .env`, then fill OWNER_ADDRESS, AGENT_ADDRESS, DEMO_PAYOUT, ATTESTOR_ADDRESS, DEPLOYER_ACCOUNT=deployer, AGENT_ACCOUNT=agent, WORLD_ISSUER, WORLD_CLIENT_ID, WORLD_CLIENT_SECRET. Never paste values into chat.

**H4. World sandbox app (W4).** The World developer MCP is not available to the agent. Register a sandbox app in the World developer portal, set redirect URI `<API origin>/auth/world/callback (the API rejects any other path; see apps/api/src/server.mjs:43)` (plus the live URL once deployed), copy client id/secret into `.env`. Then sign in once at `/approve/<id>` with your World App (phone step). Expected: approval page shows "verified" with a fresh auth_time.

**H5. Git remote (W8).** `gh repo create countersign --public --source . --push` (or give the agent a remote URL). Needed for remote CI and form permalinks.

**H6. Docker (W8, BLOCKED for agent after 2 attempts).** colima VM fails: `usernet unable to resolve IP for SSH forwarding`. Fix with `colima delete -f && colima start` or start Docker Desktop, then `docker info` must succeed. Agent will then run the builds in docs/proof/W8-docker.txt.

After H1–H3 tell the agent "funded"; it will run `pnpm human:deploy`, verify on Blockscout, and run W3/W6.

---


Status: dependency repair and contract tests are ready to run. Deployment script is written but unexecuted. Do not deploy before full G1 validation, including digest parity, passes. API/SDK/World integration and real payment script are not ready yet. This is an incremental handoff, not the completed items 1–5 handoff.

## 1. Fix the actual missing dependency

Run in your normal network-enabled terminal:

```sh
cd ~/Desktop/countersign/contracts
npm install --ignore-scripts --no-audit --no-fund
node -p "require('./node_modules/@openzeppelin/contracts/package.json').version"
test -f node_modules/@openzeppelin/contracts/utils/cryptography/EIP712.sol
```

Expected: version **5.4.0**, and the file check exits 0. The existing Foundry remapping points here correctly. Switching deployment tools does not install OpenZeppelin automatically. Review and commit the generated contracts/package-lock.json.

## 2. Capture full compiler and test results

```sh
cd ~/Desktop/countersign
mkdir -p docs/proof
set -o pipefail
(cd contracts && forge build) 2>&1 | tee docs/proof/G1-forge-build.txt
(cd contracts && forge test -vvv) 2>&1 | tee docs/proof/G1-forge-test.txt
(cd contracts && forge test --match-test invariant -vvv) 2>&1 | tee docs/proof/G1-invariant-test.txt
```

Expected goal: compilation succeeds and all tests pass, with nonzero invariant runs. This has **not** been verified. Paste full output, not just the last lines. `pipefail` ensures `tee` cannot hide a failing build. Do not delete tests if compilation or assertions fail.

## 3. Prepare the testnet signer (only after G1)

```sh
cd ~/Desktop/countersign
npx skills add whitechain-labs/skills --skill whitechain-dev
cast wallet import countersign-deployer --interactive
cast wallet address --account countersign-deployer
cast chain-id --rpc-url https://rpc.testnet.whitechain.io
```

Import a dedicated testnet key through the private interactive prompt; never paste it into chat. Expected chain ID: **1874**. Share only the public address. Claim test WBT with your GitHub login at https://faucet.testnet.whitechain.io and obtain official test USDT from the booth. A 200-USDT demo allowance is planned, not a requirement to transfer 200 USDT. The first automatic payment needs 0.50 USDT; gas funding must cover deployment and subsequent demo calls. No balance or fee estimate has been verified yet.

## 4. Deploy with the prepared Foundry script (only after G1)

```sh
cd ~/Desktop/countersign/contracts
set -o pipefail
test "$(cast chain-id --rpc-url https://rpc.testnet.whitechain.io)" = 1874
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.testnet.whitechain.io \
  --account countersign-deployer --broadcast \
  2>&1 | tee ../docs/proof/G2-deploy.txt
```

Expected: registry then mandate deployment receipts, and a Deployment event with the official token and live decimals. This script neither mints a token nor approves or moves USDT. Record addresses from successful receipts; never reuse an address from a failed simulation.

## 5. Verify both contracts

Set public addresses from step 4; these are not secrets:

```sh
cd ~/Desktop/countersign/contracts
export REGISTRY_ADDRESS='REPLACE_WITH_DEPLOYED_REGISTRY'
export MANDATE_ADDRESS='REPLACE_WITH_DEPLOYED_MANDATE'
export USDT_ADDRESS='0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7'
forge verify-contract "$REGISTRY_ADDRESS" src/MerchantRegistry.sol:MerchantRegistry \
  --chain-id 1874 --rpc-url https://rpc.testnet.whitechain.io \
  --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ --watch
forge verify-contract "$MANDATE_ADDRESS" src/Mandate.sol:Mandate \
  --chain-id 1874 --rpc-url https://rpc.testnet.whitechain.io \
  --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ --watch \
  --constructor-args "$(cast abi-encode 'constructor(address,address)' "$USDT_ADDRESS" "$REGISTRY_ADDRESS")"
```

Expected: both sources verified. Compiler settings are inherited from foundry.toml: 0.8.30, Prague, via-IR, optimizer 200. Keep settings identical for deployment and verification.

## 6. World registration preparation

```sh
claude mcp add --transport http --scope user world-id-developer-sandbox https://sandbox.auth.world.org/mcp/developer
```

Complete browser OAuth when the local client prompts. Use that connected client to register the app. The intended callback route is `/auth/world/callback`; register its exact URL on the chosen API origin. Keep the issued client secret in apps/api/.env, never frontend variables or chat. A real sign-in is pending callback implementation; registration alone is not success proof.

## Pending command sets

The safe one-real-pay script and complete World sign-in commands will be added after their code and tests exist. Do not fabricate a payment with cast calls that omit the agent signature or required human approval. Hardhat deployment is an optional requested adapter, still pending; Foundry remains necessary for the specified security suite.

## 7. Re-run after the T-22 chain-switch test fix

The supplied trace showed both chain-switch calls using 31338. The test now captures chain ID with vm.getChainId(), checks distinct domain digests, restores the original chain, and still requires BadIntentSig plus unchanged balances/accounting. No production signature checks changed.

```sh
cd ~/Desktop/countersign
set -o pipefail
(cd contracts && forge test --match-test testT22DifferentChainSignatureRejected -vvvv) \
  2>&1 | tee docs/proof/T22-fixed-test.txt
(cd contracts && forge test -vvv) \
  2>&1 | tee docs/proof/G1-forge-test-after-T22.txt
```

Expected (not yet verified): both inherited instances of T-22 pass; the full suite has zero failed tests and retains 256 invariant runs. Keep the earlier failure output for traceability. Paste full output. A-14 digest parity and complete integration tests remain separate G1 blockers even if this suite turns green.

## 8. A-14 fixed digest parity (next required check)

The corrected prior Solidity suite passed 74/74 in your terminal. New shared vectors cover PaymentIntent, PaymentApproval and WorldAttestation. Expected hashes were calculated offline using independent static ABI encoding and cast keccak; the following commands verify them with viem and the actual Solidity implementation. No network transaction is sent.

```sh
cd ~/Desktop/countersign
set -o pipefail
(cd packages/shared && npm install --ignore-scripts --no-audit --no-fund && npm test) \
  2>&1 | tee docs/proof/A14-viem-test.txt
(cd contracts && forge test --match-contract DigestVectorsTest -vvvv) \
  2>&1 | tee docs/proof/A14-solidity-test.txt
(cd contracts && forge test -vvv) \
  2>&1 | tee docs/proof/G1-forge-with-vectors.txt
```

Expected: three viem tests and the Solidity vector test pass, followed by the full suite with no failures. This is an expectation, not a recorded result. Solidity uses the same JSON vector file via a narrowly scoped read permission. The fixed verifying address is installed only in the local test VM; it is not a deployment address.

## 9. Install API JWT verification dependency

The World source now imports jose dynamically and never substitutes unverified JWT claims. Run from the laptop:

```sh
cd ~/Desktop/countersign/apps/api
npm install --ignore-scripts --no-audit --no-fund
node --input-type=module -e 'import("jose").then(m => console.log("jwtVerify:", typeof m.jwtVerify, "JWKS:", typeof m.createRemoteJWKSet))'
```

Expected: installation succeeds and prints `jwtVerify: function JWKS: function`. This only confirms dependency availability, not World verification. Keep the generated lockfile. Never paste WORLD_CLIENT_SECRET or identity tokens. Signed-fixture verification and real issuer sign-in are still pending; the OIDC module is not yet mounted on browser routes.

## 10. Fetch teammate EzPayz main for integration review

Agent attempted read-only `git ls-remote --heads https://github.com/SomeshTalligeriDEV/EzPayz.git main`; it failed with `Could not resolve host: github.com`. Web retrieval also failed. No teammate source or commit was inspected. Do not pull an unrelated repository directly into the dirty Countersign worktree.

Run in the normal laptop terminal; mktemp creates a fresh sibling folder without overwriting existing work:

```sh
cd ~/Desktop
EZPAYZ_REVIEW_DIR=$(mktemp -d "$PWD/EzPayz-review.XXXXXX")
git clone --branch main --single-branch https://github.com/SomeshTalligeriDEV/EzPayz.git "$EZPAYZ_REVIEW_DIR"
git -C "$EZPAYZ_REVIEW_DIR" log -1 --format='%H %s'
printf 'Review checkout: %s\n' "$EZPAYZ_REVIEW_DIR"
```

Expected: clone completes and prints a main-branch commit SHA and checkout path. Paste those public values only. If GitHub asks for authentication, complete it locally; never paste a token. The agent can read the checkout, compare specs/World integration/contracts and bring reviewed changes into Countersign. Clone success alone does not imply merge or integration success.

## 11. Loop M1 — deploy, verify and first official-USDT payment

UNEXECUTED. Read the entire sequence before broadcasting. Use the same funded owner keystore for every script call. No private keys in command arguments/chat. Fill public addresses from actual output; never substitute tokens.

1. Prepare keystore and funding in the laptop terminal:
```sh
cd ~/Desktop/countersign
cast wallet address --account countersign-owner
```
Expected: owner address. Record it here. Get test WBT from the faucet (0.5 WBT claim if eligible) and at least 0.50 official USDT from the booth. Payout must be a different team-controlled address. ATTESTOR_ADDRESS is public; its key stays only in apps/attestor. Put DEMO_AGENT_KEY in gitignored contracts/.env; use a separate test-only signing wallet. Do not paste it.

2. Compile/test and deploy:
```sh
cd ~/Desktop/countersign/contracts
set -o pipefail
forge build 2>&1 | tee ../docs/proof/loop-forge-build.txt
forge test -vvv 2>&1 | tee ../docs/proof/loop-forge-tests.txt
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.whitechain.io --account countersign-owner --broadcast -vvvv
```
Expected: chain1874, registry then mandate addresses and successful receipts. Stop on any failed test or receipt. Record deployment block and addresses. Copy only those public values to .env.example, API process env and web server COUNTERSIGN_API_URL. No actual addresses are known here yet.

3. Export REGISTRY_ADDRESS and MANDATE_ADDRESS to those actual addresses, then verify:
```sh
forge verify-contract "$REGISTRY_ADDRESS" src/MerchantRegistry.sol:MerchantRegistry --chain 1874 --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ --watch
forge verify-contract "$MANDATE_ADDRESS" src/Mandate.sol:Mandate --chain 1874 --constructor-args "$(cast abi-encode 'constructor(address,address)' 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7 "$REGISTRY_ADDRESS")" --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ --watch
```
Expected: verified source for both. Keep explorer links; compiler settings are fixed in foundry.toml.

4. Put OWNER_ADDRESS (keystore address), DEMO_PAYOUT, ATTESTOR_ADDRESS and deployed addresses in gitignored contracts/.env. First dry-run then broadcast:
```sh
forge script script/FirstPayment.s.sol:FirstPayment --rpc-url https://rpc.testnet.whitechain.io --account countersign-owner -vvvv
forge script script/FirstPayment.s.sol:FirstPayment --rpc-url https://rpc.testnet.whitechain.io --account countersign-owner --broadcast -vvvv
```
Expected: demo merchant registration, mandate creation, limit/allowlist updates, limited allowance exactly 0.50 USDT, successful pay and payout balance increase. Script uses official runtime decimals; no mock token. Agent only signs, owner pays script gas. This first-pay proof is distinct from the later gasless-agent relayer demo. Broadcast uses a fresh salt; do not use --resume blindly. Find pay tx hash in receipts, record `https://explorer.testnet.whitechain.io/tx/<hash>` in G2-onchain.md. Actual execution unverified; do not mark M1 deployment complete from source alone.

## 12. M2 live relay and M3 signed-JWT checks

M2 offline exit checks pass; live adapter remains UNEXECUTED. After M1 deployment/funding, load API-only env from a gitignored file, including RELAYER_ENABLED=1, a dedicated RELAYER_KEY, deployed addresses, DEPLOYMENT_BLOCK and all GASGUARD_* values from apps/api/.env.example. Keep ATTESTOR_KEY only in apps/attestor. No other process may submit using the relayer signer. Restart recovery may resend the exact same signed bytes; it never signs replacements. Set RELAYER_PAUSED=1 and restart to stop new submissions.

Loop authorizes cutting complete OP fee accounting: budget covers execution-gas reservations only. Cap signer WBT funding accordingly. Recovery marks reverted transactions failed and keeps unknown consumed-nonce outcomes blocked for reconciliation. No real settlement is certified by these configuration steps.

Run signed World fixtures after installing jose locally:
```sh
cd ~/Desktop/countersign/apps/api
npm install --ignore-scripts --no-audit --no-fund
npm run test:world-fixtures
```
Expected: `Signed local JWT fixtures passed; NOT real World verification.` This must pass before claiming M3 fixture completion. Current agent run fails ERR_MODULE_NOT_FOUND for jose. Then configure sandbox app/client credentials and exact callback URI using the real provider registration; never paste secrets. Real onboarding and sign-in commands remain incomplete pending owner-binding flow. Do not manually mark database rows world_ok for the real run.

## 13. WebSocket live updates

Install the declared ws dependency in the normal laptop terminal:
```sh
cd ~/Desktop/countersign/apps/api
npm install --ignore-scripts --no-audit --no-fund
```
Set WEBSOCKET_ENABLED=1 and WEBSOCKET_ORIGINS=http://127.0.0.1:3000 in the API process. Set web COUNTERSIGN_API_URL=http://127.0.0.1:3001 and NEXT_PUBLIC_COUNTERSIGN_WS_URL=ws://127.0.0.1:3001/v1/events; restart both processes. Env files are not auto-loaded by the API: use Node --env-file or export values locally. Web origin must exactly match the allowlist. In production terminate TLS and preserve WebSocket Upgrade headers; use wss:// and the real HTTPS frontend origin.

Expected: browser network panel shows /v1/events 101 upgrade and state_changed notifications after DB commits. Owner/approval/receipt fetch fresh API data on notifications. Socket connection alone does not prove chain freshness or settlement. This session cannot bind ports; live handshake remains unverified. Polling remains available when the socket disconnects. No approval commands, tokens, signatures or identity details travel over this public socket.

## 14. M3 owner onboarding and real issuer run

Register BOTH exact sandbox redirect URIs (no wildcards):
- `http://127.0.0.1:3001/auth/world/callback`
- `http://127.0.0.1:3001/auth/world/onboard/callback`

Use the actual issuer's registration process; Developer Portal IDKit app credentials are not assumed interchangeable with Agent Pass OIDC credentials. If the registration requires browser login/device identity, complete it locally. Configure API-only WORLD_ISSUER, WORLD_CLIENT_ID, WORLD_CLIENT_SECRET and WORLD_REDIRECT_URI (first URI above). Configure deployed contract addresses/RPC/DEPLOYMENT_BLOCK, optional ATTESTOR_HMAC_SECRET, and the separate attestor env. Never put ATTESTOR_KEY in the API or web process. All services must use the same absolute SQLite DATABASE_PATH.

From API directory, after setting gitignored .env:
```sh
node --env-file=.env src/server.mjs
```
From attestor directory with its own gitignored .env:
```sh
node --env-file=.env src/server.mjs
```
Web .env.local needs COUNTERSIGN_API_URL=http://127.0.0.1:3001, COUNTERSIGN_PUBLIC_API_URL=http://127.0.0.1:3001 and the optional socket URL. Start web in the normal terminal. API validates OIDC discovery during configured startup; any issuer metadata/client-auth incompatibility is a real failure to fix, not an excuse to mark world_ok manually.

1. Open /owner with the current mandate-owner wallet on chain1874. Read a real mandate.
2. Start World onboarding. Open verification in the new tab; complete the sandbox identity step; return to /owner. Sign only the displayed identity-binding message. Expected: bound only after server JWT verification and wallet signature. Do not share tokens or cookies.
3. Create a real above-threshold approval through the agent/API; open /approve/<real-id>. Review exact amount/payout/order; complete a fresh World verification, then sign PaymentApproval in the recorded owner wallet.
4. With relayer+attestor configured, expect submitted first, then confirmed logs. Record tx link only after chain confirmation. Failure/expired/denied/wrong-human paths must not submit.
5. Record one denied sign-in and verify no new relay transaction. Signed-fixture proof is already in world-fixtures-verified.txt; this real issuer result is still UNEXECUTED.

Browser/wallet and Playwright execution are WAITING-ON-HUMAN. Current onboarding requires an existing mandate (spec sequencing deviation); it does not create a binding before mandate creation. Binding replacement is forbidden; identity recovery/rebinding needs a separately designed authenticated flow.

## 15. Updated agent/demo and deployment preparation

Agent buy-report and order-40 now support approval creation/polling. Set COUNTERSIGN_API and COUNTERSIGN_WEB to actual reachable origins, AGENT_KEY only in agent environment, and MAX_AMOUNT_BASE_UNITS explicitly after reading token decimals. Demo merchant /api/report costs 0.50 USDT; /api/order-priced-report costs 40 USDT and serves a real network report.
```sh
npm --prefix apps/demo-agent start -- buy-report
npm --prefix apps/demo-agent start -- order-40
```
Expected: automatic payment submitted then confirmed, or pending_human with actual approval URL; no resource released before a confirmed receipt. Above-threshold run requires owner onboarding plus configured attestor/relayer. Attack CLI still unfinished; do not claim six-step demo complete.

Container commands/configuration are in DEPLOYMENT.md. Actual image build, browser/Playwright, two real demo runs and remote CI are UNEXECUTED. Do not use teammate contract addresses as Countersign deployments.

## Funding and Scale clarification before step 11

Ask the Whitechain booth or official Discord, replacing the public address locally:

> We are building Countersign for AI-agent payments and considering Scale and Operate. Can you send about 500 test USDT at 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7 to our deployer <public wallet address>? Does this official token support EIP-2612 permit or EIP-3009 transferWithAuthorization? Our agent holds no WBT; the treasury currently pays gas for initial approval and mandate setup. Does that satisfy Scale, or must setup gas also be sponsored?

No sponsor answer or funding receipt has been verified here. Record the response and its date before claiming track compliance. The first-payment script requires at least 0.50 official test USDT; the larger amount is for repeated demos. Also obtain test WBT. If official USDT is unavailable, record the blocker; never mint a replacement.

After funding, run step 11 and record explorer links or exact errors without secrets. In parallel, complete step 14 with the real sandbox app/identity. Commit working increments in the normal laptop terminal. Prior-project identity/history questions remain in the provenance inventory and need human answers.

## 16. Attack CLI (API/GasGuard evidence, not onchain revert txs)

Use the same configured agent environment as buy-report. These commands intentionally sign altered/out-of-policy requests on testnet only:
```sh
npm --prefix apps/demo-agent start -- tamper-amount
npm --prefix apps/demo-agent start -- tamper-payout
npm --prefix apps/demo-agent start -- over-budget
npm --prefix apps/demo-agent start -- save-replay
```
Expected first two: bad_intent_sig. For over-budget, configure perTxLimit/humanThreshold high enough that remaining+one base unit reaches simulation; otherwise the command correctly fails to demonstrate the intended budget rejection. Expected GasGuard would_revert, with specific OverPeriod still needing onchain evidence. These API results cannot be used as explorer revert transactions.

save-replay writes a fresh unused signed intent to .countersign-replay.json with owner-only permissions; it refuses to overwrite an existing file. Keep the file private/gitignored. Revoke using the owner wallet, then within 180 seconds run:
```sh
npm --prefix apps/demo-agent start -- replay-after-revoke
```
Expected StaleEpoch. Already-expired intent or missing API does not count as revoke evidence. Inspect the actual JSON rejection; no tx accepted should be called a successful attack demonstration. Real registry-change-after-approval and arbitrary-relayer-call demonstrations, full ordered six-step runner and two real runs remain unfinished.

## 17. Ordered demo, browser tests and generated evidence

1. In the separate agent process, configure agent-only env and DEMO_CONTROL_SECRET. Share only the control secret with the web server. Enable DEMO_MODE=1 on API/web. Start `npm --prefix apps/demo-agent run control`. Visit /demo; each button runs a fixed scenario and returns actual stdout/rejection. No arbitrary shell command is accepted. Control service is localhost-only and is not included in local compose automatically.
2. Run `npm --prefix apps/demo-agent run run-all` in the configured agent terminal. It executes buy-report, tamper-amount, tamper-payout, order-40, over-budget, replay-after-revoke. Before replay it creates a new unused intent and asks for owner revocation, waiting up to120s. Reconcile/remove old replay file only after inspecting it; save-replay refuses overwrite. The run stops on any failure. Run arbitrary-relayer-call separately. Repeat the full demo after resolving state/budget/replay-file prerequisites. Two real runs are still unexecuted.
3. Install and run browser fixtures:
```sh
npm install --prefix web/e2e --ignore-scripts
cd web/e2e
npx playwright install chromium
npm test
```
Expected mocked-wallet setup-review/approval/error tests pass. Save the generated e2e lockfile. This does not replace real-wallet checks. Current agent attempt failed because Playwright is not installed, not because tests passed or were skipped.
4. Copy docs/proof/deployed.example.json to deployed.json and fill real public contract addresses/deploy txs/demo txs/URLs only. Leave unavailable values null; do not use fixture hashes. Run `npm run evidence` at root. Expected EVIDENCE.md/README explorer links for supplied values; every missing field stays TODO-HUMAN. Generator validates shape/chain, not onchain success. Inspect each explorer link manually and keep real proof.
5. Form draft is docs/13-SUBMISSION-ANSWERS.md. Replace local source links with public committed permalinks, fill ratings only from actual experience, add video/live URLs and resolve prior-code questions before submission. No code completion grants eligibility automatically.

## 18. Risk-reduction commands

From repo root with service-local public configuration exported in the terminal:
```sh
pnpm doctor
```
Checks chain1874, official token code/decimals, OWNER_ADDRESS balances, saved contract code, limited allowance, remaining budget, WORLD_ISSUER discovery/JWKS, API/attestor liveness, relayer flags and Git cleanliness. Prints a fix for every failure. It never prints keys/client secrets. Liveness is not proof of World verification or end-to-end readiness. Zero allowance after first pay can be expected; doctor explains replenishment for the next run.

For resumable deployment, configure public OWNER_ADDRESS, AGENT_ADDRESS, DEMO_PAYOUT, ATTESTOR_ADDRESS and Foundry keystore aliases DEPLOYER_ACCOUNT and AGENT_ACCOUNT. Do not pass private keys in arguments. Unlock/use keystores in the normal terminal as required by Foundry. Then:
```sh
pnpm human:deploy
```
UNEXECUTED live adapter. Script compiles, deploys registry/mandate, verifies, registers merchant, creates mandate, sets limits/allowlist, resets/sets allowance exactly0.50 USDT, signs via agent keystore and makes one pay. It writes deployed.json before/after each step and prints explorer links. Completed steps are skipped; stored contracts are checked for code. For an unknown outcome it stops instead of repeating a possibly submitted payment/deployment. Reconcile actual receipt/state, update the relevant saved step/evidence and rerun only after inspection. Do not set done manually without proof. A leftover deployed.lock requires checking its PID before removing it; never run two deployers concurrently. Saved salt/payout/attestor/deployer are fixed for the run. Do not mix fresh funding/old state to create duplicate setups.

New contract adversarial tests are UNEXECUTED here. In the normal laptop terminal:
```sh
set -o pipefail
forge test --root contracts --match-contract AdversarialEdgesTest -vvv 2>&1 | tee docs/proof/risk-adversarial-forge.txt
forge test --root contracts -vvv 2>&1 | tee docs/proof/risk-full-forge.txt
```
Expected: no failures/skips; counts include inherited base tests. Paste exact output, not private env values. Prior75-test proof does not cover these additions.

Record scene checklist:
```sh
pnpm video:checklist
```
Shows all nine docs/09 section2 scenes, screen/actions and supplied evidence links or TODO-HUMAN. Fixture results must visibly say FIXTURE; do not claim actual reverts/payments from them. Fresh replay/order IDs prevent duplicates across run-all invocations, but policy budget, expiry, registered payout and owner revocation are real prerequisites, never silently reset.
