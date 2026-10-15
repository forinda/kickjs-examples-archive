import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import { USER_REPOSITORY, type User, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class UserDomainService {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async ensureExists(id: string): Promise<User> {
    const user = await this.repo.findById(id)
    if (!user) {
      throw HttpException.notFound(ErrorCode.USER_NOT_FOUND)
    }
    return user
  }

  async ensureActive(id: string): Promise<User> {
    const user = await this.ensureExists(id)
    if (!user.isActive) {
      throw HttpException.forbidden(ErrorCode.USER_INACTIVE)
    }
    return user
  }
}
