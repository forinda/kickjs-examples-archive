# task-mongoose-api

A full task-management API (workspaces, projects, tasks, comments, labels, attachments, channels, chat, notifications, activity, stats) on **MongoDB + Mongoose**, in a DDD layout (`domain/` · `application/` · `infrastructure/` · `presentation/` per module).

What it shows:

- `src/auth/` — the [BYO Auth recipe](https://kickjs.app/guide/byo-recipes#auth): `AuthAdapter` with `defaultPolicy: 'protected'`, a JWT strategy, `@Public` route flag, `@RequireRole({ roles: ['superadmin'] })`. Replaces the removed `@forinda/kickjs-auth`. `LoadAuthUser` runs `beforeValidation`, so anonymous requests get 401 and the membership guards (`src/shared/guards`) can read `ctx.get('user')`.
- `src/shared/infrastructure/` — Mongoose and Redis clients as `defineAdapter()`s: connect in `beforeStart`, `onHealthCheck` feeding `GET /health/ready`, close in `shutdown`.
- Background jobs — `@Job` / `@Process` classes in `modules/queue`, run by `QueueAdapter` (`@forinda/kickjs-queue`, BullMQ) and enqueued through `JOB_DISPATCHER`.
- Scheduled jobs — `@Cron` methods in `modules/cron`, run by `KickCronAdapter()`.
- WebSockets — `@WsController` chat with presence (`@forinda/kickjs-ws`, at `/ws/chat`).
- Mail — a small BYO mailer plugin (`src/plugins/mailer.plugin.ts`): console in dev, Resend in production.
- OpenAPI at `/docs` (`@forinda/kickjs-swagger`), DevTools at `/_debug` (`@forinda/kickjs-devtools`).
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
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | dev defaults outside production; **required** (32+ chars) when `NODE_ENV=production` |
| `RESEND_API_KEY` | required in production (mail goes through Resend); dev logs mail to the console |

`pnpm test` (no services needed), `pnpm typecheck`, `pnpm build && pnpm start`, `pnpm db:reset` (drop + reseed).
