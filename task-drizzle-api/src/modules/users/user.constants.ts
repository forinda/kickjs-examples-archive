import type { DrizzleQueryParamsConfig } from '@/shared/query-adapter'
import { users } from '@/db/schema'

// Public profile fields only — never passwordHash or anything a prefix match could leak.
export const USER_QUERY_CONFIG: DrizzleQueryParamsConfig = {
  columns: {
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
  },
  sortable: {
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    createdAt: users.createdAt,
  },
  searchColumns: [users.firstName, users.lastName, users.email],
}
