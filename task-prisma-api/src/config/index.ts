import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault } from './dev-default'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    DATABASE_URL: z.string().min(1),
    // No defaults: a public fallback secret would let anyone forge tokens.
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    // Public URLs: dev defaults only under NODE_ENV=development|test (fail closed).
    APP_URL: devDefault(z.string(), 'http://localhost:3000'),
    APP_NAME: z.string().default('Vibed'),
    REDIS_URL: devDefault(z.string(), 'redis://localhost:6379'),
    /** SMTP transport URL. Empty logs mail (reset links included) to the console — dev default only. */
    SMTP_URL: devDefault(z.string(), ''),
    MAIL_FROM_NAME: z.string().default('Vibed'),
    MAIL_FROM_EMAIL: z.string().default('noreply@vibed.dev'),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `getEnv` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)
export type Env = typeof env

export default envSchema
