# inertia-app

A notes app on **KickJS + Inertia (React)** with **kick/db + SQLite**: controllers return pages, React renders them, and there is no client router or JSON API between the two. Scaffolded with `kick new inertia-app --template inertia`.

- `src/modules/notes/note.controller.ts` — list / create / edit / update / delete. Handlers return `inertia('Notes/Index', props)` or `redirect('/notes')`, and throw `HttpException.notFound()` for a missing note (rendered by the `Error` page).
  - **Validation errors**: a failed `noteSchema` body check → `inertiaErrorHandler()` redirects back to the form, and the messages arrive as `props.errors` (`form.errors.title` in `useForm`). API clients posting JSON without `X-Inertia` get the usual 422.
  - **Flash**: `flash(ctx, { success })` (or `{ error }`) before each redirect. `src/client/toasts.tsx` turns Inertia's `flash` event into toasts — top-right, dismissible (×), gone after 4s. Inertia keeps flash out of history and the session drops it after one response, so a toast never comes back on back/forward or reload.
  - **Deferred prop**: `stats: defer(() => notes.stats())` is left out of the first response and fetched right after render; the page wraps it in `<Deferred>`.
- `src/config/inertia.ts` — adapter options, incl. the **shared props** every page gets (`appName`, a stub `user`).
- `src/client/pages/` — `Notes/Index.tsx`, `Notes/Edit.tsx`, `Error.tsx`; server-rendered (`src/client/ssr.tsx`) and hydrated (`main.tsx`).
- `src/db/` — client + schema; `src/adapters/db.adapter.ts` — `DbAdapter` (`APP_DB` token, `SELECT 1` on `GET /health/ready`, closes the handle on shutdown). `kickDbAdapter()` applies migrations on boot outside production. `db/migrations/` holds the reviewed `init` migration.
- `src/modules/notes/note.repository.ts` — factory repository (`createNoteRepository(db)`, contract = its `ReturnType`, `NOTE_REPOSITORY` token bound in the module's `register()`).

Validation errors and flash messages travel in the session (an encrypted cookie). Guides: [Inertia](https://kickjs.app/guide/inertia) · [kick/db](https://kickjs.app/guide/database/)

## Run

```bash
pnpm install          # or: npm install  (builds better-sqlite3)
cp .env.example .env  # DB_FILE defaults to data/app.db; SESSION_SECRET required in production
pnpm dev              # http://localhost:3000 — applies migrations on boot, HMR for pages and server
```

```bash
pnpm test        # in-memory SQLite + the real migrations: page objects, validation round trip, CRUD + flash
pnpm typecheck
pnpm build       # server (dist/index.js) + pages (dist/client) + SSR bundle (dist/ssr/ssr.js)
pnpm db:migrate  # production refuses to boot with pending migrations
NODE_ENV=production SESSION_SECRET=$(openssl rand -hex 32) pnpm start
```

The same URL answers HTML on a first visit and the page object as JSON for Inertia:

```bash
curl http://localhost:3000/notes                       # HTML shell, server-rendered
curl -H 'X-Inertia: true' http://localhost:3000/notes  # {"component":"Notes/Index","props":{...}}
curl http://localhost:3000/health/ready                # {"status":"ready","checks":[{"name":"sqlite","status":"up"}]}
```

(After a production build, an Inertia request also needs the current `X-Inertia-Version` — the one in the HTML's page data — or it gets a 409 telling the client to reload.)

In production the session cookie is `Secure`, so flash messages and form errors need HTTPS; plain `http://localhost` works in development.

The template's Netlify / Vercel / Docker files were removed: a SQLite file on local disk doesn't fit a serverless function, and this archive doesn't commit lockfiles. For those targets, switch the dialect (e.g. `@forinda/kickjs-db/pg`) and take the files from a fresh `kick new --template inertia`.
