import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

/** Dev-only fallback. Rejected when NODE_ENV=production. */
const DEV_CHAT_SECRET = 'dev-chat-secret-change-me'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      // Signs the chat tokens sockets present on connect.
      CHAT_SECRET: z.string().min(16).default(DEV_CHAT_SECRET),
      // Set it to share rooms and presence between instances; unset = one process.
      REDIS_URL: z.url().optional(),
      // Ping interval; a socket that misses one pong is dropped. 0 disables.
      WS_HEARTBEAT_MS: z.coerce.number().int().min(0).default(30_000),
    })
    // Required in production — the public dev default would let anyone forge tokens.
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return
      if (env.CHAT_SECRET === DEV_CHAT_SECRET || env.CHAT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['CHAT_SECRET'],
          message: 'CHAT_SECRET must be set to a 32+ character secret in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
