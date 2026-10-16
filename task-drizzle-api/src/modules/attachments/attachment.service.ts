import { Service, Inject } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import { tasks } from '@/db/schema'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
  type NewAttachment,
} from './attachment.repository'

@Service()
export class AttachmentService {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository,
    @Inject(DRIZZLE_DB) private readonly db: PostgresJsDatabase,
  ) {}

  async create(data: Omit<NewAttachment, 'uploaderId'>, uploaderId: string) {
    const attachment = await this.repo.create({
      ...data,
      uploaderId,
    })

    // Increment attachment count on task
    await this.db
      .update(tasks)
      .set({ attachmentCount: sql`${tasks.attachmentCount} + 1` })
      .where(eq(tasks.id, data.taskId))

    return attachment
  }

  async delete(id: string) {
    const attachment = await this.repo.findById(id)
    if (!attachment) return

    await this.repo.delete(id)

    // Decrement attachment count on task
    await this.db
      .update(tasks)
      .set({
        attachmentCount: sql`GREATEST(${tasks.attachmentCount} - 1, 0)`,
      })
      .where(eq(tasks.id, attachment.taskId))
  }
}
