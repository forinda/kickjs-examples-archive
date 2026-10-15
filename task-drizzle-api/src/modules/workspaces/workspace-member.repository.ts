import { createToken } from '@forinda/kickjs'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { users, workspaceMembers } from '@/db/schema'

export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert

export function createWorkspaceMemberRepository(db: AppDatabase) {
  return {
    async findByWorkspaceAndUser(
      workspaceId: string,
      userId: string,
    ): Promise<WorkspaceMember | null> {
      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
        )
      return member ?? null
    },

    async listByWorkspace(workspaceId: string): Promise<any[]> {
      return db
        .select({
          member: workspaceMembers,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
    },

    async listByUser(userId: string): Promise<WorkspaceMember[]> {
      return db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, userId))
    },

    async add(data: NewWorkspaceMember): Promise<WorkspaceMember> {
      const [member] = await db.insert(workspaceMembers).values(data).returning()
      return member
    },

    async updateRole(workspaceId: string, userId: string, role: string): Promise<WorkspaceMember> {
      const [member] = await db
        .update(workspaceMembers)
        .set({ role: role as any })
        .where(
          and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
        )
        .returning()
      return member
    },

    async remove(workspaceId: string, userId: string): Promise<void> {
      await db
        .delete(workspaceMembers)
        .where(
          and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
        )
    },
  }
}

export type WorkspaceMemberRepository = ReturnType<typeof createWorkspaceMemberRepository>

export const WORKSPACE_MEMBER_REPOSITORY = createToken<WorkspaceMemberRepository>(
  'app/WorkspaceMember/repository',
)
