import { z } from 'zod'

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).default('none'),
  parentTaskId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  estimatePoints: z.number().int().optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
})

export type CreateTaskDTO = z.infer<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimatePoints: z.number().int().nullable().optional(),
  orderIndex: z.number().int().optional(),
})

export type UpdateTaskDTO = z.infer<typeof updateTaskSchema>
