import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type CommentEntity, CommentModel as CommentModelDef } from './comment.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { COMMENT_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Comment repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createCommentRepository(connection: Connection) {
  const CommentModel = bindModel(connection, CommentModelDef)

  return {
    async findPaginated(
      parsed: any,
      extraFilter: Record<string, any> = {},
    ): Promise<{ data: any[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter, sort } = buildMongoQuery(parsed, COMMENT_QUERY_CONFIG, extraFilter)
      const [data, total] = await Promise.all([
        CommentModel.find(filter).sort(sort).skip(pagination.offset).limit(pagination.limit).lean(),
        CommentModel.countDocuments(filter),
      ])
      return { data: data as any[], total }
    },

    async findById(id: string): Promise<CommentEntity | null> {
      return CommentModel.findById(id).lean() as any
    },

    async findByTask(taskId: string): Promise<CommentEntity[]> {
      return CommentModel.find({ taskId }).sort({ createdAt: 1 }).lean() as any
    },

    async create(data: Partial<CommentEntity>): Promise<CommentEntity> {
      const doc = await CommentModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<CommentEntity>): Promise<CommentEntity | null> {
      return CommentModel.findByIdAndUpdate(
        id,
        { $set: { ...data, isEdited: true } },
        { new: true },
      ).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await CommentModel.findByIdAndDelete(id)
      return !!result
    },
  }
}

export type CommentRepository = ReturnType<typeof createCommentRepository>

export const COMMENT_REPOSITORY = createToken<CommentRepository>('app/Comment/repository')
