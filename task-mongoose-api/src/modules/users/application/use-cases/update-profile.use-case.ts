import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/constants/error-codes'
import type { UpdateProfileDto } from '../dtos/update-profile.dto'
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/modules/users/infrastructure/repositories/user.repository'

@Service()
export class UpdateProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private userRepo: UserRepository) {}

  async execute(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.update(userId, dto)
    if (!user) {
      throw HttpException.notFound(ErrorCode.USER_NOT_FOUND)
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
    }
  }
}
