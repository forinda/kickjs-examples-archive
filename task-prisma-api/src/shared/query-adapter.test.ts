import { describe, it, expect } from 'vitest'
import { parseQuery } from '@forinda/kickjs'
import { USER_QUERY_CONFIG } from '@/modules/users/user.constants'
import { createUserRepository } from '@/modules/users/user.repository'
import { queryAdapter } from './query-adapter'

// The lenient parse passes every field through, so the adapter's own check is what's tested.
const build = (query: Record<string, string>) =>
  queryAdapter.build(parseQuery(query), USER_QUERY_CONFIG)

describe('queryAdapter.build', () => {
  it.each(['passwordHash:starts:$2', '$where:eq:1', 'isActive:eq:true', 'a.b:eq:x'])(
    'rejects filter=%s with 400',
    (filter) => {
      expect(() => build({ filter })).toThrow(expect.objectContaining({ status: 400 }))
    },
  )

  it('rejects a sort outside the allowlist', () => {
    expect(() => build({ sort: 'passwordHash:asc' })).toThrow(
      expect.objectContaining({ status: 400 }),
    )
  })

  it('ANDs an id filter with the visibility scope and selects public fields only', async () => {
    const calls: any[] = []
    const prisma = {
      user: {
        findMany: async (args: unknown) => (calls.push(args), []),
        count: async () => 0,
      },
    }
    await createUserRepository(prisma as never).findPaginated(
      parseQuery({ filter: 'id:eq:u9' }),
      'viewer',
    )
    const [{ where, select }] = calls
    expect(where.AND).toHaveLength(2)
    expect(where.AND[0]).toEqual({ id: { equals: 'u9' } })
    expect(where.AND[1].OR[0]).toEqual({ id: 'viewer' })
    expect(Object.keys(select).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'email',
      'firstName',
      'globalRole',
      'id',
      'lastLoginAt',
      'lastName',
    ])
  })
})
