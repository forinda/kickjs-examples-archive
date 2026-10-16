# multi-tenant-kickdb-api

Multi-tenancy on **kick/db + SQLite**, with no tenant code in handlers or repositories.

- `src/db/tenancy.ts` — `defineTenancy({ strategy: 'column' })`: kick/db adds `workspaceId = <current tenant>` to every query on a tenanted table and stamps it on insert. (`'rls'` and `'schema'` are Postgres-only; `'column'` works on SQLite.)
- `src/db/schema.ts` — `tenants` (registry, not tenanted) and `projects` (`workspaceId: tenantKey(tenancy, varchar(64))` — the tenant column is named and typed like the registry's key).
- `db/migrations/` — `init` from `kick db generate`, plus a hand-written `seed_tenants` data migration (Acme → `acme`, Globex → `globex`). Both reviewed.
- `src/adapters/db.adapter.ts` — `DbAdapter` registers the client under `APP_DB`, reports `sqlite` on `GET /health/ready`, closes the handle on shutdown. `kickDbAdapter()` applies pending migrations on boot only when NODE_ENV is development or test (anywhere else pending migrations stop the boot).
- `src/contributors/tenant.contributor.ts` — `@LoadTenant` resolves the tenant from the `x-tenant` header or the subdomain; a tenant the signed-in user doesn't belong to (the token's `tenants` claim) gets the same 404 as an unknown one, so tenant names can't be probed. kick/db reads it as the current tenant.
- `src/modules/projects/project.repository.ts` — factory repository (`createProjectRepository(db)`, contract = its `ReturnType`, `PROJECT_REPOSITORY` token).
- BYO Auth recipe: `src/auth.ts` (`jwtStrategy`, `@Public`), `src/contributors/auth-user.contributor.ts` (`@LoadAuthUser`), `src/adapters/auth.adapter.ts` (`AuthAdapter`).

Guides: [Tenancy](https://kickjs.app/guide/database/tenancy) · [Multi-tenancy](https://kickjs.app/guide/multi-tenancy) · [BYO Auth](https://kickjs.app/guide/byo-recipes#auth)

## Run

```bash
pnpm install        # or: npm install  (builds better-sqlite3)
cp .env.example .env  # DB_FILE defaults to data/app.db; JWT_SECRET required unless NODE_ENV is development or test
pnpm dev            # or: npm run dev — applies migrations on boot
```

```bash
# The token lists the tenants this user belongs to; any other tenant answers 404, same as one that doesn't exist.
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'u1',email:'me@acme.test',tenants:['acme','globex']},process.argv[1]))" "${JWT_SECRET:-dev-only-jwt-secret-change-me-0123456789}")
curl -X POST -H "x-tenant: acme" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Anvil"}' http://localhost:3000/api/v1/projects
curl -H "x-tenant: acme"   -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/projects  # Anvil
curl -H "x-tenant: globex" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/projects  # empty
curl http://localhost:3000/health/ready
```

`pnpm test` runs against an in-memory SQLite (`DB_FILE=:memory:` in `vitest.config.ts`) with the real migrations and checks tenant isolation. `pnpm db:status`, `pnpm db:generate <name>`, `pnpm build && pnpm start` also work.

## Deploy

**Required env:** `JWT_SECRET` (32+ chars; fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without it).

**Docker**

```bash
docker build -t multi-tenant-kickdb-api .
docker run -p 3000:3000 -e JWT_SECRET=$(openssl rand -hex 32) -v multi-tenant-data:/app/data multi-tenant-kickdb-api
```

- **State:** the SQLite file is `/app/data/app.db` (`DB_FILE`) — keep `/app/data` on a volume, or every deploy starts empty.
- **Migrations:** the image sets `MIGRATE_ON_BOOT=true`, so the committed migrations in `db/migrations` (seed included) are applied at startup. Without it, outside development/test, pending migrations stop the boot.
- One instance: SQLite is a local file, so don't scale it out (move to Postgres for that).

**Not serverless:** a function's filesystem is ephemeral and per instance, so the SQLite database would not survive.

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
