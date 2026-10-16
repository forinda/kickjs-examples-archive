import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type ActivityEntity, ActivityModel as ActivityModelDef } from './activity.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { ACTIVITY_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Activity repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createActivityRepository(connection: Connection) {
  const ActivityModel = bindModel(connection, ActivityModelDef)

  return {
    async create(data: Partial<ActivityEntity>): Promise<ActivityEntity> {
      const doc = await ActivityModel.create(data)
      return doc.toObject() as any
    },

    async findByWorkspace(
      workspaceId: string,
      parsed: any,
    ): Promise<{ data: ActivityEntity[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed

      const { filter, sort } = buildMongoQuery(parsed, ACTIVITY_QUERY_CONFIG, { workspaceId })

      const [data, total] = await Promise.all([
        ActivityModel.find(filter)
          .sort(sort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        ActivityModel.countDocuments(filter),
      ])

      return { data: data as any[], total }
    },

    async findByProject(
      projectId: string,
      parsed: any,
    ): Promise<{ data: ActivityEntity[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed

      const { filter, sort } = buildMongoQuery(parsed, ACTIVITY_QUERY_CONFIG, { projectId })

      const [data, total] = await Promise.all([
        ActivityModel.find(filter)
          .sort(sort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        ActivityModel.countDocuments(filter),
      ])

      return { data: data as any[], total }
    },

    async findByTask(taskId: string): Promise<ActivityEntity[]> {
      return ActivityModel.find({ taskId }).sort({ createdAt: -1 }).lean() as any
    },
  }
}

export type ActivityRepository = ReturnType<typeof createActivityRepository>

export const ACTIVITY_REPOSITORY = createToken<ActivityRepository>('app/Activity/repository')
