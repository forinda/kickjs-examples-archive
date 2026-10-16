# task-prisma-api

A full task-management API (users, auth, workspaces, projects, tasks, labels, comments, attachments, channels + chat, notifications, activity, stats) on **Prisma 7** and PostgreSQL, in the flat module layout `kick g module` generates (`<name>.module.ts`, `.controller.ts`, `.service.ts` where there is real logic, `.repository.ts`, `.dto.ts`, tests beside the code).

What it shows:

- **Prisma wired directly** (`src/adapters/prisma.adapter.ts`, token in `src/db/prisma.ts`) — `PrismaAdapter` creates `new PrismaClient({ adapter: new PrismaPg(...) })`, registers it under `PRISMA_CLIENT`, reports it on `GET /health/ready`, disconnects on shutdown. Replaces the removed `@forinda/kickjs-prisma`. The client omits `User.passwordHash` globally.
- One file per repository (`src/modules/<module>/<name>.repository.ts`): a `createXRepository(prisma)` factory, `type XRepository = ReturnType<…>`, and an `X_REPOSITORY` token bound in the module's `register()` — the shape `kick g module` generates.
- `src/shared/query-adapter.ts` — turns `ctx.qs()` / `ctx.paginate()` filters, sort, search and pagination into Prisma `findMany` args.
- JWT auth as a guard middleware (`src/middleware/auth-bridge.middleware.ts`).
- Workspace scoping (`src/guards/`): every route that names a workspace, project, task, comment, label, attachment or channel — by path, body or query — requires membership of that record's workspace (`workspace-membership.guard.ts`, `resource-access.guard.ts`), and a non-member gets the same 404 as a missing record, so ids from other workspaces can't be probed. Updating or deleting a workspace and managing its members is admin-only (403 for other members). Lists take a required filter (`GET /tasks?projectId=`, `/comments?taskId=`, `/attachments?taskId=`, `/labels?workspaceId=`) instead of listing every workspace. Channels (`channel-membership.guard.ts`, HTTP and `/ws/chat`): a public channel is open to every workspace member; a private or direct one only to its own members — anyone else gets 404 on the channel, its members and its messages, and `GET /channels?workspaceId=` lists public channels plus the private ones the caller belongs to. Renaming or deleting a channel and removing someone else from it is for the channel's creator or a workspace admin (403 for other members); leaving is always allowed. Adding people — channel members, task assignees (`POST /tasks/:id/assignees/:userId` and `assigneeIds` on create), project leads — only accepts users already in the same workspace; anyone else gets 404 `User not found`, the same answer as an unknown id, so other workspaces' users can't be probed or pulled in (a workspace invite only needs the user to exist). Any workspace member may edit a task; deleting it is for its reporter or an admin, and changing or deleting a project is for its lead or an admin. Comments and messages are edited and deleted by their author or a workspace admin; `PUT /notifications/:id/read` only touches the caller's own; `DELETE /users/:id` is superadmin-only.
- `@forinda/kickjs-queue` (BullMQ workers for email, notifications, activity), `@forinda/kickjs-ws` (`/ws/chat`), `@forinda/kickjs-swagger` (`/docs`, `/openapi.json`), `@forinda/kickjs-devtools` (`/_debug`).
- Scheduled jobs with the framework's `@Cron` + `KickCronAdapter` (needs `croner`).
- A BYO mailer plugin (`src/plugins/mailer.plugin.ts`) — logs to the console unless `SMTP_URL` is set.
- Return-value handlers: `return successResponse(x)`, `reply.created(...)`, `reply.noContent()`.

## Run

Needs Postgres and Redis:

```bash
docker run -d --name vibed-pg -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vibed postgres:18-alpine
docker run -d --name vibed-redis -p 127.0.0.1:6379:6379 redis:7-alpine

pnpm install           # or: npm install — runs `prisma generate`
cp .env.example .env   # set JWT_SECRET and JWT_REFRESH_SECRET (32+ chars: openssl rand -hex 32)
pnpm db:push           # or: npm run db:push — sync the schema
pnpm dev               # or: npm run dev
```

`pnpm test` (in-memory repositories, no database), `pnpm typecheck`, `pnpm build && pnpm start`.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | yes | 32+ chars, no defaults |
| `REDIS_URL` | prod | dev/test default `redis://localhost:6379` |
| `SMTP_URL` | prod | dev/test default empty → mail is logged to the console |
| `APP_URL` | prod | dev/test default `http://localhost:3000` |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `APP_NAME`, `MAIL_FROM_*` | no | see `.env.example` |

"prod" = required unless `NODE_ENV` is exactly `development` or `test` — an unset `NODE_ENV` gets no dev default (`src/config/dev-default.ts`). Swagger (`/docs`, `/openapi.json`) is likewise on only under development/test; DevTools (`/_debug`) only in `kick dev` — the `__KICKJS_DEVTOOLS__` build flag drops it from `kick build`.

## Deploy

**Required env** (fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without them): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (32+ chars each), `REDIS_URL`, `APP_URL`, `SMTP_URL`.

**Docker**

```bash
docker build -t task-prisma-api .
docker run -p 3000:3000 -e DATABASE_URL=postgres://… -e REDIS_URL=redis://… -e SMTP_URL=smtp://… \
  -e APP_URL=https://api.example.com -e JWT_SECRET=$(openssl rand -hex 32) -e JWT_REFRESH_SECRET=$(openssl rand -hex 32) task-prisma-api
```

**Compose** — Postgres, Redis, Mailpit (UI on :8025), a one-off schema push and the API:

```bash
JWT_SECRET=$(openssl rand -hex 32) JWT_REFRESH_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- **Schema:** the app does not create its tables. The runtime image has no dev dependencies, so the schema step runs from the build stage (`docker build --target build`): compose's `migrate` service runs `pnpm db:push` (`prisma db push`) before the API starts. Run the same once per release against your database; for a real production history, generate and commit migrations and apply those instead.
- **State:** Postgres (`pg-data` volume; attachments are stored there too) and Redis queues (`redis-data`); the container itself keeps nothing.
- **Swagger** (`/docs`, `/openapi.json`) is mounted only under development/test.

**Not serverless:** WebSockets (`/ws`), BullMQ workers and `@Cron` jobs need a long-running process.

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
