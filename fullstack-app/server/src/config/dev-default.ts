/** True only for `kick dev` (development) and Vitest (test). Unset NODE_ENV is NOT development. */
export function isDevOrTest(): boolean {
  const env = process.env.NODE_ENV
  return env === 'development' || env === 'test'
}
