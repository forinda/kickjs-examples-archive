import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { asc, eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { labels } from '@/db/schema'
import { LABEL_QUERY_CONFIG } from './label.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Label = typeof labels.$inferSelect
export type NewLabel = typeof labels.$inferInsert

export function createLabelRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Label | null> {
      const [label] = await db.select().from(labels).where(eq(labels.id, id))
      return label ?? null
    },

    async findByWorkspace(workspaceId: string): Promise<Label[]> {
      return db
        .select()
        .from(labels)
        .where(eq(labels.workspaceId, workspaceId))
        .orderBy(asc(labels.name))
    },

    async findPaginated(
      parsed: ParsedQuery,
      workspaceId?: string,
    ): Promise<{ data: Label[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...LABEL_QUERY_CONFIG,
        ...(workspaceId ? { baseCondition: eq(labels.workspaceId, workspaceId) } : {}),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(labels)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(labels)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(data: NewLabel): Promise<Label> {
      const [label] = await db.insert(labels).values(data).returning()
      return label
    },

    async update(id: string, data: Partial<NewLabel>): Promise<Label> {
      const [label] = await db.update(labels).set(data).where(eq(labels.id, id)).returning()
      if (!label) throw HttpException.notFound('Label not found')
      return label
    },

    async delete(id: string): Promise<void> {
      await db.delete(labels).where(eq(labels.id, id))
    },
  }
}

export type LabelRepository = ReturnType<typeof createLabelRepository>

export const LABEL_REPOSITORY = createToken<LabelRepository>('app/Label/repository')
