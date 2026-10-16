# cron-jobs-api

Scheduled jobs with **`@Cron` + `KickCronAdapter`** from `@forinda/kickjs` (croner underneath), and the same jobs on a serverless platform through the built-in trigger route.

- `src/modules/crons/cron.jobs.ts` — four `@Cron` jobs:
  - `purge-sessions` every 5 minutes;
  - `nightly-report` at 02:00 **Africa/Nairobi** (`timezone`), i.e. 23:00 UTC wherever the server runs;
  - `warm-cache` hourly and once at boot (`runOnInit`, trigger `init`);
  - `sync-inventory` every 2 minutes with `overlap: false` (the default): a tick that arrives while the previous run is still going is skipped and logged (`… is still running — skipped this tick`). Per process.
  - Each job has `enabled: () => …` checked on every tick: list a job in `CRON_DISABLED_JOBS` to switch it off; `CRON_ENABLED=false` turns the whole scheduler off (`KickCronAdapter({ enabled })`, e.g. on all replicas but one).
- `src/modules/crons/cron.service.ts` — records each job's last run (trigger, status, duration, error) and lists jobs with their next run, computed with croner in the job's timezone (`nextRunOf`). In memory, per process.
- `src/modules/crons/cron.controller.ts` — `GET /api/v1/cron/jobs` (schedule, enabled, last/next run) and `POST /api/v1/cron/jobs/:name/run` (`runCronJobs(…, 'manual')`, respects `enabled` and `overlap`), the latter behind `src/guards/cron-secret.guard.ts` (`Authorization: Bearer $CRON_SECRET`).
- `src/adapters/cron-errors.adapter.ts` — an `onError` observer: a failing job is reported with `source: 'cron'` and `context: { job, expression, trigger }`. Swap the log line for Sentry/Datadog.
- `src/serverless.ts` + `vercel.json` — `createHandler()` serves the same app as a function. With `CRON_SECRET` set it mounts `GET /_kick/cron/:scheduleId` (bearer-guarded), and `pnpm build:vercel` writes one Vercel cron per schedule into `.vercel/output/config.json`. Vercel crons run in UTC, so `nightly-report` fires at 02:00 UTC there (the build warns). The route isn't mounted on the Node server, which schedules the jobs itself.

Packages: `@forinda/kickjs`, `@forinda/kickjs-schema`, `croner`, `zod`.
Guides: [Scheduled Tasks](https://kickjs.app/guide/cron) · [Serverless](https://kickjs.app/guide/serverless) · [Observability](https://kickjs.app/guide/observability)

## Env

| Variable | Default | |
|---|---|---|
| `CRON_ENABLED` | `true` | `false` = this process schedules nothing |
| `CRON_DISABLED_JOBS` | — | comma-separated job names to skip |
| `CRON_SECRET` | — | bearer for the trigger routes; required unless `NODE_ENV` is `development` or `test` |
| `INVENTORY_SYNC_MS` | `3000` | how long `sync-inventory`'s simulated supplier call takes |

## Run

```bash
pnpm install          # or: npm install
cp .env.example .env  # set CRON_SECRET to try the manual run endpoint
pnpm dev              # or: npm run dev — logs "Cache warmed (init)" on boot
```

```bash
curl localhost:3000/api/v1/cron/jobs                       # schedules, enabled, lastRun, nextRun
curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/v1/cron/jobs/warm-cache/run
# Twice at once: the second answers {"ran":0,"failed":0} — the first is still running
curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/v1/cron/jobs/sync-inventory/run &
curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/v1/cron/jobs/sync-inventory/run
```

Serverless: `pnpm build:vercel` (or `npm run build:vercel`), deploy, and set `CRON_SECRET` in the Vercel project.

## Test

```bash
pnpm test             # or: npm test
pnpm typecheck && pnpm lint
```

The suite checks next-run times (incl. 02:00 Nairobi = 23:00 UTC), runs jobs directly with `runCronJobs`, a disabled job, overlap protection, a failure reaching the error observer and the last-run record, the guarded manual endpoint, and the serverless trigger through `createHandler().fetch()` with and without the bearer.

## Deploy

**Required env:** `CRON_SECRET` (16+ chars; fail closed — with `NODE_ENV=production`, the image's, or unset, the app refuses to boot without it).

**Docker** — the long-running server schedules the jobs itself:

```bash
docker build -t cron-jobs-api .
docker run -p 3000:3000 -e CRON_SECRET=$(openssl rand -hex 32) cron-jobs-api
```

Several replicas each run every job: set `CRON_ENABLED=false` on all but one.

**Vercel** — `vercel.json` runs `pnpm build:vercel`, which writes one Vercel cron per schedule calling `GET /_kick/cron/:scheduleId`; set `CRON_SECRET` in the project (Vercel sends it as the bearer). Vercel crons are UTC and take five-field expressions only. **Not Netlify:** Netlify functions don't run `@Cron` jobs, so the schedules would never fire.

```bash
pnpm build:vercel   # → .vercel/output (config.json lists the crons)
```

State: last-run records are in memory, per process (lost on restart).

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
