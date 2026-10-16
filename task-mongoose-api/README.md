# task-mongoose-api

A full task-management API (workspaces, projects, tasks, comments, labels, attachments, channels, chat, notifications, activity, stats) on **MongoDB + Mongoose**, in the CLI's flat module layout (`<name>.module.ts` · `.controller.ts` · `.service.ts` · `.repository.ts` · `.schema.ts` · `.dto.ts` per module).

What it shows:

- The [BYO Auth recipe](https://kickjs.app/guide/byo-recipes#auth): `AuthAdapter` (`src/adapters/auth.adapter.ts`) with `defaultPolicy: 'protected'`, a JWT strategy and `@Public` route flag (`src/auth.ts`), `@RequireRole({ roles: ['superadmin'] })` (`src/guards/require-role.guard.ts`). Replaces the removed `@forinda/kickjs-auth`. `LoadAuthUser` (`src/contributors/load-auth-user.contributor.ts`) runs `beforeValidation`, so anonymous requests get 401 and the membership guards (`src/guards`) can read `ctx.get('user')`.
- No account enumeration through invites: `POST /workspaces/:id/invite` answers `202 Invitation sent` whether or not the email has an account (or is already a member). `POST /auth/register` with a taken email answers a generic `409 REGISTRATION_FAILED` — but a 409 still tells a caller the address is registered. Full protection needs an email-verification flow: always answer "check your inbox", and send the existing account a "someone tried to sign up" email instead of a conflict.
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
