import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type ChannelEntity, ChannelModel as ChannelModelDef } from './channel.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { CHANNEL_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed Channel repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createChannelRepository(connection: Connection) {
  const ChannelModel = bindModel(connection, ChannelModelDef)

  return {
    async findPaginated(
      parsed: any,
      extraFilter: Record<string, any> = {},
    ): Promise<{ data: any[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter, sort } = buildMongoQuery(parsed, CHANNEL_QUERY_CONFIG, extraFilter)
      const [data, total] = await Promise.all([
        ChannelModel.find(filter).sort(sort).skip(pagination.offset).limit(pagination.limit).lean(),
        ChannelModel.countDocuments(filter),
      ])
      return { data: data as any[], total }
    },

    async findById(id: string): Promise<ChannelEntity | null> {
      return ChannelModel.findById(id).lean() as any
    },

    async findByWorkspace(workspaceId: string): Promise<ChannelEntity[]> {
      return ChannelModel.find({ workspaceId }).sort({ name: 1 }).lean() as any
    },

    async findByNameAndWorkspace(name: string, workspaceId: string): Promise<ChannelEntity | null> {
      return ChannelModel.findOne({ name, workspaceId }).lean() as any
    },

    async create(data: Partial<ChannelEntity>): Promise<ChannelEntity> {
      const doc = await ChannelModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<ChannelEntity>): Promise<ChannelEntity | null> {
      return ChannelModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await ChannelModel.findByIdAndDelete(id)
      return !!result
    },

    async addMember(channelId: string, userId: string) {
      await ChannelModel.findByIdAndUpdate(channelId, { $addToSet: { memberIds: userId } })
    },

    async removeMember(channelId: string, userId: string) {
      await ChannelModel.findByIdAndUpdate(channelId, { $pull: { memberIds: userId } })
    },
  }
}

export type ChannelRepository = ReturnType<typeof createChannelRepository>

export const CHANNEL_REPOSITORY = createToken<ChannelRepository>('app/Channel/repository')
