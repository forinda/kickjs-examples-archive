import { reply, Controller, Post, Autowired, Inject, type RequestContext } from '@forinda/kickjs'
import { Public } from '@/auth'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@forinda/kickjs-swagger'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.dto'
import { AuthService } from './auth.service'
import { REFRESH_TOKEN_REPOSITORY, type RefreshTokenRepository } from './refresh-token.repository'
import { successResponse } from '@/shared/api-response'

@ApiTags('Auth')
@Controller()
export class AuthController {
  @Autowired() private authService!: AuthService
  @Inject(REFRESH_TOKEN_REPOSITORY) private refreshTokenRepo!: RefreshTokenRepository

  @Post('/register', { body: registerSchema })
  @Public
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(ctx: RequestContext) {
    const result = await this.authService.register(ctx.body)
    return reply.created(successResponse(result, 'Registration successful'))
  }

  @Post('/login', { body: loginSchema })
  @Public
  @ApiOperation({ summary: 'Log in with credentials' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(ctx: RequestContext) {
    const result = await this.authService.login(ctx.body)
    return successResponse(result, 'Login successful')
  }

  @Post('/refresh', { body: refreshTokenSchema })
  @Public
  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(ctx: RequestContext) {
    const result = await this.authService.refresh(ctx.body)
    return successResponse(result)
  }

  @Post('/logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(ctx: RequestContext) {
    const { refreshToken } = ctx.body
    await this.refreshTokenRepo.deleteByToken(refreshToken)
    return successResponse(null, 'Logged out successfully')
  }
}
