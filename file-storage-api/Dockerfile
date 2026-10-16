# syntax=docker/dockerfile:1
# file-storage-api — the long-running server in one image.
#
#   docker build -t file-storage-api .
#   docker run -p 3000:3000 file-storage-api
#
# Environment comes from the platform or `docker run`; .env files are not
# copied into the image. The lockfile must be committed — installs are frozen.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

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
# STORAGE_DRIVER=s3 (the default here) keeps nothing in the container. With
# STORAGE_DRIVER=disk, point UPLOAD_DIR at /app/data/uploads and mount a volume:
# docker run -v file-storage-api-data:/app/data
RUN mkdir -p data && chown node:node data
USER node
EXPOSE 3000
# Readiness runs every adapter's health check (database, Redis, storage, …).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/index.js"]
