import { z } from 'zod'

export const createChannelSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(['public', 'private', 'direct']).default('public'),
})

export type CreateChannelDTO = z.infer<typeof createChannelSchema>

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
})

export type UpdateChannelDTO = z.infer<typeof updateChannelSchema>
