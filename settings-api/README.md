# settings-api

Configuration with **settings sections** (`defineSettings`): each concern gets its own prefix and schema, is validated at startup only when the code that declares it is mounted, and is injected only where it's needed. Scaffolded with `kick new settings-api --template rest`, DevTools added with `kick add devtools`.

| Section                                   | Variables                           | Declared by                                      |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `AppSettings` (`src/config/app.settings.ts`) | `APP_NAME`, `APP_PUBLIC_URL`      | the app — `bootstrap({ settings })`              |
| `MailSettings.scoped('TRANSACTIONAL')`    | `TRANSACTIONAL_MAIL_*`              | adapter `MailAdapter:transactional`              |
| `MailSettings.scoped('MARKETING')`        | `MARKETING_MAIL_*`                  | adapter `MailAdapter:marketing`                  |
| `FeatureSettings` (`src/modules/features/`) | `FEATURES_*` (incl. a list)       | module `FeaturesModule` — `settings: () => [...]` |

- **One adapter, two instances** — `src/adapters/mail.adapter.ts`: `MailAdapter.scoped('transactional', { settings: TransactionalMail })` and `.scoped('marketing', …)`. Each instance declares its own scoped section and answers `/health/ready` with a TCP check of its SMTP server.
- **A service injecting a section** — `FeaturesService` takes `@Inject(FeatureSettings) features: SettingsOf<typeof FeatureSettings>` (and `AppSettings`); `GET /api/v1/features` returns the public flags. The beta-tester list stays server-side (`isBetaTester(email)` for code that already knows the user): answering it for any email a caller sends would reveal who is on the list.
- **Secrets fail closed** — `src/config/dev-default.ts`: the SMTP passwords, senders and `APP_PUBLIC_URL` have a default only when `NODE_ENV` is `development` or `test`. In production, or with `NODE_ENV` unset, boot stops with every missing variable named:
  ```
  Settings 'TRANSACTIONAL_MAIL' are invalid:
    TRANSACTIONAL_MAIL_PASSWORD: Invalid input: expected string, received undefined
  ```
- **`<KEY>_FILE` secrets** — `TRANSACTIONAL_MAIL_PASSWORD_FILE=/run/secrets/smtp` reads the value from the file (trailing newline dropped, never copied into `process.env`); its origin is reported as `file`.
- **`.env.example` is generated**: `pnpm env:example` runs `kick env example` with `NODE_ENV=production`, so required variables are written bare and dev defaults never leak into it. `pnpm env:check` (`--check`) fails when it's stale — put it in CI.
- **Where values came from** — `GET /api/v1/config` (mounted outside production only) merges `app.describeConfig()` and `app.configOrigins()`: every variable, who declared it, required or not, its default (masked for passwords/secrets/tokens/keys) and its origin (`env`, `file`, `default`, `provided`, `unset`). No values. The app reaches the controller through an `APPLICATION` token bound in `src/index.ts`.
- **DevTools** — `/_debug` (development only; the access token is logged at boot). The **Config** tab shows each section with its origins; `exposeConfig` lists `APP_` / `FEATURES_` variables and redacts the rest.

Packages: `@forinda/kickjs`, `@forinda/kickjs-schema`, `@forinda/kickjs-devtools`; `zod`.

## Run

```bash
pnpm install          # or: npm install
pnpm dev              # or: npm run dev — http://localhost:3000, dev defaults for everything
```

```bash
curl localhost:3000/api/v1/features
curl localhost:3000/api/v1/config     # origins + described variables, secrets masked
curl localhost:3000/health/ready      # one check per MailAdapter instance (down without an SMTP server)
```

`/health/ready` reports each SMTP server; for local mail run [Mailpit](https://mailpit.axllent.org/) (`docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`) — both accounts default to `localhost:1025`.

```bash
pnpm test             # or: npm test
pnpm typecheck && pnpm lint
pnpm env:check        # .env.example matches the declared sections
pnpm build
cp .env.example .env  # fill in the required values, or use *_FILE for secrets
NODE_ENV=production pnpm start
```

Tests: `src/adapters/mail.settings.test.ts` (production and unset `NODE_ENV` refuse to boot without the password; a `_FILE` secret boots and reports origin `file`; dev defaults under `test`), `src/modules/features/feature.test.ts` (env parsing incl. booleans and a list, injection into the service, `.provide()` instead of env), `src/modules/config-reports/config-report.test.ts` (origins and masking).

The template's Netlify / Vercel / Docker files were removed; take them from a fresh `kick new` if you deploy there.

## Deploy

**Required env** (fail closed: with `NODE_ENV=production` — the image's — or unset, the app refuses to boot without them): `APP_PUBLIC_URL`, `TRANSACTIONAL_MAIL_PASSWORD`, `TRANSACTIONAL_MAIL_FROM`, `MARKETING_MAIL_PASSWORD`, `MARKETING_MAIL_FROM` — plus `*_MAIL_HOST` / `*_MAIL_PORT` for your SMTP servers. Any of them can come from a mounted file: `TRANSACTIONAL_MAIL_PASSWORD_FILE=/run/secrets/…`. `pnpm env:check` fails when `.env.example` is stale.

**Docker**

```bash
docker build -t settings-api .
docker run -p 3000:3000 -e APP_PUBLIC_URL=https://api.example.com \
  -e TRANSACTIONAL_MAIL_HOST=smtp.example.com -e TRANSACTIONAL_MAIL_PASSWORD=… -e TRANSACTIONAL_MAIL_FROM=noreply@example.com \
  -e MARKETING_MAIL_HOST=smtp.example.com -e MARKETING_MAIL_PASSWORD=… -e MARKETING_MAIL_FROM=news@example.com \
  settings-api
```

**Compose** — the app with Mailpit standing in for both SMTP servers (UI on :8025):

```bash
TRANSACTIONAL_MAIL_PASSWORD=change-me MARKETING_MAIL_PASSWORD=change-me docker compose up --build
curl localhost:3000/health/ready   # both MailAdapter checks "up"
```

**Netlify / Vercel** — stateless, so it also runs as a function (`src/serverless.ts`, `netlify.toml`, `vercel.json`); set the same env in the platform:

```bash
pnpm build:netlify   # → .netlify/v1/functions/api.mjs
pnpm build:vercel    # → .vercel/output
```

No state. `/api/v1/config` is mounted only under development/test.

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
