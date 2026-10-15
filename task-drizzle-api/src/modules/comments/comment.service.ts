import { Service, Inject } from '@forinda/kickjs'
import { DRIZZLE_DB } from '@/db'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import { tasks } from '@/db/schema'
import { COMMENT_REPOSITORY, type CommentRepository } from './comment.repository'
import type { CreateCommentDTO, UpdateCommentDTO } from './comment.dto'

/** Extract @mentioned user IDs from comment content */
function parseMentions(content: string): string[] {
  const uuidRegex = /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
  const matches = content.matchAll(uuidRegex)
  return [...new Set([...matches].map((m) => m[1]))]
}

@Service()
export class CommentService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository,
    @Inject(DRIZZLE_DB) private readonly db: PostgresJsDatabase,
  ) {}

  async create(dto: CreateCommentDTO, authorId: string) {
    const mentions = parseMentions(dto.content)
    const comment = await this.repo.create({
      taskId: dto.taskId,
      authorId,
      content: dto.content,
      mentions,
    })

    // Increment comment count on task
    await this.db
      .update(tasks)
      .set({ commentCount: sql`${tasks.commentCount} + 1` })
      .where(eq(tasks.id, dto.taskId))

    return comment
  }

  async update(id: string, dto: UpdateCommentDTO) {
    const mentions = parseMentions(dto.content)
    return this.repo.update(id, { content: dto.content, mentions })
  }

  async delete(id: string) {
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
