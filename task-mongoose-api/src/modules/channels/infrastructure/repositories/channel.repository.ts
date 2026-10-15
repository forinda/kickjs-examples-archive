import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/shared/infrastructure/database/bind-model'
import type { ChannelEntity } from '../../domain/entities/channel.entity'
import { ChannelModel as ChannelModelDef } from '../schemas/channel.schema'
import {
  buildMongoFilter,
  buildMongoSort,
  buildMongoSearch,
} from '@/shared/infrastructure/database/query-helpers'

/** Mongo-backed Channel repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createChannelRepository(connection: Connection) {
  const ChannelModel = bindModel(connection, ChannelModelDef)

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
        ChannelModel.find(mongoFilter)
          .sort(mongoSort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .lean(),
        ChannelModel.countDocuments(mongoFilter),
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
