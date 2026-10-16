import { HttpException, type ApiQueryParamsConfig } from '@forinda/kickjs'

type Filter = { field: string; operator: string; value: string }
type Sort = { field: string; direction: 'asc' | 'desc' }

/**
 * 400 unless `field` is on the allowlist. A field starting with `$` would be a
 * query operator (`$where`, `$expr`) and one with a `.` reaches into nested
 * paths, so neither passes even if someone lists it by mistake.
 */
export function assertQueryField(field: string, allowed: readonly string[] = [], kind: string) {
  if (field.startsWith('$') || field.includes('.') || !allowed.includes(field)) {
    throw HttpException.badRequest(`Cannot ${kind} on '${field}'`)
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One filter item → a Mongo condition. Values match literally, never as a regex. */
function condition({ operator, value }: Filter): unknown {
  switch (operator) {
    case 'neq':
      return { $ne: value }
    case 'gt':
      return { $gt: value }
    case 'gte':
      return { $gte: value }
    case 'lt':
      return { $lt: value }
    case 'lte':
      return { $lte: value }
    case 'between': {
      const [min, max] = value.split(',')
      return { $gte: min, $lte: max }
    }
    case 'in':
      return { $in: value.split(',') }
    case 'contains':
      return { $regex: escapeRegex(value), $options: 'i' }
    case 'starts':
      return { $regex: `^${escapeRegex(value)}`, $options: 'i' }
    case 'ends':
      return { $regex: `${escapeRegex(value)}$`, $options: 'i' }
    default:
      return value
  }
}

/**
 * A parsed list query → Mongo filter + sort. Every filter/sort field must be in
 * `config` (400 otherwise), and `scope` (tenant, visibility, parent id) is
 * AND-ed with the caller's filters, so no filter can widen or replace it.
 */
export function buildMongoQuery(
  parsed: { filters?: Filter[]; sort?: Sort[]; search?: string },
  config: ApiQueryParamsConfig,
  scope: Record<string, unknown> = {},
) {
  const { filters = [], sort = [], search = '' } = parsed
  const clauses: Record<string, unknown>[] = [scope]
  for (const filter of filters) {
    assertQueryField(filter.field, config.filterable, 'filter')
    clauses.push({ [filter.field]: condition(filter) })
  }
  if (search && config.searchable?.length) clauses.push({ $text: { $search: search } })

  const mongoSort: Record<string, 1 | -1> = {}
  for (const { field, direction } of sort) {
    assertQueryField(field, config.sortable, 'sort')
    mongoSort[field] = direction === 'asc' ? 1 : -1
  }
  if (Object.keys(mongoSort).length === 0) mongoSort.createdAt = -1

  return { filter: { $and: clauses }, sort: mongoSort }
}
