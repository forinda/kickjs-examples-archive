# views-tasks-app

A task list with categories and accounts, rendered on the server with **`.kick` templates** (`@forinda/kickjs-view`) and stored with **kick/db + SQLite**. It has plain HTML forms, a few lines of browser script, and no client framework. Scaffolded with `kick new views-tasks-app --deploy docker`.

- **Accounts:** `src/modules/auth/`. Register, sign in and sign out, with `hashPassword` / `verifyPassword` (scrypt). Signing in starts a new session id (`ctx.session.regenerate()`), and the user id is kept in an encrypted cookie session (`session({ store: 'cookie' })`).
- **Signed-in pages:** `src/auth/require-user.ts` is a `@Middleware` guard. It loads the user into `ctx.get('user')` or redirects to `/login`. `share` in `src/views.ts` hands the user to every template, which is how the layout shows the email and the sign-out button.
- **Tasks:** `src/modules/tasks/`. Add, edit, mark done or open, and delete, with filters by category (including "Uncategorised") and by status. Every query is limited to the signed-in user, so another user's task id answers 404.
- **Categories:** `src/modules/categories/`. Name, colour, and a task count. Deleting a category keeps its tasks, uncategorised (`ON DELETE SET NULL`).
- **Forms:**
  - Route validation (`{ body: zod schema }`) plus `formErrorHandler()`: a failed post goes back to its page with each field's message under `@error('field')` and the values refilled. Passwords are never refilled.
  - Duplicates (an email, a category name) are answered by re-rendering the form with `$errors`.
  - `validate="required | email"` on an input checks it in the browser first, and its message lands in the same spot.
- **Flash messages:** `flash(ctx, { success })` before a redirect, shown by the `flash-toast` component (`src/views/components/flash-toast.kick`). It's a custom element with a `<script client>`, built to `dist/public/_kick/c/` and served from there.
- **Database:** `src/db/` holds the client and schema. `src/adapters/db.adapter.ts` registers the `APP_DB` token, answers `GET /health/ready` with a `SELECT 1`, and closes the handle on shutdown. `db/migrations/` holds the reviewed `init` migration.

Guides: [Views](https://kickjs.app/guide/views) · [Sessions](https://kickjs.app/guide/sessions) · [Passwords](https://kickjs.app/guide/passwords-and-tokens) · [kick/db](https://kickjs.app/guide/database/)

## Run

```bash
pnpm install          # or: npm install  (builds better-sqlite3)
cp .env.example .env  # DB_FILE defaults to data/app.db; SESSION_SECRET required unless NODE_ENV is development or test
pnpm dev              # http://localhost:3000 — applies migrations on boot
```

```bash
pnpm test        # in-memory SQLite + the real migrations: sign-up/in, form errors, task CRUD + filters, categories, isolation
pnpm typecheck
pnpm exec kick check:views   # every template parsed and checked, as `kick build` does
pnpm build       # dist/index.js (templates inside) + dist/public/_kick/c (client scripts)
pnpm db:migrate  # outside development/test the app refuses to boot with pending migrations
NODE_ENV=production SESSION_SECRET=$(openssl rand -hex 32) pnpm start
```

In production the session cookie is `Secure`, so signing in needs HTTPS. Plain `http://localhost` works in development.

**CSRF:** forms are protected by the session cookie's `SameSite=Lax`, which keeps it off cross-site posts. A form posted from another site arrives signed out and is redirected to `/login`.

## Deploy

**Required env:** `SESSION_SECRET` (32+ characters). This fails closed: with `NODE_ENV=production` (the image's) or `NODE_ENV` unset, the app refuses to boot without it.

```bash
docker build -t views-tasks-app .
docker run -p 3000:3000 -e SESSION_SECRET=$(openssl rand -hex 32) -v views-tasks-data:/app/data views-tasks-app
```

- **State:** users, tasks and categories live in `/app/data/app.db` (`DB_FILE`), so keep `/app/data` on a volume. Sessions are in an encrypted cookie, with nothing kept on the server.
- **Migrations:** the image sets `MIGRATE_ON_BOOT=true`, so the committed migrations are applied at startup.
- **One instance:** SQLite is a local file.
