FROM node:24.10.0-bookworm-slim AS dependencies
WORKDIR /app
COPY packages/shared/package*.json ./packages/shared/
COPY packages/ens/package*.json ./packages/ens/
COPY apps/api/package*.json ./apps/api/
COPY contracts/package*.json ./contracts/
RUN npm ci --prefix packages/shared --ignore-scripts && npm ci --prefix packages/ens --ignore-scripts && npm ci --prefix apps/api --ignore-scripts && npm ci --prefix contracts --ignore-scripts

FROM ghcr.io/foundry-rs/foundry:v1.9.0 AS solidity
USER root
WORKDIR /app
COPY contracts ./contracts
COPY --from=dependencies /app/contracts/node_modules ./contracts/node_modules
RUN forge build --root contracts

FROM node:24.10.0-bookworm-slim
WORKDIR /app
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/packages/ens/node_modules ./packages/ens/node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=solidity /app/contracts/out ./contracts/out
COPY packages/shared ./packages/shared
COPY packages/ens/src ./packages/ens/src
COPY packages/ens/package.json ./packages/ens/package.json
COPY packages/merchant ./packages/merchant
COPY apps/api ./apps/api
COPY apps/attestor ./apps/attestor
COPY deploy/render-start.sh ./deploy/render-start.sh
RUN mkdir /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/data/countersign.sqlite
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/src/server.mjs"]
