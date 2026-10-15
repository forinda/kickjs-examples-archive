# task-prisma-api

A full task-management API (users, auth, workspaces, projects, tasks, labels, comments, attachments, channels + chat, notifications, activity, stats) on **Prisma 7** and PostgreSQL, in a DDD layout (`domain/`, `application/`, `infrastructure/`, `presentation/` per module).

What it shows:

- **Prisma wired directly** (`src/db/prisma.ts`) — `PrismaAdapter` creates `new PrismaClient({ adapter: new PrismaPg(...) })`, registers it under `PRISMA_CLIENT`, reports it on `GET /health/ready`, disconnects on shutdown. Replaces the removed `@forinda/kickjs-prisma`. The client omits `User.passwordHash` globally.
- `src/shared/infrastructure/query-adapter.ts` — turns `ctx.qs()` / `ctx.paginate()` filters, sort, search and pagination into Prisma `findMany` args.
- JWT auth as a guard middleware (`authBridgeMiddleware`) plus workspace / project / channel access guards.
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
| `REDIS_URL` | no | default `redis://localhost:6379` |
| `SMTP_URL` | no | unset → mail is logged |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `APP_URL`, `APP_NAME`, `MAIL_FROM_*` | no | see `.env.example` |
