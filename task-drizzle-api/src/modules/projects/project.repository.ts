import { createToken, HttpException, type ParsedQuery } from '@forinda/kickjs'
import { eq, sql } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { projects } from '@/db/schema'
import { PROJECT_QUERY_CONFIG } from './project.constants'
import { queryAdapter } from '@/shared/query-adapter'

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export function createProjectRepository(db: AppDatabase) {
  return {
    async findById(id: string): Promise<Project | null> {
      const [project] = await db.select().from(projects).where(eq(projects.id, id))
      return project ?? null
    },

    async findByWorkspace(workspaceId: string): Promise<Project[]> {
      return db.select().from(projects).where(eq(projects.workspaceId, workspaceId))
    },

    async findPaginated(
      parsed: ParsedQuery,
      workspaceId?: string,
    ): Promise<{ data: Project[]; total: number }> {
      const query = queryAdapter.buildFromColumns(parsed, {
        ...PROJECT_QUERY_CONFIG,
        ...(workspaceId ? { baseCondition: eq(projects.workspaceId, workspaceId) } : {}),
      })

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(projects)
          .where(query.where)
          .orderBy(...query.orderBy)
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(projects)
          .where(query.where),
      ])

      return { data, total: countResult[0]?.count ?? 0 }
    },

    async create(dto: NewProject): Promise<Project> {
      const [project] = await db.insert(projects).values(dto).returning()
      return project
    },

    async update(id: string, dto: Partial<NewProject>): Promise<Project> {
      const [project] = await db.update(projects).set(dto).where(eq(projects.id, id)).returning()
      if (!project) throw HttpException.notFound('Project not found')
      return project
    },

    async incrementTaskCounter(id: string): Promise<{ taskCounter: number; key: string }> {
      const [result] = await db
        .update(projects)
        .set({ taskCounter: sql`${projects.taskCounter} + 1` })
        .where(eq(projects.id, id))
        .returning({ taskCounter: projects.taskCounter, key: projects.key })
      return result
    },

    async delete(id: string): Promise<void> {
      await db.delete(projects).where(eq(projects.id, id))
    },
  }
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>

export const PROJECT_REPOSITORY = createToken<ProjectRepository>('app/Project/repository')
