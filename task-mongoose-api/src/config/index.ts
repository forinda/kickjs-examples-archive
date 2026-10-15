import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

/** Dev-only fallbacks. Rejected when NODE_ENV=production — a public default would let anyone forge tokens. */
const DEV_JWT_SECRET = 'dev-access-secret-change-me-0000000000'
const DEV_JWT_REFRESH_SECRET = 'dev-refresh-secret-change-me-000000000'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      MONGODB_URI: z.url(),
      REDIS_URL: z.url(),
      JWT_SECRET: z.string().min(32).default(DEV_JWT_SECRET),
      JWT_REFRESH_SECRET: z.string().min(32).default(DEV_JWT_REFRESH_SECRET),
      JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
      JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
      // Only needed in production, where mail goes through Resend; dev logs mail to the console.
      RESEND_API_KEY: z.string().optional(),
      MAIL_FROM_NAME: z.string().default('Vibed'),
      MAIL_FROM_EMAIL: z.email().default('noreply@vibed.app'),
      APP_URL: z.url().default('http://localhost:3000'),
      APP_NAME: z.string().default('Vibed'),
    })
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return
      for (const [key, devValue] of [
        ['JWT_SECRET', DEV_JWT_SECRET],
        ['JWT_REFRESH_SECRET', DEV_JWT_REFRESH_SECRET],
      ] as const) {
        if (env[key] === devValue) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} must be set in production` })
        }
      }
      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY is required in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)
export type Env = typeof env

export default envSchema
