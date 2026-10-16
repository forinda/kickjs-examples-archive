import { createToken } from '@forinda/kickjs'
import { HttpException } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'
import type { ParsedQuery } from '@forinda/kickjs'
import { queryAdapter } from '@/shared/query-adapter'
import { COMMENT_QUERY_CONFIG } from './comment.constants'
import type { Comment } from '@/generated/prisma/client'

export type { Comment }
export type NewComment = {
  taskId: string
  authorId: string
  content: string
  mentions?: any
}

export function createCommentRepository(prisma: PrismaClient) {
  return {
    async findById(id: string) {
      return prisma.comment.findUnique({ where: { id } })
    },

    async findByTask(taskId: string) {
      return prisma.comment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      })
    },

    async findPaginated(parsed: ParsedQuery, taskId?: string) {
      const query = queryAdapter.build(parsed, COMMENT_QUERY_CONFIG)
      const where = taskId
        ? query.where
          ? { AND: [query.where, { taskId }] }
          : { taskId }
        : query.where

      const [data, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          orderBy: query.orderBy,
          skip: query.skip,
          take: query.take,
        }),
        prisma.comment.count({ where }),
      ])

      return { data, total }
    },

    async create(data: NewComment) {
      return prisma.comment.create({ data: data as any })
    },

    async update(id: string, data: Partial<NewComment>) {
      const comment = await prisma.comment
        .update({ where: { id }, data: data as any })
        .catch(() => null)
      if (!comment) throw HttpException.notFound('Comment not found')
      return comment
    },

    async delete(id: string) {
      await prisma.comment.delete({ where: { id } })
    },

    async countByTask(taskId: string) {
      return prisma.comment.count({ where: { taskId } })
    },
  }
}

export type CommentRepository = ReturnType<typeof createCommentRepository>

export const COMMENT_REPOSITORY = createToken<CommentRepository>('app/Comment/repository')
