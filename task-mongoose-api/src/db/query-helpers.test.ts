import { describe, it, expect } from 'vitest'
import { buildMongoQuery } from './query-helpers'
import { USER_QUERY_CONFIG } from '@/shared/query-configs'

const scope = { _id: { $in: ['u1', 'u2'] } }
const eq = (field: string, value = 'x') => ({ field, operator: 'eq', value })

describe('buildMongoQuery', () => {
  it('ANDs an _id filter with the scope instead of replacing it', () => {
    const { filter } = buildMongoQuery({ filters: [eq('_id', 'u9')] }, USER_QUERY_CONFIG, scope)
    expect(filter).toEqual({ $and: [scope, { _id: 'u9' }] })
  })

  it.each(['passwordHash', '$where', 'isActive', 'user.passwordHash'])(
    'rejects a filter on %s with 400',
    (field) => {
      expect(() => buildMongoQuery({ filters: [eq(field)] }, USER_QUERY_CONFIG, scope)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    },
  )

  it('rejects $ and dotted fields even when a config lists them', () => {
    const config = { filterable: ['$where', 'a.b'], sortable: ['$natural'] }
    for (const parsed of [
      { filters: [eq('$where')] },
      { filters: [eq('a.b')] },
      { sort: [{ field: '$natural', direction: 'asc' as const }] },
    ]) {
      expect(() => buildMongoQuery(parsed, config)).toThrow(
        expect.objectContaining({ status: 400 }),
      )
    }
  })

  it('rejects a sort on a field outside the allowlist', () => {
    expect(() =>
      buildMongoQuery({ sort: [{ field: 'passwordHash', direction: 'asc' }] }, USER_QUERY_CONFIG),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('matches filter values literally, not as a regex', () => {
    const { filter } = buildMongoQuery(
      { filters: [{ field: 'email', operator: 'starts', value: '.*' }] },
      USER_QUERY_CONFIG,
    )
    expect(filter.$and[1]).toEqual({ email: { $regex: '^\\.\\*', $options: 'i' } })
  })
})
