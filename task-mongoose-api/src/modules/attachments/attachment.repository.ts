import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type AttachmentEntity, AttachmentModel as AttachmentModelDef } from './attachment.schema'
import {
  buildMongoFilter,
  buildMongoSort,
  buildMongoSearch,
} from '@/db/query-helpers'

/** Mongo-backed Attachment repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createAttachmentRepository(connection: Connection) {
  const AttachmentModel = bindModel(connection, AttachmentModelDef)

  return {
    async findPaginated(
      parsed: any,
      extraFilter: Record<string, any> = {},
    ): Promise<{ data: any[]; total: number }> {
      const {
        filters = [],
        sort = [],
        pagination = { page: 1, limit: 20, offset: 0 },
        search = '',
      } = parsed
      const mongoFilter = {
        ...extraFilter,
        ...buildMongoFilter(filters),
        ...buildMongoSearch(search),
      }
      const mongoSort = buildMongoSort(sort)
      const [data, total] = await Promise.all([
        AttachmentModel.find(mongoFilter)
          .sort(mongoSort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        AttachmentModel.countDocuments(mongoFilter),
      ])
      return { data: data as any[], total }
    },

    async findById(id: string): Promise<AttachmentEntity | null> {
      return AttachmentModel.findById(id).lean() as any
    },

    async findByTask(taskId: string): Promise<AttachmentEntity[]> {
      return AttachmentModel.find({ taskId }).sort({ createdAt: -1 }).lean() as any
    },

    async create(data: Partial<AttachmentEntity>): Promise<AttachmentEntity> {
      const doc = await AttachmentModel.create(data)
      return doc.toObject() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await AttachmentModel.findByIdAndDelete(id)
      return !!result
    },
  }
}

export type AttachmentRepository = ReturnType<typeof createAttachmentRepository>

export const ATTACHMENT_REPOSITORY = createToken<AttachmentRepository>('app/Attachment/repository')
