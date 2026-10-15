import { Service, Inject } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import { tasks } from '@/db/schema'
import {
  ATTACHMENT_REPOSITORY,
  type AttachmentRepository,
} from '@/modules/attachments/attachment.repository'

@Service()
export class DeleteAttachmentUseCase {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY) private readonly repo: AttachmentRepository,
    @Inject(DRIZZLE_DB) private readonly db: PostgresJsDatabase,
  ) {}

  async execute(id: string) {
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
