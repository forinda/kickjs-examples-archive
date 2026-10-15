import { z } from 'zod'
import { paginationSchema } from '@/shared/pagination'

export const changeStatusSchema = z.object({
  status: z.string().min(1),
})

export type ChangeStatusDto = z.infer<typeof changeStatusSchema>

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.string().default('todo'),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).default('none'),
  assigneeIds: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
  parentTaskId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  estimatePoints: z.number().int().min(0).optional(),
})

export type CreateTaskDto = z.infer<typeof createTaskSchema>

export const reorderTaskSchema = z.object({
  status: z.string().min(1),
  orderIndex: z.number().int().min(0),
})

export type ReorderTaskDto = z.infer<typeof reorderTaskSchema>

export const taskFilterSchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).optional(),
  assigneeId: z.string().optional(),
  labelId: z.string().optional(),
})

export type TaskFilterDto = z.infer<typeof taskFilterSchema>

export const updateAssigneesSchema = z.object({
  assigneeIds: z.array(z.string()),
})

export type UpdateAssigneesDto = z.infer<typeof updateAssigneesSchema>

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).optional(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatePoints: z.number().int().min(0).nullable().optional(),
})

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>
