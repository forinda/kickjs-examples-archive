import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import mongoose from 'mongoose'
import {
  ACCEPTED,
  type WorkspaceMemberEntity,
  WorkspaceMemberModel as WorkspaceMemberModelDef,
} from './workspace-member.schema'
import { buildMongoQuery } from '@/db/query-helpers'
import { MEMBER_QUERY_CONFIG, WORKSPACE_QUERY_CONFIG } from '@/shared/query-configs'

/** Mongo-backed WorkspaceMember repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createWorkspaceMemberRepository(connection: Connection) {
  const WorkspaceMemberModel = bindModel(connection, WorkspaceMemberModelDef)

  // Every read below counts accepted memberships only — a pending invite grants nothing.
  return {
    async findByUserAndWorkspace(
      userId: string,
      workspaceId: string,
    ): Promise<WorkspaceMemberEntity | null> {
      return WorkspaceMemberModel.findOne({ userId, workspaceId, ...ACCEPTED }).lean() as any
    },

    /** The membership or pending invite, whichever exists — for invite de-duplication only. */
    async findAnyByUserAndWorkspace(
      userId: string,
      workspaceId: string,
    ): Promise<WorkspaceMemberEntity | null> {
      return WorkspaceMemberModel.findOne({ userId, workspaceId }).lean() as any
    },

    async findByWorkspace(workspaceId: string): Promise<WorkspaceMemberEntity[]> {
      return WorkspaceMemberModel.find({ workspaceId, ...ACCEPTED }).lean() as any
    },

    async findByUser(userId: string): Promise<WorkspaceMemberEntity[]> {
      return WorkspaceMemberModel.find({ userId, ...ACCEPTED }).lean() as any
    },

    /** Turns `userId`'s pending invite into a membership. False when there is no such invite. */
    async acceptInvite(userId: string, workspaceId: string): Promise<boolean> {
      const result = await WorkspaceMemberModel.updateOne(
        { userId, workspaceId, status: 'pending' },
        { $set: { status: 'accepted', joinedAt: new Date() } },
      )
      return result.modifiedCount > 0
    },

    /** Drops `userId`'s pending invite. False when there is no such invite. */
    async declineInvite(userId: string, workspaceId: string): Promise<boolean> {
      const result = await WorkspaceMemberModel.deleteOne({
        userId,
        workspaceId,
        status: 'pending',
      })
      return result.deletedCount > 0
    },

    async create(data: Partial<WorkspaceMemberEntity>): Promise<WorkspaceMemberEntity> {
      const doc = await WorkspaceMemberModel.create(data)
      return doc.toObject() as any
    },

    async updateRole(id: string, role: 'admin' | 'member'): Promise<WorkspaceMemberEntity | null> {
      return WorkspaceMemberModel.findByIdAndUpdate(
        id,
        { $set: { role } },
        { new: true },
      ).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await WorkspaceMemberModel.findByIdAndDelete(id)
      return !!result
    },

    async deleteByUserAndWorkspace(userId: string, workspaceId: string): Promise<boolean> {
      const result = await WorkspaceMemberModel.deleteOne({ userId, workspaceId })
      return result.deletedCount > 0
    },

    async findPaginatedForUser(
      parsed: any,
      userId: string,
    ): Promise<{ data: any[]; total: number }> {
      const { filters, sort: sortBy, pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter: matchStage, sort: mongoSort } = buildMongoQuery(
        { filters, sort: sortBy },
        WORKSPACE_QUERY_CONFIG,
        { userId: new mongoose.Types.ObjectId(userId), ...ACCEPTED },
      )

      const pipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'workspaces',
            localField: 'workspaceId',
            foreignField: '_id',
            as: 'workspace',
          },
        },
        { $unwind: '$workspace' },
        {
          $project: {
            _id: '$workspace._id',
            name: '$workspace.name',
            slug: '$workspace.slug',
            description: '$workspace.description',
            ownerId: '$workspace.ownerId',
            logoUrl: '$workspace.logoUrl',
            createdAt: '$workspace.createdAt',
            updatedAt: '$workspace.updatedAt',
            role: '$role',
          },
        },
        { $sort: mongoSort },
      ]

      const countPipeline = [...pipeline, { $count: 'total' }]
      const dataPipeline = [...pipeline, { $skip: pagination.offset }, { $limit: pagination.limit }]

      const [countResult, data] = await Promise.all([
        WorkspaceMemberModel.aggregate(countPipeline),
        WorkspaceMemberModel.aggregate(dataPipeline),
      ])

      return { data, total: countResult[0]?.total ?? 0 }
    },

    async findPaginatedMembers(
      parsed: any,
      workspaceId: string,
    ): Promise<{ data: any[]; total: number }> {
      const { filters, sort: sortBy, pagination = { page: 1, limit: 20, offset: 0 } } = parsed
      const { filter: matchStage, sort: mongoSort } = buildMongoQuery(
        { filters, sort: sortBy },
        MEMBER_QUERY_CONFIG,
        { workspaceId: new mongoose.Types.ObjectId(workspaceId), ...ACCEPTED },
      )

      const pipeline: any[] = [
        { $match: matchStage },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            userId: 1,
            role: 1,
            joinedAt: 1,
            user: {
              email: '$user.email',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              avatarUrl: '$user.avatarUrl',
            },
          },
        },
        { $sort: mongoSort },
      ]

      const countPipeline = [...pipeline, { $count: 'total' }]
      const dataPipeline = [...pipeline, { $skip: pagination.offset }, { $limit: pagination.limit }]

      const [countResult, data] = await Promise.all([
        WorkspaceMemberModel.aggregate(countPipeline),
        WorkspaceMemberModel.aggregate(dataPipeline),
      ])

      return { data, total: countResult[0]?.total ?? 0 }
    },
  }
}

export type WorkspaceMemberRepository = ReturnType<typeof createWorkspaceMemberRepository>

export const WORKSPACE_MEMBER_REPOSITORY = createToken<WorkspaceMemberRepository>(
  'app/WorkspaceMember/repository',
)
