import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { devDefault, isDevOrTest } from './dev-default'

const original = process.env.NODE_ENV
afterEach(() => {
  process.env.NODE_ENV = original
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

  it('fails closed when NODE_ENV is unset: no dev default, so the secret is required', () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV')
    expect(isDevOrTest()).toBe(false)
    expect(devDefault(z.string(), 'x').safeParse(undefined).success).toBe(false)
  })
})
