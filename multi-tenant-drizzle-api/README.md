# multi-tenant-drizzle-api

Multi-tenancy the BYO way: no tenant package, just framework primitives.

- `src/contributors/tenant.context.ts` — `LoadTenant` context decorator resolves the tenant from the subdomain (`acme.localhost` → Acme Corp) into `ctx.get('tenant')`, mounted globally.
- `src/plugins/tenant-db.plugin.ts` — registers `TENANT_DB` as a `Scope.REQUEST` factory that returns the active tenant's database.
- `src/db/tenant-manager.ts` — caches one connection per tenant. The database is **simulated** in memory; the comments show where `drizzle(new Pool({ connectionString: tenant.dbUrl }))` goes.
- `src/auth/` — the BYO Auth recipe (`AuthAdapter`, `jwtStrategy`, `@LoadAuthUser`, `@Public`), replacing the removed `@forinda/kickjs-auth`.

Guides: [Multi-tenancy](https://kickjs.app/guide/multi-tenancy) · [BYO Auth](https://kickjs.app/guide/byo-recipes#auth)

## Run

```bash
pnpm install        # or: npm install
cp .env.example .env  # JWT_SECRET is optional in dev, required in production (openssl rand -hex 32)
pnpm dev            # or: npm run dev
```

```bash
curl http://localhost:3000/api/v1/hello
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'u1',email:'me@acme.test'},process.argv[1]))" "${JWT_SECRET:-dev-secret-change-me}")
curl -H "Host: acme.localhost" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/projects
```

`pnpm test`, `pnpm typecheck`, `pnpm build && pnpm start` work the same way.
