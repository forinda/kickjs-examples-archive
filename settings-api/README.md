# settings-api

Configuration with **settings sections** (`defineSettings`): each concern gets its own prefix and schema, is validated at startup only when the code that declares it is mounted, and is injected only where it's needed. Scaffolded with `kick new settings-api --template rest`, DevTools added with `kick add devtools`.

| Section                                   | Variables                           | Declared by                                      |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `AppSettings` (`src/config/app.settings.ts`) | `APP_NAME`, `APP_PUBLIC_URL`      | the app — `bootstrap({ settings })`              |
| `MailSettings.scoped('TRANSACTIONAL')`    | `TRANSACTIONAL_MAIL_*`              | adapter `MailAdapter:transactional`              |
| `MailSettings.scoped('MARKETING')`        | `MARKETING_MAIL_*`                  | adapter `MailAdapter:marketing`                  |
| `FeatureSettings` (`src/modules/features/`) | `FEATURES_*` (incl. a list)       | module `FeaturesModule` — `settings: () => [...]` |

- **One adapter, two instances** — `src/adapters/mail.adapter.ts`: `MailAdapter.scoped('transactional', { settings: TransactionalMail })` and `.scoped('marketing', …)`. Each instance declares its own scoped section and answers `/health/ready` with a TCP check of its SMTP server.
- **A service injecting a section** — `FeaturesService` takes `@Inject(FeatureSettings) features: SettingsOf<typeof FeatureSettings>` (and `AppSettings`); `GET /api/v1/features?email=` returns what a client should render.
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
curl 'localhost:3000/api/v1/features?email=ann@example.com'
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

Tests: `src/adapters/mail.settings.test.ts` (production and unset `NODE_ENV` refuse to boot without the password; a `_FILE` secret boots and reports origin `file`; dev defaults under `test`), `src/modules/features/features.test.ts` (env parsing incl. booleans and a list, injection into the service, `.provide()` instead of env), `src/modules/config-report/config-report.test.ts` (origins and masking).

The template's Netlify / Vercel / Docker files were removed; take them from a fresh `kick new` if you deploy there.
