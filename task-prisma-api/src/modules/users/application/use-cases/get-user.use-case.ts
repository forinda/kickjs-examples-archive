import { Service, Inject } from '@forinda/kickjs'
import type { UserResponseDTO } from '../dtos/user-response.dto'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(id: string): Promise<UserResponseDTO | null> {
    return this.repo.findById(id)
  }
}
