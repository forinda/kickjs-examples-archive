import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { and, eq, getTableColumns, inArray, or, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { users, workspaceMembers } from '@/db/schema'
import { USER_QUERY_CONFIG } from './user.constants'
import { queryAdapter } from '@/shared/query-adapter'
import { acceptedMembership } from '@/modules/workspaces/workspace-member.repository'

/** A user as the API exposes it — never carries the password hash. */
export type User = Omit<typeof users.$inferSelect, 'passwordHash'>
/** Full row including the hash — only for credential checks. */
export type UserWithCredentials = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Every read/write except findByEmail (the credential lookup) omits the hash.
const { passwordHash: _passwordHash, ...publicColumns } = getTableColumns(users)

/** What another user may see of a profile — an explicit list, so a new column never leaks by default. */
const profileColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  avatarUrl: users.avatarUrl,
  globalRole: users.globalRole,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
}
export type UserProfile = { [K in keyof typeof profileColumns]: User[K] }

export function createUserRepository(db: AppDatabase) {
  /** The viewer plus everyone who shares an accepted membership with them (pending invites don't count). */
  const visibleTo = (viewerId: string) =>
    or(
      eq(users.id, viewerId),
      inArray(
        users.id,
        db
          .select({ id: workspaceMembers.userId })
          .from(workspaceMembers)
          .where(
            and(
              acceptedMembership,
              inArray(
                workspaceMembers.workspaceId,
                db
                  .select({ id: workspaceMembers.workspaceId })
                  .from(workspaceMembers)
                  .where(and(eq(workspaceMembers.userId, viewerId), acceptedMembership)),
              ),
            ),
          ),
      ),
    )

  return {
    /** Unscoped — for the caller's own record and internal lookups (invites), never for reading others. */
    async findById(id: string): Promise<User | null> {
      const [user] = await db.select(publicColumns).from(users).where(eq(users.id, id))
      return user ?? null
    },

    /** `id` if the viewer may see it (themselves or a workspace teammate), else null. */
    async findVisibleById(id: string, viewerId: string): Promise<UserProfile | null> {
      const [user] = await db
        .select(profileColumns)
        .from(users)
        .where(and(eq(users.id, id), visibleTo(viewerId)))
      return user ?? null
    },

    async findByEmail(email: string): Promise<UserWithCredentials | null> {
      const [user] = await db.select().from(users).where(eq(users.email, email))
      return user ?? null
    },

    async findAll(): Promise<User[]> {
      return db.select(publicColumns).from(users)
    },

    /** Users visible to `viewerId`; the scope is AND-ed with the filters in SQL, so pages and the total agree. */
    async findPaginated(
      parsed: ParsedQuery,
      viewerId: string,
    ): Promise<{ data: UserProfile[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, USER_QUERY_CONFIG)
      const where = and(query.where, visibleTo(viewerId))

      const [data, countResult] = await Promise.all([
        db
          .select(profileColumns)
          .from(users)
          .where(where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(users)
          .where(where),
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
