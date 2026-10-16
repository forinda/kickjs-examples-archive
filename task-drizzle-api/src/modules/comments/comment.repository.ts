import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { asc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { comments } from '@/db/schema'
import { COMMENT_QUERY_CONFIG } from './comment.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert

export function createCommentRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Comment | null> {
      const [comment] = await db.select().from(comments).where(eq(comments.id, id))
      return comment ?? null
    },

    async findByTask(taskId: string): Promise<Comment[]> {
      return db
        .select()
        .from(comments)
        .where(eq(comments.taskId, taskId))
        .orderBy(asc(comments.createdAt))
    },

    async findPaginated(
      parsed: ParsedQuery,
      taskId?: string,
    ): Promise<{ data: Comment[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...COMMENT_QUERY_CONFIG,
        ...(taskId ? { baseCondition: eq(comments.taskId, taskId) } : {}),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(comments)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewComment): Promise<Comment> {
      const [comment] = await db.insert(comments).values(data).returning()
      return comment
    },

    async update(id: string, data: Partial<NewComment>): Promise<Comment> {
      const [comment] = await db.update(comments).set(data).where(eq(comments.id, id)).returning()
      if (!comment) throw HttpException.notFound('Comment not found')
      return comment
    },

    async delete(id: string): Promise<void> {
      await db.delete(comments).where(eq(comments.id, id))
    },

    async countByTask(taskId: string): Promise<number> {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.taskId, taskId))
      return result?.count ?? 0
    },
  }
}

export type CommentRepository = ReturnType<typeof createCommentRepository>

export const COMMENT_REPOSITORY = createToken<CommentRepository>('app/Comment/repository')
