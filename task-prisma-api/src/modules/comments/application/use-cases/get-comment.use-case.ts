import { Service, Inject } from '@forinda/kickjs'
import { COMMENT_REPOSITORY, type CommentRepository } from '@/modules/comments/comment.repository'

@Service()
export class GetCommentUseCase {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository) {}

  async execute(id: string) {
    return this.repo.findById(id)
  }
}
