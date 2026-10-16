import { createToken } from '@forinda/kickjs'
import { and, eq } from 'drizzle-orm'
import type { AppDatabase } from '@/db'
import { users, workspaceMembers, workspaces } from '@/db/schema'

export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert

/** Accepted memberships only — a pending invite grants nothing. Every membership read uses it. */
export const acceptedMembership = eq(workspaceMembers.status, 'accepted')

const memberOf = (workspaceId: string, userId: string) =>
  and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId))

export function createWorkspaceMemberRepository(db: AppDatabase) {
  return {
    async findByWorkspaceAndUser(
      workspaceId: string,
      userId: string,
    ): Promise<WorkspaceMember | null> {
      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(and(memberOf(workspaceId, userId), acceptedMembership))
      return member ?? null
    },

    /** The membership or pending invite, whichever exists — for invite de-duplication only. */
    async findAnyByWorkspaceAndUser(
      workspaceId: string,
      userId: string,
    ): Promise<WorkspaceMember | null> {
      const [member] = await db.select().from(workspaceMembers).where(memberOf(workspaceId, userId))
      return member ?? null
    },

    /** `userId`'s pending invites, with the workspace name so they know what they're joining. */
    async listInvitesForUser(userId: string) {
      return db
        .select({
          workspaceId: workspaces.id,
          workspaceName: workspaces.name,
          role: workspaceMembers.role,
          invitedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'pending')))
    },

    /** Turns `userId`'s pending invite into a membership. False when there is no such invite. */
    async acceptInvite(workspaceId: string, userId: string): Promise<boolean> {
      const rows = await db
        .update(workspaceMembers)
        .set({ status: 'accepted', joinedAt: new Date() })
        .where(and(memberOf(workspaceId, userId), eq(workspaceMembers.status, 'pending')))
        .returning({ id: workspaceMembers.id })
      return rows.length > 0
    },

    /** Drops `userId`'s pending invite. False when there is no such invite. */
    async declineInvite(workspaceId: string, userId: string): Promise<boolean> {
      const rows = await db
        .delete(workspaceMembers)
        .where(and(memberOf(workspaceId, userId), eq(workspaceMembers.status, 'pending')))
        .returning({ id: workspaceMembers.id })
      return rows.length > 0
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
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), acceptedMembership))
    },

    async listByUser(userId: string): Promise<WorkspaceMember[]> {
      return db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.userId, userId), acceptedMembership))
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
