import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
})

export type CreateWorkspaceDTO = z.infer<typeof createWorkspaceSchema>

export const inviteMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member']).default('member'),
})

export type InviteMemberDTO = z.infer<typeof inviteMemberSchema>

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

export type UpdateMemberRoleDTO = z.infer<typeof updateMemberRoleSchema>

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
})

export type UpdateWorkspaceDTO = z.infer<typeof updateWorkspaceSchema>
