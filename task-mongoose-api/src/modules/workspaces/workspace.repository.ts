import { createToken } from '@forinda/kickjs'
import type { Connection } from 'mongoose'
import { bindModel } from '@/db/bind-model'
import { type WorkspaceEntity, WorkspaceModel as WorkspaceModelDef } from './workspace.schema'

/** Mongo-backed Workspace repository. `connection` is the one MongooseAdapter registers under MONGO_CONNECTION. */
export function createWorkspaceRepository(connection: Connection) {
  const WorkspaceModel = bindModel(connection, WorkspaceModelDef)

  return {
    async findById(id: string): Promise<WorkspaceEntity | null> {
      return WorkspaceModel.findById(id).lean() as any
    },

    async findBySlug(slug: string): Promise<WorkspaceEntity | null> {
      return WorkspaceModel.findOne({ slug }).lean() as any
    },

    async create(data: Partial<WorkspaceEntity>): Promise<WorkspaceEntity> {
      const doc = await WorkspaceModel.create(data)
      return doc.toObject() as any
    },

    async update(id: string, data: Partial<WorkspaceEntity>): Promise<WorkspaceEntity | null> {
      return WorkspaceModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean() as any
    },

    async delete(id: string): Promise<boolean> {
      const result = await WorkspaceModel.findByIdAndDelete(id)
      return !!result
    },

    async findByOwner(ownerId: string): Promise<WorkspaceEntity[]> {
      return WorkspaceModel.find({ ownerId }).lean() as any
    },
  }
}

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>

export const WORKSPACE_REPOSITORY = createToken<WorkspaceRepository>('app/Workspace/repository')
