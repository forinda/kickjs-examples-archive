export interface UserResponseDTO {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  globalRole: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}
