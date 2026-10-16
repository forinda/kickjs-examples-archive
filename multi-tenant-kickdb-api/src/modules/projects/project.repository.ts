import { createToken } from '@forinda/kickjs'
import type { AppDb } from '@/db/client'

export interface CreateProject {
  title: string
  description?: string | null
}

/**
 * No tenant parameter anywhere: the client's 'column' tenancy scopes every
 * query to the request's tenant and stamps `workspaceId` on insert.
 */
export function createProjectRepository(db: AppDb) {
  return {
    list() {
      return db.selectFrom('projects').selectAll().orderBy('createdAt', 'asc').execute()
    },

    create(input: CreateProject) {
      return db
        .insertInto('projects')
        .values({ title: input.title, description: input.description ?? null })
        .returningAll()
        .executeTakeFirstOrThrow()
    },

    /**
     * Idempotent bulk add: a title the workspace already has is skipped, not
     * updated, and every row comes back as stored — the new ones and the ones
     * that were there.
     */
    importMany(inputs: CreateProject[]) {
      return db.upsert('projects', {
        values: inputs.map((p) => ({ title: p.title, description: p.description ?? null })),
        target: ['workspaceId', 'title'],
        update: false,
      })
    },
  }
}

/** The contract, derived from the factory rather than declared beside it. */
export type ProjectRepository = ReturnType<typeof createProjectRepository>
export const PROJECT_REPOSITORY = createToken<ProjectRepository>('app/Project/repository')
