import { Service, Inject, HttpException } from '@forinda/kickjs'
import { COMMENT_REPOSITORY, type CommentRepository } from '@/modules/comments/comment.repository'

@Service()
export class CommentDomainService {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly repo: CommentRepository) {}

  async ensureExists(id: string) {
    const entity = await this.repo.findById(id)
    if (!entity) {
      throw HttpException.notFound('Comment not found')
    }
    return entity
  }
}
