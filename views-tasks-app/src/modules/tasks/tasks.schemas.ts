import { z } from 'zod'

/** A form's `<select>` / date input sends '' for "none". */
const optionalId = z
  .string()
  .regex(/^\d*$/, 'Pick a category')
  .optional()
  .transform((v) => (v ? Number(v) : null))
const optionalDate = z
  .union([z.literal(''), z.iso.date('Enter a date')])
  .optional()
  .transform((v) => (v ? new Date(v) : null))

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(200, 'At most 200 characters'),
  notes: z
    .string()
    .trim()
    .max(2000, 'At most 2000 characters')
    .optional()
    .transform((v) => v || null),
  categoryId: optionalId,
  dueDate: optionalDate,
})
export type TaskInput = z.output<typeof taskSchema>
