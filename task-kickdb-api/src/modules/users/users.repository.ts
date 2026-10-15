import { createToken } from '@forinda/kickjs'
import type { KickDbClient } from '@forinda/kickjs-db'

export interface NewUser {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

/** Strips the password hash so it never reaches a response. */
function toPublic<T extends { passwordHash: unknown }>(row: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = row
  return rest
}

/** Repository over the kick/db client; deps come in as parameters. */
export function createUsersRepository(db: KickDbClient) {
  return {
    list() {
      return db
        .selectFrom('users')
        .selectAll()
        .orderBy('createdAt', 'asc')
        .execute()
        .then((rows) => rows.map(toPublic))
    },

    async findById(id: string) {
      const row = await db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst()
      return row && toPublic(row)
    },

    /** Includes the hash — for credential checks only, never for a response. */

    findByEmail(email: string) {
      return db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst()
    },

    create(input: NewUser) {
      return db
        .insertInto('users')
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          avatarUrl: input.avatarUrl ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
        .then(toPublic)
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type UsersRepository = ReturnType<typeof createUsersRepository>
export const USERS_REPOSITORY = createToken<UsersRepository>('app/Users/repository')
