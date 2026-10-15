import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { workspaceMembers, workspaces } from '@/db/schema'
import { WORKSPACE_QUERY_CONFIG } from '@/modules/workspaces/constants'
import { queryAdapter } from '@/shared/infrastructure/query-adapter'

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert

export function createWorkspaceRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Workspace | null> {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id))
      return workspace ?? null
    },

    async findBySlug(slug: string): Promise<Workspace | null> {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug))
      return workspace ?? null
    },

    async findForUser(userId: string): Promise<Workspace[]> {
      return db
        .select({ workspace: workspaces })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, userId))
        .then((rows) => rows.map((r) => r.workspace))
    },

    async findPaginated(parsed: ParsedQuery): Promise<{ data: Workspace[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, WORKSPACE_QUERY_CONFIG)

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(workspaces)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(workspaces)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(dto: any): Promise<Workspace> {
      const [workspace] = await db.insert(workspaces).values(dto).returning()
      return workspace
    },

    async update(id: string, dto: any): Promise<Workspace> {
      const [workspace] = await db
        .update(workspaces)
        .set(dto)
        .where(eq(workspaces.id, id))
        .returning()
      if (!workspace) throw HttpException.notFound('Workspace not found')
      return workspace
    },

    async delete(id: string): Promise<void> {
      await db.delete(workspaces).where(eq(workspaces.id, id))
    },
  }
}

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

export const WORKSPACE_REPOSITORY = createToken<WorkspaceRepository>('app/Workspace/repository')
