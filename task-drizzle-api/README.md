# task-drizzle-api

A Jira-style task-management API (workspaces, projects, tasks, labels, comments, attachments, channels + chat, notifications, activity, stats) on **PostgreSQL + Drizzle**, in the CLI's flat module layout: per module, `<name>.module.ts`, `<name>.controller.ts`, `<name>.repository.ts`, `<name>.dto.ts`, and a `<name>.service.ts` where there is logic beyond the repository.

What it shows:

- **Drizzle wired directly** (the replacement for the removed `@forinda/kickjs-drizzle`): `src/db/index.ts` exports `DRIZZLE_DB`; `src/adapters/drizzle.adapter.ts` is the `DrizzleAdapter` that connects in `beforeStart`, answers `GET /health/ready` via `onHealthCheck`, and closes the pool on shutdown. `src/shared/query-adapter.ts` turns `ctx.paginate()` query strings (filters, sort, search, pagination) into Drizzle `where` / `orderBy`.
- Repositories as factories (the `kick g module` shape): `createTaskRepository(db)` returns an object, `TaskRepository = ReturnType<typeof createTaskRepository>`, `TASK_REPOSITORY = createToken<TaskRepository>(…)`, bound in the module's `register(container)` and injected with `@Inject(TASK_REPOSITORY)`. Tests swap in in-memory classes that `implements TaskRepository`.
- Return-value handlers (`return value`, `reply.created()`, `reply.noContent()`), `HttpException` for errors.
- JWT auth as a `@Middleware` guard (`src/middleware/auth-bridge.middleware.ts`).
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
| `REDIS_URL`                              | no       | default `redis://localhost:6379`          |
| `SMTP_URL`                               | no       | empty → mail is logged to the console     |
| `JWT_*_EXPIRES_IN`, `APP_*`, `MAIL_FROM_*` | no     | see `.env.example`                        |
