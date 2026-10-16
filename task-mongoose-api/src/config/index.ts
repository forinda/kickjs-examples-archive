import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault, isDevOrTest } from './dev-default'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    MONGODB_URI: z.url(),
    REDIS_URL: z.url(),
    // Dev defaults only under NODE_ENV=development|test — a public default would let anyone forge tokens.
    JWT_SECRET: devDefault(z.string().min(32), 'dev-access-secret-change-me-0000000000'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    // development/test log mail to the console; anything else sends through Resend and needs the key.
    RESEND_API_KEY: isDevOrTest() ? z.string().optional() : z.string().min(1),
    MAIL_FROM_NAME: z.string().default('Vibed'),
    MAIL_FROM_EMAIL: z.email().default('noreply@vibed.app'),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `getEnv` / `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
