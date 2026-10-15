import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

/** Dev-only fallback. Rejected when NODE_ENV=production. */
const DEV_SESSION_SECRET = 'dev-session-secret-change-me'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      // Signs the session cookie that carries flash messages and validation errors.
      SESSION_SECRET: z.string().min(16).default(DEV_SESSION_SECRET),
      // SQLite file; ':memory:' for a throwaway database (tests).
      DB_FILE: z.string().default('data/app.db'),
    })
    // Required in production — with the public dev default anyone could forge a session.
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return
      if (env.SESSION_SECRET === DEV_SESSION_SECRET || env.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET must be set to a 32+ character secret in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
