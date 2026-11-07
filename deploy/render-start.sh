#!/bin/sh
# Render: API + attestor in one container sharing /data (testnet; co-located, see README limitations).
# Keys come from Render secret files; the attestor key file is loaded only by the attestor process.
# API starts first so it owns DB setup.
mkdir -p "$(dirname "$DATABASE_PATH")"
node --env-file=/etc/secrets/api.env apps/api/src/server.mjs & api=$!
sleep 6
node --env-file=/etc/secrets/attestor.env apps/attestor/src/server.mjs &
wait $api
