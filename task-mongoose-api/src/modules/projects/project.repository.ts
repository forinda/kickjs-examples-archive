import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type ProjectEntity, ProjectModel as ProjectModelDef } from './project.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { PROJECT_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Project repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createProjectRepository(connection: Connection) {
  const ProjectModel = bindModel(connection, ProjectModelDef)

  return {
    async findPaginated(
      parsed: any,
      extraFilter: Record<string, any> = {},
    ): Promise<{ data: any[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter, sort } = buildMongoQuery(parsed, PROJECT_QUERY_CONFIG, extraFilter)
      const [data, total] = await Promise.all([
        ProjectModel.find(filter).sort(sort).skip(pagination.offset).limit(pagination.limit).lean(),
        ProjectModel.countDocuments(filter),
      ])
      return { data: data as any[], total }
    },

    async findById(id: string): Promise<ProjectEntity | null> {
      return ProjectModel.findById(id).lean() as any
    },

    async findByWorkspace(workspaceId: string): Promise<ProjectEntity[]> {
      return ProjectModel.find({ workspaceId, isArchived: false }).lean() as any
    },

    async findByKeyAndWorkspace(key: string, workspaceId: string): Promise<ProjectEntity | null> {
      return ProjectModel.findOne({ key, workspaceId }).lean() as any
    },

    async create(data: Partial<ProjectEntity>): Promise<ProjectEntity> {
      const doc = await ProjectModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<ProjectEntity>): Promise<ProjectEntity | null> {
      return ProjectModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await ProjectModel.findByIdAndUpdate(id, { $set: { isArchived: true } })
      return !!result
    },

    async incrementTaskCounter(projectId: string): Promise<number> {
      const result = await ProjectModel.findByIdAndUpdate(
        projectId,
        { $inc: { taskCounter: 1 } },
        { new: true },
      )
      return result?.taskCounter ?? 0
    },
  }
}

export type ProjectRepository = ReturnType<typeof createProjectRepository>

export const PROJECT_REPOSITORY = createToken<ProjectRepository>('app/Project/repository')
