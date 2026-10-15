import { Service, Inject } from '@forinda/kickjs'
import type { UpdateUserDTO } from '../dtos/update-user.dto'
import type { UserResponseDTO } from '../dtos/user-response.dto'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(id: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    return this.repo.update(id, dto)
  }
}
