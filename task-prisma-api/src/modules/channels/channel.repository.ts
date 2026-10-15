import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import type { Channel, ChannelMember } from '@/generated/prisma/client'

export type { Channel, ChannelMember }
export type NewChannel = {
  workspaceId: string
  name: string
  description?: string | null
  type?: any
  createdById: string
  projectId?: string | null
}

export function createChannelRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.channel.findUnique({ where: { id } })
    },

    async findPaginated(parsed: ParsedQuery, workspaceId: string) {
      const query = queryAdapter.build(parsed, { searchColumns: ['name'] })
      const where = query.where ? { AND: [query.where, { workspaceId }] } : { workspaceId }

      const [data, total] = await Promise.all([
        prisma.channel.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.channel.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewChannel) {
      return prisma.channel.create({ data: data as any })
    },

    async update(id: string, data: Partial<NewChannel>) {
      const channel = await prisma.channel
        .update({ where: { id }, data: data as any })
        .catch(() => null)
      if (!channel) throw HttpException.notFound('Channel not found')
      return channel
    },

    async delete(id: string) {
      await prisma.channel.delete({ where: { id } })
    },
  }
}

export type ChannelRepository = ReturnType<typeof createChannelRepository>

export const CHANNEL_REPOSITORY = createToken<ChannelRepository>('app/Channel/repository')
