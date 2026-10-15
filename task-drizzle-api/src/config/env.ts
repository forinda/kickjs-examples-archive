import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    DATABASE_URL: z.url(),
    // No defaults: a public fallback secret would let anyone forge tokens.
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    APP_URL: z.string().default('http://localhost:3000'),
    APP_NAME: z.string().default('Vibed'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    /** SMTP transport URL; empty → mail is logged to the console. */
    SMTP_URL: z.string().default(''),
    MAIL_FROM_NAME: z.string().default('Vibed'),
    MAIL_FROM_EMAIL: z.string().default('noreply@vibed.dev'),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)
export type Env = typeof env

export default envSchema
