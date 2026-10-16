import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import { ATTACHMENT_QUERY_CONFIG } from './attachment.constants'
import type { Attachment } from '@/generated/prisma/client'

export type { Attachment }
export type NewAttachment = {
  taskId: string
  uploaderId: string
  fileName: string
  fileSize: number
  mimeType: string
  data: string
}

export function createAttachmentRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.attachment.findUnique({ where: { id } })
    },

    async findByTask(taskId: string) {
      return prisma.attachment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      })
    },

    async findPaginated(parsed: ParsedQuery, taskId?: string) {
      const query = queryAdapter.build(parsed, ATTACHMENT_QUERY_CONFIG)
      const where = taskId
        ? query.where
          ? { AND: [query.where, { taskId }] }
          : { taskId }
        : query.where

      const [data, total] = await Promise.all([
        prisma.attachment.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.attachment.count({ where }),
      ])

      return { data, total }
    },

    async create(data: any) {
      return prisma.attachment.create({ data })
    },

    async delete(id: string) {
      await prisma.attachment.delete({ where: { id } })
    },
  }
}

export type AttachmentRepository = ReturnType<typeof createAttachmentRepository>

export const ATTACHMENT_REPOSITORY = createToken<AttachmentRepository>('app/Attachment/repository')
