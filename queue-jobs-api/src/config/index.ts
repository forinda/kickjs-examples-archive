import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { isDevOrTest } from './dev-default'

const redisPassword = z.string().min(1)

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().default(6379),
    // Optional only under development/test (a local Redis without AUTH); required in
    // production and with NODE_ENV unset (src/config/dev-default.ts).
    REDIS_PASSWORD: isDevOrTest() ? redisPassword.optional() : redisPassword,
    // 'all' = API + workers in one process, 'api' = dispatch only, 'worker' = jobs only.
    APP_ROLE: z.enum(['all', 'api', 'worker']).default('all'),
    // The worker process serves /health on its own port, so it can run beside the API.
    WORKER_PORT: z.coerce.number().default(3001),
    // Set it to move /health, /metrics and /queues off the public port onto this one —
    // reachable by the orchestrator and Prometheus, not the ingress. Unset: health stays
    // on PORT and there is no /metrics or /queues. Each process needs its own.
    MANAGEMENT_PORT: z.coerce.number().optional(),
    QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
    // How long shutdown waits for active jobs before giving up on them.
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
