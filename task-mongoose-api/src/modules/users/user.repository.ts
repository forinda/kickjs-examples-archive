import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type UserEntity, UserModel as UserModelDef } from './user.schema'
import {
  ACCEPTED,
  WorkspaceMemberModel as WorkspaceMemberModelDef,
} from '@/modules/workspaces/workspace-member.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { USER_QUERY_CONFIG } from '@/shared/query-configs'

/** What another user may see of a profile — never the hash or any token. */
export const PUBLIC_USER_FIELDS =
  'email firstName lastName avatarUrl globalRole lastLoginAt createdAt'

/** Mongo-backed User repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createUserRepository(connection: Connection) {
  const UserModel = bindModel(connection, UserModelDef)
  const WorkspaceMemberModel = bindModel(connection, WorkspaceMemberModelDef)

  /** Filter for the viewer plus everyone who shares an accepted membership with them. */
  async function visibleTo(viewerId: string) {
    const workspaceIds = await WorkspaceMemberModel.distinct('workspaceId', {
      userId: viewerId,
      ...ACCEPTED,
    })
    // ponytail: loads every teammate id; switch to a $lookup aggregation if workspaces grow huge.
    const teammateIds = await WorkspaceMemberModel.distinct('userId', {
      workspaceId: { $in: workspaceIds },
      ...ACCEPTED,
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
      return UserModel.findOne({ $and: [await visibleTo(viewerId), { _id: id }] })
        .select(PUBLIC_USER_FIELDS)
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

    /** Users visible to `viewerId`; the scope is AND-ed with the caller's filters, so pages and the total agree. Public fields only. */
    async findPaginated(
      parsed: any,
      viewerId: string,
    ): Promise<{ data: UserEntity[]; total: number }> {
      const { pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter, sort } = buildMongoQuery(parsed, USER_QUERY_CONFIG, await visibleTo(viewerId))

      const [data, total] = await Promise.all([
        UserModel.find(filter)
          .sort(sort)
          .skip(pagination.offset)
          .limit(pagination.limit)
          .select(PUBLIC_USER_FIELDS)
          .lean(),
        UserModel.countDocuments(filter),
      ])

      return { data: data as any[], total }
    },
  }
}

export type UserRepository = ReturnType<typeof createUserRepository>

export const USER_REPOSITORY = createToken<UserRepository>('app/User/repository')
