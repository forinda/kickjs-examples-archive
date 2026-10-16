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

  it('fails closed when NODE_ENV is unset, so /_debug stays off and console mail is not used', () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV')
    expect(isDevOrTest()).toBe(false)
  })
})

describe('devDefault', () => {
  it('refuses the dev default for a missing secret when NODE_ENV is unset', () => {
    Reflect.deleteProperty(process.env, 'NODE_ENV')
    expect(devDefault(z.string(), 'dev-secret').safeParse(undefined).success).toBe(false)
  })

  it('applies the dev default under test', () => {
    process.env.NODE_ENV = 'test'
    expect(devDefault(z.string(), 'dev-secret').parse(undefined)).toBe('dev-secret')
  })
})
