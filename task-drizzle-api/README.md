# task-drizzle-api

A Jira-style task-management API (workspaces, projects, tasks, labels, comments, attachments, channels + chat, notifications, activity, stats) on **PostgreSQL + Drizzle**, in the CLI's flat module layout: per module, `<name>.module.ts`, `<name>.controller.ts`, `<name>.repository.ts`, `<name>.dto.ts`, and a `<name>.service.ts` where there is logic beyond the repository.

What it shows:

- **Drizzle wired directly** (the replacement for the removed `@forinda/kickjs-drizzle`): `src/db/index.ts` exports `DRIZZLE_DB`; `src/adapters/drizzle.adapter.ts` is the `DrizzleAdapter` that connects in `beforeStart`, answers `GET /health/ready` via `onHealthCheck`, and closes the pool on shutdown. `src/shared/query-adapter.ts` turns `ctx.paginate()` query strings (filters, sort, search, pagination) into Drizzle `where` / `orderBy`.
- Repositories as factories (the `kick g module` shape): `createTaskRepository(db)` returns an object, `TaskRepository = ReturnType<typeof createTaskRepository>`, `TASK_REPOSITORY = createToken<TaskRepository>(…)`, bound in the module's `register(container)` and injected with `@Inject(TASK_REPOSITORY)`. Tests swap in in-memory classes that `implements TaskRepository`.
- Return-value handlers (`return value`, `reply.created()`, `reply.noContent()`), `HttpException` for errors.
- JWT auth as a `@Middleware` guard (`src/middleware/auth-bridge.middleware.ts`).
- Workspace scoping (`src/guards/`): every route that names a workspace, project, task, comment, label, attachment or channel — by path, body or query — requires membership of that record's workspace (`workspace-membership.guard.ts`, `resource-access.guard.ts`), and a non-member gets the same 404 as a missing record, so ids from other workspaces can't be probed. Updating or deleting a workspace and managing its members is admin-only (403 for other members). Lists take a required filter (`GET /tasks?projectId=`, `/comments?taskId=`, `/attachments?taskId=`, `/labels?workspaceId=`) instead of listing every workspace. Channels (`channel-membership.guard.ts`, HTTP and `/ws/chat`): a public channel is open to every workspace member; a private or direct one only to its own members — anyone else gets 404 on the channel, its members and its messages, and `GET /channels?workspaceId=` lists public channels plus the private ones the caller belongs to. Renaming or deleting a channel and removing someone else from it is for the channel's creator or a workspace admin (403 for other members); leaving is always allowed. Adding people — channel members, task assignees (`POST /tasks/:id/assignees/:userId` and `assigneeIds` on create), project leads — only accepts users already in the same workspace; anyone else gets 404 `User not found`, the same answer as an unknown id, so other workspaces' users can't be probed or pulled in (invites go by email and answer the same either way). Any workspace member may edit a task; deleting it is for its reporter or an admin, and changing or deleting a project is for its lead or an admin. Comments and messages are edited and deleted by their author or a workspace admin; `PUT /notifications/:id/read` only touches the caller's own; `DELETE /users/:id` is superadmin-only. Users only see each other through a shared workspace: `GET /users` lists the caller plus everyone who shares at least one accepted membership with them (the scope is AND-ed with the filters in SQL, so search, filters, pages and `total` all count that set; only public profile columns are returned), and `GET /users/:id` for anyone else gets the same 404 as an unknown id. A workspace invite still looks the invitee up by email, so outsiders can be invited.
- Invites are pending until accepted: `POST /workspaces/:id/members` (admins, body `{ email, role }`) records a `pending` membership (`workspace_members.status`) and answers `202 Invitation sent` whether or not the email has an account, or is already a member or invited — no account enumeration. The invitee lists theirs with `GET /workspaces/invites` and joins with `POST /workspaces/:id/invite/accept` or drops it with `POST /workspaces/:id/invite/decline` (404 `INVITE_NOT_FOUND` when they have no pending invite there). A pending invite grants nothing: every membership check — workspace access, channel/assignee/lead targets, user visibility, stats — counts accepted rows only, so a stranger can't create a workspace, invite you, and see your profile.
- List queries take an allowlist (`*.constants.ts`): a `filter`/`sort` on any other field is a 400, and so is any field starting with `$` or containing `.`. `GET /users` filters on `id`, `email`, `firstName`, `lastName` only, so the password hash can't be recovered by prefix matches. LIKE wildcards in filter values match literally.
- `@forinda/kickjs-queue` (BullMQ) jobs with `@Job` / `@Process`, `@Cron` jobs run by `KickCronAdapter`, `@forinda/kickjs-ws` chat (`/ws/chat`), `@forinda/kickjs-swagger` (`/docs`), `@forinda/kickjs-devtools` (`/_debug`), and a BYO nodemailer `MailerPlugin` (`src/plugins/mailer.plugin.ts`).

Packages: `@forinda/kickjs`, `-schema`, `-swagger`, `-devtools`, `-ws`, `-queue`, `-cli`, `-vite`, `-testing`; `drizzle-orm`, `postgres`, `bullmq`, `ioredis`, `jsonwebtoken`, `bcryptjs`, `nodemailer`, `croner`.

## Run

```bash
docker run -d --name task-pg -p 127.0.0.1:5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=task_drizzle postgres:18-alpine
docker run -d --name task-redis -p 127.0.0.1:6379:6379 redis:7-alpine

pnpm install            # or: npm install
cp .env.example .env    # then set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -hex 32)

# drizzle-kit does not read .env — export it first
set -a; . ./.env; set +a
pnpm db:push            # or: npm run db:push — creates the tables from src/db/schema
pnpm dev                # or: npm run dev
```

`pnpm test` runs without a database (in-memory repositories). `pnpm typecheck`, `pnpm build && pnpm start` as usual.

```bash
curl -X POST localhost:3000/api/v1/auth/register -H 'content-type: application/json' \
  -d '{"email":"ada@example.com","password":"Password123!","firstName":"Ada","lastName":"L"}'
curl localhost:3000/health/ready
```

## Environment

| Variable                                 | Required | Notes                                     |
| ---------------------------------------- | -------- | ----------------------------------------- |
| `DATABASE_URL`                           | yes      | Postgres connection string                |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`       | yes      | 32+ characters each, no defaults          |
| `REDIS_URL`                              | prod     | dev/test default `redis://localhost:6379` |
| `SMTP_URL`                               | prod     | dev/test default empty → mail logged to the console |
| `APP_URL`                                | prod     | dev/test default `http://localhost:3000`  |
| `JWT_*_EXPIRES_IN`, `APP_NAME`, `MAIL_FROM_*` | no | see `.env.example`                        |

"prod" = required unless `NODE_ENV` is exactly `development` or `test` — an unset `NODE_ENV` gets no dev default (`src/config/dev-default.ts`). Swagger (`/docs`, `/openapi.json`) is likewise on only under development/test; DevTools (`/_debug`) only in `kick dev` — the `__KICKJS_DEVTOOLS__` build flag drops it from `kick build`.

## Deploy

**Required env** (fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without them): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (32+ chars each), `REDIS_URL`, `APP_URL`, `SMTP_URL`.

**Docker**

```bash
docker build -t task-drizzle-api .
docker run -p 3000:3000 -e DATABASE_URL=postgres://… -e REDIS_URL=redis://… -e SMTP_URL=smtp://… \
  -e APP_URL=https://api.example.com -e JWT_SECRET=$(openssl rand -hex 32) -e JWT_REFRESH_SECRET=$(openssl rand -hex 32) task-drizzle-api
```

**Compose** — Postgres, Redis, Mailpit (UI on :8025), a one-off schema push and the API:

```bash
JWT_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- **Schema:** the app does not create its tables. The runtime image has no dev dependencies, so the schema step runs from the build stage (`docker build --target build`): compose's `migrate` service runs `pnpm db:push` (`drizzle-kit push`) before the API starts. Run the same once per release against your database; for a real production history, apply the committed migrations in `drizzle/` instead (`pnpm db:migrate`; `0000_baseline` is the schema before `workspace_members.status`, `0001_membership_status` adds it with existing rows `accepted`). A database created with `db:push` gets the column from the next `db:push`.
- **State:** Postgres (`pg-data` volume; attachments are stored there too) and Redis queues (`redis-data`); the container itself keeps nothing.
- **Swagger** (`/docs`, `/openapi.json`) is mounted only under development/test.

**Not serverless:** WebSockets (`/ws`), BullMQ workers and `@Cron` jobs need a long-running process.

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
