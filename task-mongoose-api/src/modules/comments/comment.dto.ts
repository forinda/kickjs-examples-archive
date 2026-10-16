import { z } from 'zod'

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  parentCommentId: z.string().optional(),
})

export type CreateCommentDto = z.infer<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
})

export type UpdateCommentDto = z.infer<typeof updateCommentSchema>
