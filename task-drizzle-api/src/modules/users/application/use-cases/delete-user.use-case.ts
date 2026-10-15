import { Service, Inject } from '@forinda/kickjs'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.delete(id)
  }
}
