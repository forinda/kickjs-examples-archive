# kickjs-examples-archive

Reference applications built on [KickJS](https://github.com/forinda/kick-js). Each app installs straight from npm (`@forinda/kickjs*` caret ranges), matches what `kick new` scaffolds today (Vite + SWC, `kick.config.ts`, `src/config` env wiring, oxlint/oxfmt), and passes typecheck, build and tests.

## Apps

| App | What it shows | KickJS packages | Also uses | Needs |
|---|---|---|---|---|
| [`minimal-api/`](./minimal-api) | Smallest app: one module, one return-value controller, a `createTestApp` test | kickjs, kickjs-schema | zod | — |
| [`task-kickdb-api/`](./task-kickdb-api) | kick/db on Postgres: 17-table schema with enums and relations, generated + reviewed migrations, migrations on boot, relational queries, a `DbAdapter` with a readiness check | kickjs, kickjs-db (`/pg`) | pg | Postgres |
| [`task-drizzle-api/`](./task-drizzle-api) | Full task-management API (DDD modules): Drizzle wired directly through an adapter, JWT auth, queues, WebSockets, cron, Swagger, DevTools | kickjs, kickjs-swagger, kickjs-devtools, kickjs-ws, kickjs-queue | drizzle-orm, postgres, bullmq, ioredis, nodemailer | Postgres, Redis |
| [`task-prisma-api/`](./task-prisma-api) | The same API on Prisma 7 (`@prisma/adapter-pg`), wired directly through an adapter | kickjs, kickjs-swagger, kickjs-devtools, kickjs-ws, kickjs-queue | prisma, @prisma/client, pg, bullmq, ioredis, nodemailer | Postgres, Redis |
| [`task-mongoose-api/`](./task-mongoose-api) | The same API on MongoDB + Mongoose, with the BYO auth recipe (`@Public`, `RequireRole`) | kickjs, kickjs-swagger, kickjs-devtools, kickjs-ws, kickjs-queue | mongoose, bullmq, ioredis, nodemailer, resend | MongoDB, Redis |
| [`multi-tenant-kickdb-api/`](./multi-tenant-kickdb-api) | Multi-tenancy with kick/db's `'column'` tenancy on SQLite (tenant resolved per request, no tenant code in repositories), committed migrations incl. a seed, BYO JWT auth, readiness check | kickjs, kickjs-schema, kickjs-db (`/sqlite`) | better-sqlite3, jsonwebtoken | — (SQLite file) |
| [`inertia-app/`](./inertia-app) | Inertia (React) notes app with SSR: controllers return pages, create/edit/delete with server-side validation errors back on the form, flash messages, shared props, a deferred prop; kick/db + SQLite with reviewed migrations and a readiness check | kickjs, kickjs-inertia, kickjs-schema, kickjs-db (`/sqlite`) | @inertiajs/react, react, better-sqlite3 | — (SQLite file) |

Every Express-based app also depends on `express`, `zod`, `dotenv` and `reflect-metadata`, and has `@forinda/kickjs-cli`, `@forinda/kickjs-vite` and `@forinda/kickjs-testing` as dev dependencies.

Packages that no longer exist were replaced the way the KickJS docs recommend: `@forinda/kickjs-auth` → the [BYO Auth recipe](https://kickjs.app/guide/byo-recipes#auth); `@forinda/kickjs-drizzle` / `-prisma` → the ORM wired directly in an app-owned `defineAdapter()`; `@forinda/kickjs-db-pg` → `@forinda/kickjs-db/pg`.

The three earlier `multi-tenant-{drizzle,prisma,mongoose}-api` apps were identical (none used its named ORM — the database was simulated in memory) and were merged into `multi-tenant-kickdb-api`.

## Run an app

```bash
git clone https://github.com/forinda/kickjs-examples-archive
cd kickjs-examples-archive/minimal-api   # inertia-app: pnpm build also builds the pages + SSR bundle

pnpm install      # or: npm install
pnpm dev          # or: npm run dev   — Vite HMR + typegen
pnpm test         # or: npm test
pnpm typecheck    # or: npm run typecheck
pnpm build && pnpm start
```

Apps that need a database or Redis have a `.env.example` (copy it to `.env`) and a README with the docker commands and schema/migration step. Apps that issue JWTs refuse to start with `NODE_ENV=production` unless their secrets are set.

Lockfiles are not committed — each app resolves the current published versions on install. With pnpm 10+, the allowed install scripts (`@swc/core`, `esbuild`, Prisma, better-sqlite3) are listed in each app's `pnpm-workspace.yaml`; npm reads `allowScripts` from `package.json`.

## Starting fresh — use the CLI

These are reference apps, not starters. To start a project, scaffold one:

```bash
npx @forinda/kickjs-cli new my-api --template rest   # rest | minimal | fullstack | inertia
```

## Contributing

PRs to update an app, add a variant, or sharpen a pattern are welcome. Framework changes belong in [forinda/kick-js](https://github.com/forinda/kick-js).

- Docs: [kickjs.app](https://kickjs.app)
- npm: [`@forinda/kickjs`](https://www.npmjs.com/package/@forinda/kickjs)

## License

MIT — same as KickJS itself.
