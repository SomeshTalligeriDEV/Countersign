#!/bin/sh
# Render: API + attestor in one container sharing /data. Keys come from Render secret files;
# the attestor key file is loaded only by the attestor process.
set -e
mkdir -p "$(dirname "$DATABASE_PATH")"
node --env-file=/etc/secrets/attestor.env apps/attestor/src/server.mjs &
exec node --env-file=/etc/secrets/api.env apps/api/src/server.mjs
