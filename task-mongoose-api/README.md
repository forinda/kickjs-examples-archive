# task-mongoose-api

A full task-management API (workspaces, projects, tasks, comments, labels, attachments, channels, chat, notifications, activity, stats) on **MongoDB + Mongoose**, in the CLI's flat module layout (`<name>.module.ts` · `.controller.ts` · `.service.ts` · `.repository.ts` · `.schema.ts` · `.dto.ts` per module).

What it shows:

- The [BYO Auth recipe](https://kickjs.app/guide/byo-recipes#auth): `AuthAdapter` (`src/adapters/auth.adapter.ts`) with `defaultPolicy: 'protected'`, a JWT strategy and `@Public` route flag (`src/auth.ts`), `@RequireRole({ roles: ['superadmin'] })` (`src/guards/require-role.guard.ts`). Replaces the removed `@forinda/kickjs-auth`. `LoadAuthUser` (`src/contributors/load-auth-user.contributor.ts`) runs `beforeValidation`, so anonymous requests get 401 and the membership guards (`src/guards`) can read `ctx.get('user')`.
- No account enumeration through invites: `POST /workspaces/:id/invite` answers `202 Invitation sent` whether or not the email has an account (or is already a member). `POST /auth/register` with a taken email answers a generic `409 REGISTRATION_FAILED` — but a 409 still tells a caller the address is registered. Full protection needs an email-verification flow: always answer "check your inbox", and send the existing account a "someone tried to sign up" email instead of a conflict.
- Workspace scoping (`src/guards/`): a user outside a workspace gets the same 404 as for a missing record on everything in it, so ids from other workspaces can't be probed. Workspace and project routes use `workspaceMembershipGuard` / `projectAccessGuard`; routes under `/tasks/:taskId` (the task, status, assignees, reorder, subtasks, activity, comments, attachments) `taskAccessGuard`; `/channels/:channelId` and its messages `channelMembershipGuard` (a private channel only for its members, also on `/ws/chat`); `/attachments/:id`, `/comments/:id`, `/messages/:id` and `/labels/:id` check their record's workspace. Channel lists show public channels plus the private ones the caller belongs to. Deleting a channel and removing someone else from it is for the channel's creator or a workspace admin (403 for other members); leaving is always allowed. Adding people — channel members, task assignees (`PATCH /tasks/:taskId/assignees` and `assigneeIds` on create), project leads — only accepts users already in the same workspace; anyone else gets 404 `USER_NOT_FOUND`, the same answer as an unknown id, so other workspaces' users can't be probed or pulled in (workspace invites go by email and answer the same either way). A task's labels must be its workspace's, its parent a task of the same project, and a reply's parent comment one on the same task. Any workspace member may edit a task; deleting it is for its reporter or an admin, and changing or archiving a project is for its lead or an admin. Comments and messages are edited and deleted by their author or a workspace admin (403 for other members, HTTP and `/ws/chat`); `PATCH /notifications/:id/read` only touches the caller's own notification.
- Repositories — one file each (`modules/*/*.repository.ts`, next to the Mongoose model in `*.schema.ts`): `createXRepository(connection)` factory, `XRepository = ReturnType<…>`, `X_REPOSITORY` token, bound in the module's `register()` with the connection the Mongoose adapter registers (`MONGO_CONNECTION`).
- `src/adapters/` — Mongoose and Redis clients as `defineAdapter()`s: connect in `beforeStart`, `onHealthCheck` feeding `GET /health/ready`, close in `shutdown`.
- Background jobs — `@Job` / `@Process` classes in `modules/queues`, run by `QueueAdapter` (`@forinda/kickjs-queue`, BullMQ) and enqueued through `JOB_DISPATCHER`.
- Scheduled jobs — `@Cron` methods in `modules/crons`, run by `KickCronAdapter()`.
- WebSockets — `@WsController` chat with presence (`@forinda/kickjs-ws`, at `/ws/chat`).
- Mail — a small BYO mailer plugin (`src/plugins/mailer.plugin.ts`): console in dev, Resend in production.
- OpenAPI at `/docs` (`@forinda/kickjs-swagger`) under development/test only; DevTools at `/_debug` (`@forinda/kickjs-devtools`) in `kick dev` only — the `__KICKJS_DEVTOOLS__` build flag drops it from `kick build`.
- Return-value handlers (`return value`, `reply.created(...)`), `ctx.paginate` with query configs, file upload (`@FileUpload`).

## Run

Needs MongoDB and Redis:

```bash
docker run -d --name tm-mongo -p 127.0.0.1:27017:27017 mongo:7
docker run -d --name tm-redis -p 127.0.0.1:6379:6379 redis:7-alpine

pnpm install          # or: npm install
cp .env.example .env
pnpm seed             # or: npm run seed   — sample users, workspace, project, tasks
pnpm dev              # or: npm run dev
```

Log in as `alice@vibed.dev` / `Password123!` via `POST /api/v1/auth/login`, then send `Authorization: Bearer <accessToken>`.

| Variable | Notes |
| --- | --- |
| `MONGODB_URI`, `REDIS_URL` | required |
| `JWT_SECRET` | dev defaults only when `NODE_ENV` is `development` or `test`; **required** (32+ chars) otherwise, including an unset `NODE_ENV` |
| `RESEND_API_KEY` | required unless `NODE_ENV` is `development` or `test` (mail goes through Resend); development/test log mail to the console |

`pnpm test` (no services needed), `pnpm typecheck`, `pnpm build && pnpm start`, `pnpm db:reset` (drop + reseed).

## Deploy

**Required env** (fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without them): `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET` (32+ chars), `RESEND_API_KEY` (mail goes through Resend outside development/test).

**Docker**

```bash
docker build -t task-mongoose-api .
docker run -p 3000:3000 -e MONGODB_URI=mongodb://… -e REDIS_URL=redis://… \
  -e JWT_SECRET=$(openssl rand -hex 32) -e RESEND_API_KEY=re_… task-mongoose-api
```

**Compose** — MongoDB, Redis and the API:

```bash
JWT_SECRET=$(openssl rand -hex 32) RESEND_API_KEY=re_… docker compose up --build
```

- **Schema:** none to migrate — Mongoose creates collections and indexes on first use. `pnpm seed` (dev only, needs `tsx`) loads demo data.
- **State:** MongoDB (`mongo-data` volume) and Redis queues (`redis-data`); attachments are stored in MongoDB. The container keeps nothing.
- **Swagger** (`/docs`, `/openapi.json`) is mounted only under development/test.

**Not serverless:** WebSockets (`/ws`), BullMQ workers and `@Cron` jobs need a long-running process.

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
