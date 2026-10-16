import { Service, Inject } from '@forinda/kickjs'
import { PRISMA_CLIENT } from '@/db/prisma'
import { parseMentions } from '@/shared/mentions'
import type { PrismaClient } from '@/generated/prisma/client'
import { COMMENT_REPOSITORY, type CommentRepository } from './comment.repository'
import type { CreateCommentDTO, UpdateCommentDTO } from './comment.dto'

@Service()
export class CommentService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
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
    await this.prisma.task.update({
      where: { id: dto.taskId },
      data: { commentCount: { increment: 1 } },
    })

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

    // Decrement comment count on task (minimum 0)
    await this.prisma.task.update({
      where: { id: comment.taskId },
      data: { commentCount: { decrement: 1 } },
    })
  }
}
