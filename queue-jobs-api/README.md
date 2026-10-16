# queue-jobs-api

Background jobs with **`@forinda/kickjs-queue`** (BullMQ on Redis): `@Job` / `@Process` handlers, dispatch from a controller through `JOB_DISPATCHER`, and one codebase that runs as API + workers, API only, or a separate worker process.

- `src/modules/jobs/job.processors.ts` — `@Job('email')` / `@Job('reports')` handlers. `send` fails `failTimes` attempts on purpose (retries), `build` is a long job that reports progress with `job.updateProgress()`, `digest` is fired by a repeatable job scheduler. A handler's return value is the job's `returnvalue`.
- `src/modules/jobs/job.controller.ts` — enqueues through `JOB_DISPATCHER` (backend-neutral) and answers `202 { jobId }`; retries with exponential backoff (`attempts: 4`, 1s/2s/4s), a delayed reminder, bulk dispatch (`QueueService.addBulk`), a repeatable job (`upsertJobScheduler`, BullMQ 6), and `GET /jobs/:queue/:id` for state / progress / attempts / result.
- `src/adapters/job-errors.adapter.ts` — an `onError` observer: QueueAdapter reports every failed attempt with `source: 'job'` (context: queue, job, id, attemptsMade) before BullMQ retries it. Swap the log line for Sentry/Datadog.
- `src/adapters/queue-health.adapter.ts` — reports Redis on `GET /health/ready` over the queue's own connection.
- `src/index.ts` / `src/worker.ts` — `APP_ROLE` picks the role. Importing the `@Job` classes is what starts workers, so `api` skips that import and `worker` mounts no API routes (it serves `/health` on `WORKER_PORT`). `pnpm worker` runs the built `dist/worker.js`.
- Graceful shutdown: on SIGTERM, QueueAdapter closes its workers and BullMQ's `worker.close()` waits for the jobs they are running (bounded by `SHUTDOWN_TIMEOUT_MS`) before the queues close.

Packages: `@forinda/kickjs`, `@forinda/kickjs-queue`, `@forinda/kickjs-schema`, `bullmq`, `ioredis`, `zod`.
Guides: [Background Jobs](https://kickjs.app/guide/jobs) · [Queue API](https://kickjs.app/api/queue) · [Observability](https://kickjs.app/guide/observability)

## Env

| Variable | Default | |
|---|---|---|
| `REDIS_HOST` / `REDIS_PORT` | `127.0.0.1` / `6379` | |
| `REDIS_PASSWORD` | — | required unless `NODE_ENV` is `development` or `test` |
| `APP_ROLE` | `all` | `all` (API + workers), `api` (dispatch only), `worker` (jobs only) |
| `WORKER_PORT` | `3001` | health port of the worker process |
| `QUEUE_CONCURRENCY` | `2` | jobs each worker runs at once |
| `SHUTDOWN_TIMEOUT_MS` | `30000` | how long shutdown waits for active jobs |

## Run

```bash
docker run -d --name kick-redis -p 6379:6379 redis:7-alpine
pnpm install          # or: npm install
cp .env.example .env
pnpm dev              # or: npm run dev — API + workers in one process
```

```bash
curl -X POST localhost:3000/api/v1/jobs/emails -H 'content-type: application/json' \
  -d '{"to":"a@example.test","subject":"Hi","failTimes":2}'          # 202 {"jobId":"1"}; retried twice
curl localhost:3000/api/v1/jobs/email/1                               # state, attemptsMade, result
curl -X POST localhost:3000/api/v1/jobs/emails/bulk -H 'content-type: application/json' \
  -d '{"subject":"News","recipients":["a@example.test","b@example.test"]}'
curl -X POST localhost:3000/api/v1/jobs/reminders -H 'content-type: application/json' \
  -d '{"to":"a@example.test","subject":"Later","delayMs":5000}'
curl -X POST localhost:3000/api/v1/jobs/reports -H 'content-type: application/json' -d '{"rows":5000}'
curl localhost:3000/api/v1/jobs/reports/1                             # progress 0 → 100
curl -X PUT localhost:3000/api/v1/jobs/schedules/digest -H 'content-type: application/json' -d '{"everyMs":10000}'
curl -X DELETE localhost:3000/api/v1/jobs/schedules/digest
curl localhost:3000/health/ready
```

Separate worker process (same build):

```bash
pnpm build            # or: npm run build
APP_ROLE=api pnpm start   # API only, on PORT
pnpm worker               # or: npm run worker — jobs only, /health on WORKER_PORT
```

Send `SIGTERM` to the worker while `POST /jobs/reports` is running: it logs `Report … built` before `Closed 2 worker(s)`, and the job ends `completed`.

## Test

```bash
pnpm test             # or: npm test — no Redis needed
pnpm typecheck && pnpm lint
```

The suite runs QueueAdapter with an in-memory `QueueProvider` (in `job.test.ts`) and checks dispatch, retries and their error reports, final failure, bulk, delay, progress, the repeatable scheduler, and 404s.
