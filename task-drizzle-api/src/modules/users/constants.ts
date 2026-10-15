import type { DrizzleQueryParamsConfig } from '@/shared/infrastructure/query-adapter'
import { users } from '@/db/schema'

export const USER_QUERY_CONFIG: DrizzleQueryParamsConfig = {
  columns: {
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    globalRole: users.globalRole,
    isActive: users.isActive,
  },
  sortable: {
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    createdAt: users.createdAt,
  },
  searchColumns: [users.firstName, users.lastName, users.email],
}
