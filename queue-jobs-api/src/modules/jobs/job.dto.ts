import { fromZod } from '@forinda/kickjs-schema/zod'
import { z } from 'zod'

export const EMAIL_QUEUE = 'email'
export const REPORTS_QUEUE = 'reports'
export const JOB_QUEUES = [EMAIL_QUEUE, REPORTS_QUEUE]

/** The repeatable digest's scheduler id — upserting it again replaces the schedule. */
export const DIGEST_SCHEDULER = 'daily-digest'

export interface EmailData {
  to: string
  subject: string
  /** Demo knob: fail this many attempts before succeeding (shows retries + backoff). */
  failTimes?: number
}

export interface ReportData {
  rows: number
}

export const sendEmailSchema = fromZod(
  z.object({
    to: z.email(),
    subject: z.string().min(1).max(200),
    failTimes: z.number().int().min(0).max(10).optional(),
  }),
)

export const bulkEmailSchema = fromZod(
  z.object({
    subject: z.string().min(1).max(200),
    recipients: z.array(z.email()).min(1).max(500),
  }),
)

export const reminderSchema = fromZod(
  z.object({
    to: z.email(),
    subject: z.string().min(1).max(200),
    delayMs: z
      .number()
      .int()
      .min(0)
      .max(7 * 24 * 3600 * 1000),
  }),
)

export const reportSchema = fromZod(
  z.object({ rows: z.number().int().min(1).max(10_000).default(1000) }),
)

export const digestScheduleSchema = fromZod(z.object({ everyMs: z.number().int().min(1000) }))
