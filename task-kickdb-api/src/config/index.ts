import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    // Apply pending migrations at startup outside development/test too — for a
    // single-instance deploy (the Docker image sets it). Several instances: leave it
    // off and run `kick db migrate latest` once per release instead.
    MIGRATE_ON_BOOT: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    // Optional so `kick build` / typegen / unit tests run without a database;
    // the pool fails on first query when it is missing.
    DATABASE_URL: z.url().optional(),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
