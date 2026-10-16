import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { parseQuery } from '@forinda/kickjs'
import { users } from '@/db/schema'
import { USER_QUERY_CONFIG } from '@/modules/users/user.constants'
import { queryAdapter } from './query-adapter'

const dialect = new PgDialect()
const scope = eq(users.isActive, true)
const build = (query: Record<string, string>, config = USER_QUERY_CONFIG) =>
  // The lenient parse passes every field through, so the adapter's own check is what's tested.
  queryAdapter.buildFromColumns(parseQuery(query), { ...config, baseCondition: scope })

describe('queryAdapter.buildFromColumns', () => {
  it('ANDs an id filter with the scope instead of replacing it', () => {
    const { sql, params } = dialect.sqlToQuery(build({ filter: 'id:eq:u9' }).where!)
    expect(sql).toBe('("users"."is_active" = $1 and "users"."id" = $2)')
    expect(params).toEqual([true, 'u9'])
  })

  it.each([
    'passwordHash:starts:$2',
    '$where:eq:1',
    'isActive:eq:true',
    'a.b:eq:x',
    'constructor:eq:x',
  ])('rejects filter=%s with 400', (filter) => {
    expect(() => build({ filter })).toThrow(expect.objectContaining({ status: 400 }))
  })

  it('rejects a sort outside the allowlist', () => {
    expect(() => build({ sort: 'passwordHash:asc' })).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('matches LIKE wildcards in a value literally', () => {
    const { params } = dialect.sqlToQuery(build({ filter: 'email:starts:%_' }).where!)
    expect(params).toEqual([true, '\\%\\_%'])
  })
})
