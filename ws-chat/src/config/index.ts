import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault } from './dev-default'

/** Development and tests only — production and an unset NODE_ENV require a real secret. */
const DEV_CHAT_SECRET = 'dev-only-chat-secret-change-me-in-production'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    // Signs the chat tokens sockets present on connect.
    CHAT_SECRET: devDefault(z.string().min(32), DEV_CHAT_SECRET),
    // Set it to share rooms and presence between instances; unset = one process.
    REDIS_URL: z.url().optional(),
    // Ping interval; a socket that misses one pong is dropped. 0 disables.
    WS_HEARTBEAT_MS: z.coerce.number().int().min(0).default(30_000),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
