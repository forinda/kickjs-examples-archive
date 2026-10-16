# syntax=docker/dockerfile:1
# multi-tenant-kickdb-api — the long-running server in one image.
#
#   docker build -t multi-tenant-kickdb-api .
#   docker run -p 3000:3000 multi-tenant-kickdb-api
#
# Environment comes from the platform or `docker run`; .env files are not
# copied into the image. The lockfile must be committed — installs are frozen.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable
# better-sqlite3 compiles its native addon when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# The server bundle.
FROM base AS build
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
# Migrations, applied at startup (MIGRATE_ON_BOOT) to the SQLite file below.
COPY --from=build /app/db ./db
# The image's filesystem is replaced on every deploy: the SQLite file lives in
# /app/data — mount a volume there: docker run -v multi-tenant-kickdb-api-data:/app/data
RUN mkdir -p data && chown node:node data
ENV DB_FILE=/app/data/app.db MIGRATE_ON_BOOT=true
VOLUME /app/data
USER node
EXPOSE 3000
# Readiness runs every adapter's health check (database, Redis, storage, …).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/index.js"]
