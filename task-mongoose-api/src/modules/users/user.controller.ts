import {
  Controller,
  Get,
  Patch,
  ApiQueryParams,
  Autowired,
  Inject,
  type RequestContext,
} from '@forinda/kickjs'
import { RequireRole } from '@/guards/require-role.guard'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { updateProfileSchema } from './user.dto'
import { USER_QUERY_CONFIG } from '@/shared/query-configs'
import { UsersService } from './user.service'
import { USER_REPOSITORY, type UserRepository } from './user.repository'
import { successResponse } from '@/shared/api-response'
import { z } from 'zod'
import { getUser } from '@/auth'

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  @Autowired() private usersService!: UsersService
  @Inject(USER_REPOSITORY) private userRepo!: UserRepository

  @Get('/me')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(ctx: RequestContext) {
    const user = getUser(ctx)
    const result = await this.usersService.getProfile(user.id)
    return successResponse(result)
  }

  @Patch('/me', { body: updateProfileSchema })
  @ApiOperation({ summary: 'Update the current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(ctx: RequestContext) {
    const user = getUser(ctx)
    const result = await this.usersService.updateProfile(user.id, ctx.body)
    return successResponse(result)
  }

  @Get('/:id', { params: z.object({ id: z.string() }) })
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getById(ctx: RequestContext) {
    const result = await this.usersService.getProfile(ctx.params.id)
    return successResponse(result)
  }

  @Get('/')
  @RequireRole({ roles: ['superadmin'] })
  @ApiOperation({ summary: 'List all users (superadmin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires superadmin role' })
  @ApiQueryParams(USER_QUERY_CONFIG)
  async list(ctx: RequestContext) {
    return ctx.paginate((parsed) => this.userRepo.findPaginated(parsed), USER_QUERY_CONFIG)
  }
}
