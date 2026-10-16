# fullstack-app

A bookmarks app as a **KickJS fullstack workspace**: a KickJS API in `server/` (kick/db + SQLite) and a Vite + React app in `web/` that calls it through **`@forinda/kickjs-client`**, typed from the server's own handlers. Scaffolded with `kick new fullstack-app --template fullstack`.

| Package   | What                                                               |
| --------- | ------------------------------------------------------------------ |
| `server/` | KickJS API on `/api/v1/bookmarks`, serves `web/dist` in production |
| `web/`    | React UI — list, add (with per-field validation errors), delete    |

- `server/src/modules/bookmarks/` — return-value controller (`list`, `create` → `reply.created`, `remove` → `reply.noContent` / `HttpException.notFound`), Zod body schema (`bookmark.dto.ts`), factory repository bound to `BOOKMARK_REPOSITORY` in the module's `register()`.
- `server/src/db/` — schema + one SQLite handle; `server/src/adapters/db.adapter.ts` — `DbAdapter` (`APP_DB` token, `SELECT 1` on `GET /health/ready`, closes on shutdown). `kickDbAdapter()` applies migrations on boot outside production; production refuses to boot with pending ones. `server/db/migrations/` holds the reviewed `init` migration.
- `server/src/config/validation-error.ts` — `bootstrap({ validationError })`: a 422 `problem+json` with `errors: [{ field, message }]`. The default 422 drops `errors` in production; the form needs them in every environment.
- `web/src/App.tsx` — **no hand-written response types**: `Bookmark` and the form input are read off `KickClientApi.Api` (the route map `kick typegen` writes to `server/.kickjs/types/kick__client.d.ts`, listed in `web/tsconfig.json` `types`). A `KickClientError` with status 422 becomes a message under each input.
- `server/src/index.ts` — `SpaAdapter({ clientDir: '../web/dist' })`: one Node process serves the API and the built web app (deep links fall back to `index.html`).

Packages: `@forinda/kickjs`, `@forinda/kickjs-db` (`/sqlite`), `@forinda/kickjs-schema`, `@forinda/kickjs-client`; `better-sqlite3`, `zod`, `react`.

## Env (`server/.env`)

| Variable  | Default       |                                               |
| --------- | ------------- | --------------------------------------------- |
| `PORT`    | `3000`        | `web/vite.config.ts` proxies `/api` to 3000   |
| `DB_FILE` | `data/app.db` | SQLite file (gitignored); `:memory:` in tests |

```bash
cp server/.env.example server/.env
```

## Run — pnpm (from the workspace root)

```bash
pnpm install       # builds better-sqlite3 (approved in pnpm-workspace.yaml)
pnpm dev           # server (kick dev, :3000) + web (vite, :5173) — open http://localhost:5173
pnpm test          # server tests: in-memory SQLite + the real migration, CRUD + 422 field errors
pnpm typecheck     # server, then web against the route map
pnpm lint
pnpm build         # kick typegen → server/dist + web/dist
pnpm db:migrate    # production refuses to boot with pending migrations
pnpm start         # http://localhost:3000 — API on /api, the web app everywhere else
```

## Run — npm

The root scripts call pnpm; with npm, run the workspaces directly:

```bash
npm install
npm run dev -w server            # terminal 1
npm run dev -w web               # terminal 2 — open http://localhost:5173
npm test -w server
npm exec -w server -- kick typegen && npm run build -w web && npm run build -w server
npm run db:migrate -w server && npm start -w server
```

## Keeping the route map fresh

`kick dev` writes `kick__client.d.ts` when it starts, not on save (it builds a full TypeScript program over the server). After changing a route or what a handler returns, run `pnpm --filter ./server exec kick typegen` and `web/` follows; `pnpm build` always runs it first. On TypeScript 7 this needs `@typescript/typescript6`, already a server dev dependency.

```bash
curl -X POST localhost:3000/api/v1/bookmarks -H 'content-type: application/json' -d '{"url":"nope","title":""}'
# 422 {"detail":"Enter a full http(s) URL","errors":[{"field":"url",…},{"field":"title","message":"Title is required"}],…}
```

The template's Netlify / Vercel / Docker files were removed: a SQLite file on local disk doesn't fit a serverless function, and this archive doesn't commit lockfiles. Take them from a fresh `kick new --template fullstack` after switching the dialect.
