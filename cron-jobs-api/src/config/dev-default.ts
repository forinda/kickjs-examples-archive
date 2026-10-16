import type { z } from 'zod'

/** True only for `kick dev` (development) and Vitest (test). Unset NODE_ENV is NOT development. */
export function isDevOrTest(): boolean {
  const env = process.env.NODE_ENV
  return env === 'development' || env === 'test'
}

/**
 * A default for development and tests only. Fails closed: in production, or
 * with NODE_ENV unset, the variable is required, so a secret or a public URL
 * never falls back to a value committed to the repo. Read when the schema is
 * defined (at import), after `@forinda/kickjs` has loaded `.env`.
 */
export function devDefault<T extends z.ZodType>(schema: T, value: z.input<T>) {
  return isDevOrTest() ? schema.default(value as never) : schema
}
