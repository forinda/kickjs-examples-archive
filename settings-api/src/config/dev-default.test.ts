import { afterEach, describe, expect, it } from 'vitest'
import { isDevOrTest } from './dev-default'

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

  it('fails closed when NODE_ENV is unset, so /api/v1/config and /_debug stay off', () => {
    delete process.env.NODE_ENV
    expect(isDevOrTest()).toBe(false)
  })
})
