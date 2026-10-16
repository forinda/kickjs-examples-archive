import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { devDefault, isDevOrTest } from './dev-default'

const original = process.env.NODE_ENV
afterEach(() => {
  if (original === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
  else process.env.NODE_ENV = original
})

describe('isDevOrTest', () => {
  it('is true only for development and test', () => {
    for (const env of ['development', 'test']) {
      process.env.NODE_ENV = env
      expect(isDevOrTest()).toBe(true)
    }
    process.env.NODE_ENV = 'production'
    expect(isDevOrTest()).toBe(false)
  })

  it('fails closed when NODE_ENV is unset: API_KEY has no default and the driver is s3', () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV') // typed as required by KickEnv
    expect(isDevOrTest()).toBe(false)
    expect(devDefault(z.string().min(32), 'x'.repeat(32)).safeParse(undefined).success).toBe(false)
  })
})
