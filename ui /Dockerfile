FROM node:24.10.0-bookworm-slim AS build
WORKDIR /app
COPY ["ui /package.json", "ui /package-lock.json", "./"]
RUN npm ci --ignore-scripts
COPY ["ui /", "./"]
RUN npm run build

FROM node:24.10.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
