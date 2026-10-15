import { Service, Inject } from '@forinda/kickjs'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'

@Service()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private userRepo: UserRepository) {}

  async execute(parsed: any) {
    return this.userRepo.findPaginated(parsed)
  }
}
