import {
  HttpException,
  type ParsedQuery,
  type ParseQueryOptions,
  type QueryParamsConfig,
  type RequestContext,
} from '@forinda/kickjs'

/**
 * Translates `ctx.qs()` output (filters / sort / search / pagination) into
 * Prisma `findMany` args. Local replacement for the removed
 * `PrismaQueryAdapter` from `@forinda/kickjs-prisma`.
 */
export interface PrismaQuery {
  where?: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>[]
  skip: number
  take: number
}

function coerce(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  const num = Number(value)
  return value.trim() !== '' && !Number.isNaN(num) ? num : value
}

/**
 * 400 unless `field` is on the allowlist. A `$` field or a dotted path never
 * passes, and neither does anything not listed — Prisma would happily filter
 * on `passwordHash` or walk a relation.
 */
function assertField(field: string, allowed: readonly string[] = [], kind: string) {
  if (field.startsWith('$') || field.includes('.') || !allowed.includes(field)) {
    throw HttpException.badRequest(`Cannot ${kind} on '${field}'`)
  }
}

function filterClause(field: string, operator: string, value: string): Record<string, unknown> {
  switch (operator) {
    case 'neq':
      return { [field]: { not: coerce(value) } }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return { [field]: { [operator]: coerce(value) } }
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } }
    case 'starts':
      return { [field]: { startsWith: value, mode: 'insensitive' } }
    case 'ends':
      return { [field]: { endsWith: value, mode: 'insensitive' } }
    case 'in':
      return { [field]: { in: value.split(',').map((v) => coerce(v.trim())) } }
    case 'between': {
      const [gte, lte] = value.split(',').map((v) => coerce(v.trim()))
      return { [field]: { gte, lte } }
    }
    default:
      return { [field]: { equals: coerce(value) } }
  }
}

export const queryAdapter = {
  /**
   * Every filter/sort field must be in `config` (400 otherwise). Callers AND
   * the result's `where` with their scope, so no filter can widen it.
   */
  build(parsed: ParsedQuery, config: QueryParamsConfig): PrismaQuery {
    const and: Record<string, unknown>[] = (parsed.filters ?? []).map((f) => {
      assertField(f.field, config.filterable, 'filter')
      return filterClause(f.field, f.operator, f.value)
    })
    if (parsed.search && config.searchable?.length) {
      and.push({
        OR: config.searchable.map((c) => ({
          [c]: { contains: parsed.search, mode: 'insensitive' },
        })),
      })
    }
    const orderBy = (parsed.sort ?? []).map((s) => {
      assertField(s.field, config.sortable, 'sort')
      return { [s.field]: s.direction }
    })
    return {
      where: and.length === 0 ? undefined : and.length === 1 ? and[0] : { AND: and },
      orderBy: orderBy.length ? orderBy : undefined,
      skip: parsed.pagination.offset,
      take: parsed.pagination.limit,
    }
  },
}

const STRICT: ParseQueryOptions = {
  onReject: ({ kind, field, reason }) => {
    if (reason !== 'truncated') throw HttpException.badRequest(`Cannot ${kind} on '${field}'`)
  },
}

/** `ctx.paginate`, except a filter/sort field outside `config` is a 400 instead of silently dropped. */
export function paginate<T>(
  ctx: RequestContext,
  fetcher: (parsed: ParsedQuery) => Promise<{ data: T[]; total: number }>,
  config: QueryParamsConfig,
) {
  ctx.qs(config, STRICT)
  return ctx.paginate(fetcher, config)
}
