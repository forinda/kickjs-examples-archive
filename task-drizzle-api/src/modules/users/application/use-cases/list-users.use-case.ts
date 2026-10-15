import { Service, Inject, type ParsedQuery } from '@forinda/kickjs'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(parsed: ParsedQuery) {
    return this.repo.findPaginated(parsed)
  }
}
