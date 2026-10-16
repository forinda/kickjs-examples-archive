import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import type { UpdateUserDTO } from './user.dto'
import { queryAdapter } from '@/shared/query-adapter'
import type { User, Prisma } from '@/generated/prisma/client'

export type { User }
export type NewUser = Prisma.UserCreateInput

/** The viewer plus everyone who shares at least one workspace with them. */
const visibleTo = (viewerId: string): Prisma.UserWhereInput => ({
  OR: [
    { id: viewerId },
    { workspaceMemberships: { some: { workspace: { members: { some: { userId: viewerId } } } } } },
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
      return prisma.user.findFirst({ where: { AND: [{ id }, visibleTo(viewerId)] } })
    },

    async findByEmail(email: string) {
      // The client omits passwordHash globally; login needs it to verify credentials.
      return prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } })
    },

    async findAll() {
      return prisma.user.findMany()
    },

    /** Users visible to `viewerId`, scoped in the query so filters, pages and the total all agree. */
    async findPaginated(parsed: ParsedQuery, viewerId: string) {
      const query = queryAdapter.build(parsed, {
        searchColumns: ['firstName', 'lastName', 'email'],
      })
      const where: Prisma.UserWhereInput = {
        AND: [(query.where ?? {}) as Prisma.UserWhereInput, visibleTo(viewerId)],
      }

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
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
