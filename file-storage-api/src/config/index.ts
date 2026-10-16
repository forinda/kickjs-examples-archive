import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

/** Dev-only fallbacks. Rejected when NODE_ENV=production. */
const DEV_API_KEY = 'dev-api-key'
const DEV_SIGNING_SECRET = 'dev-signing-secret-change-me'

const envSchema = fromZod(
  z
    .object({
      PORT: z.coerce.number().default(3000),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
      LOG_LEVEL: z.string().default('info'),
      // `disk` keeps files under UPLOAD_DIR; `s3` uses the bucket from the S3_* variables
      // (validated at startup by the storage package's S3 settings section).
      // Unset: `s3` in production, `disk` otherwise.
      STORAGE_DRIVER: z.enum(['disk', 's3']).optional(),
      UPLOAD_DIR: z.string().default('uploads'),
      MAX_UPLOAD_BYTES: z.coerce
        .number()
        .int()
        .positive()
        .default(5 * 1024 * 1024),
      // Bearer key for the /files API. Signed URLs work without it.
      API_KEY: z.string().min(8).default(DEV_API_KEY),
      // Signs download URLs for the disk driver (a bucket presigns its own).
      SIGNING_SECRET: z.string().min(16).default(DEV_SIGNING_SECRET),
      // Base for signed download URLs, e.g. https://files.example.com. Default: the request's Host.
      PUBLIC_URL: z.url().optional(),
    })
    // Required in production — the public dev defaults would open the API and let anyone sign URLs.
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return
      if (env.API_KEY === DEV_API_KEY || env.API_KEY.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['API_KEY'],
          message: 'API_KEY must be set to a 32+ character secret in production',
        })
      }
      if (env.SIGNING_SECRET === DEV_SIGNING_SECRET || env.SIGNING_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['SIGNING_SECRET'],
          message: 'SIGNING_SECRET must be set to a 32+ character secret in production',
        })
      }
    }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

/** The driver this process uses. */
export const storageDriver = env.STORAGE_DRIVER ?? (env.NODE_ENV === 'production' ? 's3' : 'disk')

export default envSchema
