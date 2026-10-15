/**
 * Create User Use Case
 *
 * Application layer — orchestrates a single business operation.
 * Use cases are thin: validate input (via DTO), call domain/repo, return response.
 * Keep business rules in the domain service, not here.
 */
import { Service, Inject } from '@forinda/kickjs'
import type { CreateUserDTO } from '../dtos/create-user.dto'
import type { UserResponseDTO } from '../dtos/user-response.dto'
import { USER_REPOSITORY, type UserRepository } from '@/modules/users/user.repository'

@Service()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(dto: CreateUserDTO): Promise<UserResponseDTO> {
    return this.repo.create(dto)
  }
}
