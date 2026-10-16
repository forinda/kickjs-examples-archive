/**
 * Query field configurations for ctx.paginate() / ctx.qs() / @ApiQueryParams.
 * Centralized so Swagger docs and controllers stay in sync.
 *
 * Each config is an allowlist: every one sets `filterable` (an omitted list
 * would let the parser pass any field through), and `paginate()` below answers
 * a field outside it with 400. The repositories check the same lists again.
 */

import {
  HttpException,
  type ApiQueryParamsConfig,
  type ParsedQuery,
  type ParseQueryOptions,
  type RequestContext,
} from '@forinda/kickjs'

const STRICT: ParseQueryOptions = {
  onReject: ({ kind, field, reason }) => {
    if (reason !== 'truncated') throw HttpException.badRequest(`Cannot ${kind} on '${field}'`)
  },
}

/** `ctx.paginate`, except a filter/sort field outside `config` is a 400 instead of silently dropped. */
export function paginate<T>(
  ctx: RequestContext,
  fetcher: (parsed: ParsedQuery) => Promise<{ data: T[]; total: number }>,
  config: ApiQueryParamsConfig,
) {
  ctx.qs(config, STRICT)
  return ctx.paginate(fetcher, config)
}

export const TASK_QUERY_CONFIG: ApiQueryParamsConfig = {
  // No projectId: tasks are listed per project from the route, which the access guard checks.
  filterable: ['status', 'priority', 'assigneeId', 'labelId'],
  sortable: ['createdAt', 'title', 'priority', 'dueDate', 'orderIndex'],
  searchable: ['title', 'description'],
}

// Public profile fields only — never passwordHash, a token or anything a prefix match could leak.
export const USER_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: ['_id', 'firstName', 'lastName', 'email'],
  sortable: ['createdAt', 'email', 'firstName', 'lastName'],
  searchable: ['firstName', 'lastName', 'email'],
}

export const NOTIFICATION_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: ['type', 'isRead'],
  sortable: ['createdAt'],
}

export const ACTIVITY_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: ['action'],
  sortable: ['createdAt'],
}

export const LABEL_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['name', 'createdAt'],
  searchable: ['name'],
}

export const CHANNEL_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['name', 'createdAt'],
  searchable: ['name', 'description'],
}

export const WORKSPACE_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['name', 'createdAt'],
  searchable: ['name', 'description'],
}

export const PROJECT_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['name', 'createdAt', 'key'],
  searchable: ['name', 'description', 'key'],
}

export const COMMENT_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['createdAt'],
}

export const ATTACHMENT_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: [],
  sortable: ['createdAt', 'fileName'],
  searchable: ['fileName'],
}

export const MEMBER_QUERY_CONFIG: ApiQueryParamsConfig = {
  filterable: ['role'],
  sortable: ['joinedAt'],
}
