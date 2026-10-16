# minimal-api

The smallest KickJS app: one module (`src/modules/hello`), one controller that returns values, and a `createTestApp` test. Scaffolded with `kick new minimal-api --template minimal`.

Packages: `@forinda/kickjs`, `@forinda/kickjs-schema`; `zod`.

## Run

```bash
pnpm install          # or: npm install
pnpm dev              # or: npm run dev
curl localhost:3000/api/v1/hello
pnpm test             # or: npm test
```

## Deploy

No required env (`PORT` defaults to 3000) and no state, so it runs anywhere.

**Docker**

```bash
docker build -t minimal-api .
docker run -p 3000:3000 minimal-api
curl localhost:3000/api/v1/hello
```

**Netlify / Vercel** — `src/serverless.ts` serves the same app as a function; `netlify.toml` and `vercel.json` run the build:

```bash
pnpm build:netlify   # → .netlify/v1/functions/api.mjs
pnpm build:vercel    # → .vercel/output
```

- **Health:** `GET /health/ready` runs every adapter's health check — the image's `HEALTHCHECK` and a load balancer's readiness probe use it; `GET /health/live` for liveness.
- **DevTools** is dev-only and not in the production build: `/_debug` answers 404 in the image.
- The image installs from the committed `pnpm-lock.yaml` (frozen) and runs `node dist/index.js` as the unprivileged `node` user with `NODE_ENV=production`; `.env` files are never copied in — pass env with `-e`, `--env-file` or the platform.
