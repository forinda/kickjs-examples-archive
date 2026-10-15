import { createToken, type ParsedQuery } from '@forinda/kickjs'
import { desc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { attachments } from '@/db/schema'
import { ATTACHMENT_QUERY_CONFIG } from './attachment.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Attachment = typeof attachments.$inferSelect
export type NewAttachment = typeof attachments.$inferInsert

export function createAttachmentRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Attachment | null> {
      const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id))
      return attachment ?? null
    },

    async findByTask(taskId: string): Promise<Attachment[]> {
      return db
        .select()
        .from(attachments)
        .where(eq(attachments.taskId, taskId))
        .orderBy(desc(attachments.createdAt))
    },

    async findPaginated(
      parsed: ParsedQuery,
      taskId?: string,
    ): Promise<{ data: Attachment[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...ATTACHMENT_QUERY_CONFIG,
        ...(taskId ? { baseCondition: eq(attachments.taskId, taskId) } : {}),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(attachments)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(attachments)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: typeof attachments.$inferInsert): Promise<Attachment> {
      const [attachment] = await db.insert(attachments).values(data).returning()
      return attachment
    },

    async delete(id: string): Promise<void> {
      await db.delete(attachments).where(eq(attachments.id, id))
    },
  }
}

export type AttachmentRepository = ReturnType<typeof createAttachmentRepository>

export const ATTACHMENT_REPOSITORY = createToken<AttachmentRepository>('app/Attachment/repository')
