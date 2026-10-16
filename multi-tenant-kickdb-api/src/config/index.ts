import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault } from './dev-default'

/** Used only when NODE_ENV is development or test (see dev-default.ts). */
const DEV_JWT_SECRET = 'dev-only-jwt-secret-change-me-0123456789'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    // Required (32+ chars) unless NODE_ENV is development or test.
    JWT_SECRET: devDefault(z.string().min(32), DEV_JWT_SECRET),
    // SQLite file; ':memory:' for a throwaway database (tests).
    DB_FILE: z.string().default('data/app.db'),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
