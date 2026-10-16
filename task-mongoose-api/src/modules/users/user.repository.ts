import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type UserEntity, UserModel as UserModelDef } from './user.schema'
import { WorkspaceMemberModel as WorkspaceMemberModelDef } from '@/modules/workspaces/workspace-member.schema'
import { buildMongoFilter, buildMongoSort, buildMongoSearch } from '@/db/query-helpers'

/** Mongo-backed User repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createUserRepository(connection: Connection) {
  const UserModel = bindModel(connection, UserModelDef)
  const WorkspaceMemberModel = bindModel(connection, WorkspaceMemberModelDef)

  /** Filter for the viewer plus everyone who shares at least one workspace with them. */
  async function visibleTo(viewerId: string) {
    const workspaceIds = await WorkspaceMemberModel.distinct('workspaceId', { userId: viewerId })
    // ponytail: loads every teammate id; switch to a $lookup aggregation if workspaces grow huge.
    const teammateIds = await WorkspaceMemberModel.distinct('userId', {
      workspaceId: { $in: workspaceIds },
    })
    return { _id: { $in: [viewerId, ...teammateIds] } }
  }

  return {
    /** Unscoped — for the caller's own record and internal lookups (invites), never for reading others. */
    async findById(id: string): Promise<UserEntity | null> {
      return UserModel.findById(id).lean() as any
    },

    /** `id` if the viewer may see it (themselves or a workspace teammate), else null. Never the hash. */
    async findVisibleById(id: string, viewerId: string): Promise<UserEntity | null> {
      const { _id } = await visibleTo(viewerId)
      return UserModel.findOne({ $and: [{ _id: id }, { _id }] })
        .select('-passwordHash')
        .lean() as any
    },

    async findByEmail(email: string): Promise<UserEntity | null> {
      return UserModel.findOne({ email: email.toLowerCase() }).lean() as any
    },

    async create(data: Partial<UserEntity>): Promise<UserEntity> {
      const doc = await UserModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
      return UserModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as any
    },

    /** Users visible to `viewerId`, scoped in the query so filters, pages and the total agree. Never the hash. */
    async findPaginated(
      parsed: any,
      viewerId: string,
    ): Promise<{ data: UserEntity[]; total: number }> {
      const {
        filters = [],
        sort = [],
        pagination = { page: 1, limit: 20, offset: 0 },
        search = '',
      } = parsed

      const mongoFilter = {
        ...buildMongoFilter(filters),
        ...buildMongoSearch(search),
        ...(await visibleTo(viewerId)), // last, so no filter can widen it
      }
      const mongoSort = buildMongoSort(sort)

      const [data, total] = await Promise.all([
        UserModel.find(mongoFilter)
          .sort(mongoSort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .select('-passwordHash')
          .lean(),
        UserModel.countDocuments(mongoFilter),
      ])

      return { data: data as any[], total }
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>

export const USER_REPOSITORY = createToken<UserRepository>('app/User/repository')
