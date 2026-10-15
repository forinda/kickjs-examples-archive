import { Service, Inject } from '@forinda/kickjs'
import type { ParsedQuery } from '@forinda/kickjs'
import { COMMENT_REPOSITORY, type CommentRepository } from '@/modules/comments/comment.repository'

@Service()
export class ListCommentsUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository) {}

  async execute(parsed: ParsedQuery, taskId?: string) {
    return this.repo.findPaginated(parsed, taskId)
  }
}
