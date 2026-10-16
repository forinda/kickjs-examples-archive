import { loadEnvFromSchema } from '@forinda/kickjs/config'
import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'
import { devDefault, isDevOrTest } from './dev-default'

const envSchema = fromZod(
  z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.string().default('info'),
    // `disk` keeps files under UPLOAD_DIR; `s3` uses the bucket from the S3_* variables
    // (validated at startup by the storage package's S3 settings section).
    // Unset: `disk` in development and tests, `s3` otherwise (production, or NODE_ENV unset).
    STORAGE_DRIVER: z.enum(['disk', 's3']).default(isDevOrTest() ? 'disk' : 's3'),
    UPLOAD_DIR: z.string().default('uploads'),
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 1024 * 1024),
    // API_KEY / SIGNING_SECRET: dev defaults only when NODE_ENV is development or test
    // (src/config/dev-default.ts); required, 32+ chars, in production or with NODE_ENV unset.
    // Bearer key for the /files API. Signed URLs work without it.
    API_KEY: devDefault(z.string().min(32), 'dev-api-key-0123456789abcdef0123'),
    // Signs download URLs for the disk driver (a bucket presigns its own).
    SIGNING_SECRET: devDefault(z.string().min(32), 'dev-signing-secret-change-me-0123456789'),
    // Base for signed download URLs, e.g. https://files.example.com. Default: the request's Host.
    PUBLIC_URL: z.url().optional(),
  }),
)

/** Side effect: registers the schema before bootstrap(), so `ConfigService` / `@Value()` see it. */
export const env = loadEnvFromSchema(envSchema)

export default envSchema
