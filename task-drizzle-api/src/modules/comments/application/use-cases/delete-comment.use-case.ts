import { Service, Inject } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import { tasks } from '@/db/schema'
import { COMMENT_REPOSITORY, type CommentRepository } from '@/modules/comments/comment.repository'

@Service()
export class DeleteCommentUseCase {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository,
    @Inject(DRIZZLE_DB) private readonly db: PostgresJsDatabase,
  ) {}

  async execute(id: string) {
    const comment = await this.repo.findById(id)
    if (!comment) return

    await this.repo.delete(id)

    // Decrement comment count on task
    await this.db
      .update(tasks)
      .set({ commentCount: sql`GREATEST(${tasks.commentCount} - 1, 0)` })
      .where(eq(tasks.id, comment.taskId))
  }
}
