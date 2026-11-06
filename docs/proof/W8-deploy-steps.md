# W8 deploy steps — web + API + attestor (UNEXECUTED)

None of this has been run. Testnet only (Whitechain Sepolia, chain 1874). It needs a host, a domain and secrets, which are human steps.

## 0. Prerequisites (human)
- A Linux VM with Docker + compose v2, a domain with two hostnames: `app.<domain>` (web) and `api.<domain>` (API + WSS).
- A TLS reverse proxy (Caddy or nginx) that forwards WebSocket Upgrade and has an idle timeout above 30s.
- Contracts deployed and verified on 1874; Mandate address is known.
- World developer app, with redirect URIs registered for `https://api.<domain>/...` exactly as the API expects.
- Separate, freshly generated testnet keys: RELAYER_KEY (API) and ATTESTOR_KEY (attestor). Never reuse them, never commit them.

## 1. Get the code onto the host
```sh
git clone <repo-url> countersign && cd countersign
git checkout <tested commit sha>
```

## 2. Secrets (gitignored; deploy/*.env is in .dockerignore so it is never baked into an image)
```sh
cp apps/api/.env.example deploy/api.env            # WORLD_*, ATTESTOR_HMAC_SECRET, RELAYER_*, GASGUARD_*, WEBSOCKET_*
cp apps/attestor/.env.example deploy/attestor.env  # ATTESTOR_KEY, MANDATE_ADDRESS, ATTESTOR_HMAC_SECRET
chmod 600 deploy/*.env
```
- ATTESTOR_KEY goes ONLY in deploy/attestor.env.
- ATTESTOR_HMAC_SECRET must be the same value in both files (`openssl rand -hex 32`).
- WEBSOCKET_ORIGINS=https://app.<domain>; WORLD_REDIRECT_URI=https://api.<domain>/<callback path>.

## 3. Point the web build at the public URLs
In deploy/compose.yml, change for the public host:
- `web.build.args.NEXT_PUBLIC_COUNTERSIGN_WS_URL: wss://api.<domain>/v1/events`
- `web.environment.COUNTERSIGN_PUBLIC_API_URL: https://api.<domain>`
Ports stay bound to 127.0.0.1; only the proxy is public. Port 3002 (attestor) is never exposed: it shares the API network namespace.

## 4. Build and start
```sh
docker compose -f deploy/compose.yml config --quiet   # validates; do not print resolved config (secrets)
docker compose -f deploy/compose.yml build
docker compose -f deploy/compose.yml up -d
docker compose -f deploy/compose.yml ps
```

## 5. Reverse proxy (Caddy example)
```
app.<domain> { reverse_proxy 127.0.0.1:3000 }
api.<domain> { reverse_proxy 127.0.0.1:3001 }
```

## 6. Verify
```sh
curl -fsS https://api.<domain>/health/live
curl -fsS -o /dev/null -w '%{http_code}\n' https://app.<domain>/
```
Readiness may be 503 until configured/backfilled. Open `https://app.<domain>` on a phone (checklist item 13).

## 7. Rollback
Record the image IDs (`docker compose images`) before each deploy; to roll back, check out the previous commit and repeat step 4. Back up the `state` volume (SQLite) before upgrades.

## Alternative: web on Vercel
`web/` can deploy to Vercel instead (root directory `web`, env `COUNTERSIGN_API_URL`, `COUNTERSIGN_PUBLIC_API_URL`, `NEXT_PUBLIC_COUNTERSIGN_WS_URL`). API and attestor still need the Docker host above, because they use a persistent SQLite volume and long-lived WebSocket connections.
