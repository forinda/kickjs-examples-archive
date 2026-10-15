# db-spike-api

> **Superseded by [`task-kickdb-api`](../task-kickdb-api)**, which uses the same `kick db generate` flow on a full schema plus the runtime client, migrations on boot and HTTP routes. This was the original kick/db diff-engine spike and is kept only as the smallest possible "schema → migration" fixture. No server, no routes.

`src/db/schema.ts` declares `users` and `posts` (FK with cascade, indexes, a multi-column unique, relations). `kick db generate` diffs it against the last snapshot and writes `db/migrations/<timestamp>_<name>/` with `up.sql`, `down.sql`, `snapshot.json` and `meta.json`. Generation needs no database.

## Run

```bash
pnpm install                 # or: npm install
pnpm db:generate init        # or: npm run db:generate -- init
pnpm db:generate init        # second run: "No schema changes detected."
pnpm db:generate seed -- --empty   # hand-written migration shell
pnpm typecheck
```

To apply the SQL, see [Migrations](https://kickjs.app/guide/database/migrations) — or use `task-kickdb-api`.
