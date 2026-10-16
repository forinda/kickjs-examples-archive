import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type AttachmentEntity, AttachmentModel as AttachmentModelDef } from './attachment.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { ATTACHMENT_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Attachment repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createAttachmentRepository(connection: Connection) {
  const AttachmentModel = bindModel(connection, AttachmentModelDef)

  return {
    async findPaginated(
      parsed: any,
      extraFilter: Record<string, any> = {},
    ): Promise<{ data: any[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter, sort } = buildMongoQuery(parsed, ATTACHMENT_QUERY_CONFIG, extraFilter)
      const [data, total] = await Promise.all([
        AttachmentModel.find(filter)
          .sort(sort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        AttachmentModel.countDocuments(filter),
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
