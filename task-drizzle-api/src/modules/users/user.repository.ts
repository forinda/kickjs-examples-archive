import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { eq, getTableColumns, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { users } from '@/db/schema'
import { USER_QUERY_CONFIG } from './user.constants'
import { queryAdapter } from '@/shared/query-adapter'

/** A user as the API exposes it — never carries the password hash. */
export type User = Omit<typeof users.$inferSelect, 'passwordHash'>
/** Full row including the hash — only for credential checks. */
export type UserWithCredentials = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Every read/write except findByEmail (the credential lookup) omits the hash.
const { passwordHash: _passwordHash, ...publicColumns } = getTableColumns(users)

export function createUserRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<User | null> {
      const [user] = await db.select(publicColumns).from(users).where(eq(users.id, id))
      return user ?? null
    },

    async findByEmail(email: string): Promise<UserWithCredentials | null> {
      const [user] = await db.select().from(users).where(eq(users.email, email))
      return user ?? null
    },

    async findAll(): Promise<User[]> {
      return db.select(publicColumns).from(users)
    },

    async findPaginated(parsed: ParsedQuery): Promise<{ data: User[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, USER_QUERY_CONFIG)

      const [data, countResult] = await Promise.all([
        db
          .select(publicColumns)
          .from(users)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(dto: NewUser): Promise<User> {
      const [user] = await db.insert(users).values(dto).returning(publicColumns)
      return user
    },

    async update(id: string, dto: Partial<NewUser>): Promise<User> {
      const [user] = await db
        .update(users)
        .set(dto)
        .where(eq(users.id, id))
        .returning(publicColumns)
      if (!user) throw HttpException.notFound('User not found')
      return user
    },

    async delete(id: string): Promise<void> {
      await db.delete(users).where(eq(users.id, id))
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>

export const USER_REPOSITORY = createToken<UserRepository>('app/User/repository')
