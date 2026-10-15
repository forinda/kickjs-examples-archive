import { HttpException, type RequestContext } from '@forinda/kickjs'

export interface AuthUser {
  id: string
  email: string
  globalRole: string
}

// Set by the auth middleware.
declare module '@forinda/kickjs' {
  interface ContextMeta {
    user: AuthUser
  }
}

export function getUser(ctx: RequestContext): AuthUser {
  const user = ctx.get('user')
  if (!user) {
    throw HttpException.unauthorized('Authentication required')
  }

  return user
}
