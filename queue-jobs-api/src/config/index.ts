import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      REDIS_HOST: z.string().default('127.0.0.1'),
      REDIS_PORT: z.coerce.number().default(6379),
      // Required in production; optional for a local Redis without AUTH.
      REDIS_PASSWORD: z.string().min(1).optional(),
      // 'all' = API + workers in one process, 'api' = dispatch only, 'worker' = jobs only.
      APP_ROLE: z.enum(['all', 'api', 'worker']).default('all'),
      // The worker process serves /health on its own port, so it can run beside the API.
      WORKER_PORT: z.coerce.number().default(3001),
      QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
      // How long shutdown waits for active jobs before giving up on them.
      SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    })
    .superRefine((env, ctx) => {
      if (env.NODE_ENV === 'production' && !env.REDIS_PASSWORD) {
        ctx.addIssue({
          code: 'custom',
          path: ['REDIS_PASSWORD'],
          message: 'REDIS_PASSWORD is required in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
