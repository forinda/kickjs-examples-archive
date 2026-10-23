import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z
  .object({
    email: z.email('Enter a valid email').trim().toLowerCase(),
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  // The browser checks this too (sameAs in src/views/validators.ts); this is the one that counts.
  .refine((form) => form.password === form.confirm, {
    message: 'The passwords don’t match',
    path: ['confirm'],
  })
