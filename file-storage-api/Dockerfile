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
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
