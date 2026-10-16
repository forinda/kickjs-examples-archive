import { z } from 'zod'

export const bookmarkSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: 'Enter a full http(s) URL' }),
  title: z
    .string()
    .trim()
    .min(1, { error: 'Title is required' })
    .max(120, { error: 'Keep the title under 120 characters' }),
})

export type BookmarkInput = z.infer<typeof bookmarkSchema>
