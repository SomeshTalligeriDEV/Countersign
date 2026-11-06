# Build context: repo root. Keeps the repo layout (/app/web, /app/packages/*) because
# web imports ../packages/shared/src/chain.mjs and ../packages/ens/src (own viem install).
FROM node:24.10.0-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_COUNTERSIGN_WS_URL
ENV NEXT_PUBLIC_COUNTERSIGN_WS_URL=$NEXT_PUBLIC_COUNTERSIGN_WS_URL
COPY ["package.json", "pnpm-workspace.yaml", "./"]
COPY ["web/package.json", "web/package-lock.json", "./web/"]
COPY ["packages/ens/package.json", "packages/ens/package-lock.json", "./packages/ens/"]
RUN npm ci --prefix web --ignore-scripts && npm ci --prefix packages/ens --ignore-scripts
COPY ["packages/shared/src", "./packages/shared/src"]
COPY ["packages/ens/src", "./packages/ens/src"]
COPY ["web/", "./web/"]
RUN npm run build --prefix web

FROM node:24.10.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/web
COPY --from=build --chown=node:node /app/package.json /app/pnpm-workspace.yaml /app/
COPY --from=build --chown=node:node /app/packages /app/packages
COPY --from=build --chown=node:node /app/web/package.json ./package.json
COPY --from=build --chown=node:node /app/web/node_modules ./node_modules
COPY --from=build --chown=node:node /app/web/.next ./.next
COPY --from=build --chown=node:node /app/web/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
