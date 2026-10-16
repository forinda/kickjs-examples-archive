import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import type { UpdateUserDTO } from './user.dto'
import { queryAdapter } from '@/shared/query-adapter'
import type { User, Prisma } from '@/generated/prisma/client'

export type { User }
export type NewUser = Prisma.UserCreateInput

export function createUserRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    async findByEmail(email: string) {
      // The client omits passwordHash globally; login needs it to verify credentials.
      return prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } })
    },

    async findAll() {
      return prisma.user.findMany()
    },

    async findPaginated(parsed: ParsedQuery) {
      const query = queryAdapter.build(parsed, {
        searchColumns: ['firstName', 'lastName', 'email'],
      })

      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where: query.where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.user.count({ where: query.where }),
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
