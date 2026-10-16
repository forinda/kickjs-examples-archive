import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import type { UpdateUserDTO } from './user.dto'
import { queryAdapter } from '@/shared/query-adapter'
import { USER_QUERY_CONFIG } from './user.constants'
import type { User, Prisma } from '@/generated/prisma/client'

export type { User }
export type NewUser = Prisma.UserCreateInput

/** What another user may see of a profile — an explicit list, so a new column never leaks by default. */
const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  globalRole: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

/** The viewer plus everyone who shares an accepted membership with them (pending invites don't count). */
const visibleTo = (viewerId: string): Prisma.UserWhereInput => ({
  OR: [
    { id: viewerId },
    {
      workspaceMemberships: {
        some: {
          status: 'accepted',
          workspace: { members: { some: { userId: viewerId, status: 'accepted' } } },
        },
      },
    },
  ],
})

export function createUserRepository(prisma: PrismaClient) {
  return {
    /** Unscoped — for the caller's own record and internal lookups (invites), never for reading others. */
    async findById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    /** `id` if the viewer may see it (themselves or a workspace teammate), else null. */
    async findVisibleById(id: string, viewerId: string) {
      return prisma.user.findFirst({
        where: { AND: [{ id }, visibleTo(viewerId)] },
        select: profileSelect,
      })
    },

    async findByEmail(email: string) {
      // The client omits passwordHash globally; login needs it to verify credentials.
      return prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } })
    },

    async findAll() {
      return prisma.user.findMany()
    },

    /** Users visible to `viewerId`; the scope is AND-ed with the filters, so pages and the total agree. */
    async findPaginated(parsed: ParsedQuery, viewerId: string) {
      const query = queryAdapter.build(parsed, USER_QUERY_CONFIG)
      const where: Prisma.UserWhereInput = {
        AND: [(query.where ?? {}) as Prisma.UserWhereInput, visibleTo(viewerId)],
      }

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: profileSelect,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.user.count({ where }),
      ])

      return { data, total }
    },

    async create(dto: NewUser) {
      return prisma.user.create({ data: dto })
    },

    async update(id: string, dto: UpdateUserDTO) {
      const user = await prisma.user.update({ where: { id }, data: dto }).catch(() => null)
      if (!user) throw HttpException.notFound('User not found')
      return user
    },

    async delete(id: string) {
      await prisma.user.delete({ where: { id } })
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>

export const USER_REPOSITORY = createToken<UserRepository>('app/User/repository')
