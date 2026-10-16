export {}
// `pnpm worker`: the same app as a jobs-only process (no API routes; /health on WORKER_PORT).
process.env.APP_ROLE = 'worker'
await import('./index')
