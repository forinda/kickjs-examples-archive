import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import type { Message } from '@/generated/prisma/client'

export type { Message }
export type NewMessage = {
  channelId: string
  senderId: string
  content: string
  mentions?: any
}

export function createMessageRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.message.findUnique({ where: { id } })
    },

    async findByChannel(channelId: string, cursor?: string, limit = 50) {
      return prisma.message.findMany({
        where: {
          channelId,
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    },

    async findPaginated(parsed: ParsedQuery, channelId: string) {
      const query = queryAdapter.build(parsed, { searchColumns: ['content'] })
      const where = query.where ? { AND: [query.where, { channelId }] } : { channelId }

      const [data, total] = await Promise.all([
        prisma.message.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.message.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewMessage) {
      return prisma.message.create({ data: data as any })
    },

    async update(id: string, data: Partial<NewMessage>) {
      const message = await prisma.message
        .update({ where: { id }, data: { ...data, isEdited: true } })
        .catch(() => null)
      if (!message) throw HttpException.notFound('Message not found')
      return message
    },

    async delete(id: string) {
      await prisma.message.delete({ where: { id } })
    },
  }
}

export type MessageRepository = ReturnType<typeof createMessageRepository>

export const MESSAGE_REPOSITORY = createToken<MessageRepository>('app/Message/repository')
