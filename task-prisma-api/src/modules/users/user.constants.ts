import type { QueryParamsConfig } from '@forinda/kickjs'

// Public profile fields only — never passwordHash or anything a prefix match could leak.
export const USER_QUERY_CONFIG: QueryParamsConfig = {
  filterable: ['id', 'email', 'firstName', 'lastName'],
  sortable: ['firstName', 'lastName', 'email', 'createdAt'],
  searchable: ['firstName', 'lastName', 'email'],
}
