export interface CurrentUser {
  id: number
  email: string
}

declare module '@forinda/kickjs' {
  interface SessionData {
    userId?: number
  }
  interface ContextMeta {
    user: CurrentUser
  }
}
