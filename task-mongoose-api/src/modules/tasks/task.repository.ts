import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type TaskEntity, TaskModel as TaskModelDef } from './task.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { TASK_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Task repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createTaskRepository(connection: Connection) {
  const TaskModel = bindModel(connection, TaskModelDef)

  return {
    async findById(id: string): Promise<TaskEntity | null> {
      return TaskModel.findById(id).lean() as any
    },

    async findByProject(projectId: string): Promise<TaskEntity[]> {
      return TaskModel.find({ projectId }).sort({ orderIndex: 1 }).lean() as any
    },

    async findByKey(key: string): Promise<TaskEntity | null> {
      return TaskModel.findOne({ key }).lean() as any
    },

    async create(data: Partial<TaskEntity>): Promise<TaskEntity> {
      const doc = await TaskModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<TaskEntity>): Promise<TaskEntity | null> {
      return TaskModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await TaskModel.findByIdAndDelete(id)
      return !!result
    },

    async findPaginated(
      parsed: any,
      projectId: string,
    ): Promise<{ data: TaskEntity[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed

      const { filter, sort } = buildMongoQuery(parsed, TASK_QUERY_CONFIG, { projectId })

      const [data, total] = await Promise.all([
        TaskModel.find(filter).sort(sort).skip(pagination.offset).limit(pagination.limit).lean(),
        TaskModel.countDocuments(filter),
      ])

      return { data: data as any[], total }
    },

    async findOverdue(): Promise<TaskEntity[]> {
      return TaskModel.find({
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' },
      }).lean() as any
    },

    async countByStatus(projectId: string): Promise<Record<string, number>> {
      const result = await TaskModel.aggregate([
        { $match: { projectId: new (await import('mongoose')).Types.ObjectId(projectId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      return Object.fromEntries(result.map((r) => [r._id, r.count]))
    },

    async findSubtasks(parentTaskId: string): Promise<TaskEntity[]> {
      return TaskModel.find({ parentTaskId }).sort({ orderIndex: 1 }).lean() as any
    },

    async incrementCommentCount(taskId: string, amount: number) {
      await TaskModel.findByIdAndUpdate(taskId, { $inc: { commentCount: amount } })
    },

    async incrementAttachmentCount(taskId: string, amount: number) {
      await TaskModel.findByIdAndUpdate(taskId, { $inc: { attachmentCount: amount } })
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>

export const TASK_REPOSITORY = createToken<TaskRepository>('app/Task/repository')
