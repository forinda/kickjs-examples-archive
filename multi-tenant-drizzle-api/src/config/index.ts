import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

/** Dev-only fallback. Rejected when NODE_ENV=production. */
const DEV_JWT_SECRET = 'dev-secret-change-me'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
    })
    // Required in production — the public dev default would let anyone forge tokens.
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return
      if (env.JWT_SECRET === DEV_JWT_SECRET || env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be set to a 32+ character secret in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
