import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      // Master switch for the in-process scheduler (turn it off on all replicas but one).
      CRON_ENABLED: z
        .enum(['true', 'false'])
        .default('true')
        .transform((v) => v === 'true'),
      // Jobs to skip, by name, comma-separated — checked on every tick.
      CRON_DISABLED_JOBS: z
        .string()
        .default('')
        .transform((v) =>
          v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      // Bearer secret for the serverless trigger (GET /_kick/cron/:scheduleId) and
      // POST /cron/jobs/:name/run. Required in production; unset in dev = no trigger.
      CRON_SECRET: z.string().min(16).optional(),
      // How long the simulated supplier call in sync-inventory takes.
      INVENTORY_SYNC_MS: z.coerce.number().int().min(0).default(3000),
    })
    .superRefine((env, ctx) => {
      if (env.NODE_ENV === 'production' && !env.CRON_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['CRON_SECRET'],
          message: 'CRON_SECRET (16+ chars) is required in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
