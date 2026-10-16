import { Service, Inject, HttpException } from '@forinda/kickjs'
import { ErrorCode } from '@/shared/error-codes'
import type { UpdateProfileDto } from './user.dto'
import { USER_REPOSITORY, type UserRepository } from './user.repository'

@Service()
export class UsersService {
  constructor(@Inject(USER_REPOSITORY) private userRepo: UserRepository) {}

  /** `userId`'s profile as `viewerId` may see it — themselves or a workspace teammate, else 404. */
  async getProfile(userId: string, viewerId = userId) {
    const user = await this.userRepo.findVisibleById(userId, viewerId)
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
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
