import { z } from 'zod'

export const createLabelSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code'),
})

export type CreateLabelDTO = z.infer<typeof createLabelSchema>

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .optional(),
})

export type UpdateLabelDTO = z.infer<typeof updateLabelSchema>
