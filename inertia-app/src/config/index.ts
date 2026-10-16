import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault } from './dev-default'

/** Used only when NODE_ENV is development or test (see dev-default.ts). */
const DEV_SESSION_SECRET = 'dev-only-session-secret-change-me-0123456789'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    // Signs the session cookie that carries flash messages and validation errors.
    // Required (32+ chars) unless NODE_ENV is development or test — with a public
    // default anyone could forge a session.
    SESSION_SECRET: devDefault(z.string().min(32), DEV_SESSION_SECRET),
    // SQLite file; ':memory:' for a throwaway database (tests).
    DB_FILE: z.string().default('data/app.db'),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
