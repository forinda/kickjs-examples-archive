// Turns a parsed query string (`ctx.paginate` / `ctx.qs`) into Drizzle
// where / orderBy / limit / offset — the slice of the removed
// @forinda/kickjs-drizzle `DrizzleQueryAdapter` this app uses.
import {
  and,
  asc,
  between,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm'
import {
  HttpException,
  type ColumnApiQueryParamsConfig,
  type FilterItem,
  type ParsedQuery,
  type ParseQueryOptions,
  type RequestContext,
} from '@forinda/kickjs'

/** Filterable / sortable / searchable fields mapped to Drizzle columns. */
export type DrizzleQueryParamsConfig = ColumnApiQueryParamsConfig

function coerce(value: string, column: AnyColumn): unknown {
  switch (column.dataType) {
    case 'boolean':
      return value === 'true' || value === '1'
    case 'number':
    case 'bigint': {
      const n = Number(value)
      return Number.isNaN(n) ? value : n
    }
    case 'date': {
      const d = new Date(value)
      return Number.isNaN(d.getTime()) ? value : d
    }
    default:
      return value
  }
}

/**
 * The column for `field`, or 400. Only the config's own keys pass (never an
 * inherited one like `constructor`), and a `$` or `.` field never does.
 */
function columnFor(map: Record<string, AnyColumn>, field: string, kind: string): AnyColumn {
  if (field.startsWith('$') || field.includes('.') || !Object.hasOwn(map, field)) {
    throw HttpException.badRequest(`Cannot ${kind} on '${field}'`)
  }
  return map[field]
}

/** LIKE wildcards in a filter value match literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&')

function filterToSql(column: AnyColumn, f: FilterItem): SQL | undefined {
  const v = coerce(f.value, column)
  switch (f.operator) {
    case 'neq':
      return ne(column, v)
    case 'gt':
      return gt(column, v)
    case 'gte':
      return gte(column, v)
    case 'lt':
      return lt(column, v)
    case 'lte':
      return lte(column, v)
    case 'contains':
      return ilike(column, `%${escapeLike(f.value)}%`)
    case 'starts':
      return ilike(column, `${escapeLike(f.value)}%`)
    case 'ends':
      return ilike(column, `%${escapeLike(f.value)}`)
    case 'in':
      return inArray(
        column,
        f.value.split(',').map((s) => coerce(s.trim(), column)),
      )
    case 'between': {
      const [min, max] = f.value.split(',').map((s) => coerce(s.trim(), column))
      return between(column, min, max)
    }
    default:
      return eq(column, v)
  }
}

export const queryAdapter = {
  buildFromColumns(
    parsed: ParsedQuery,
    config: DrizzleQueryParamsConfig & { baseCondition?: SQL },
  ) {
    // The route's scope (baseCondition) is AND-ed with every filter, so none can widen it.
    const conditions: (SQL | undefined)[] = [config.baseCondition]
    for (const f of parsed.filters ?? []) {
      conditions.push(filterToSql(columnFor(config.columns, f.field, 'filter'), f))
    }
    if (parsed.search && config.searchColumns?.length) {
      const term = `%${escapeLike(parsed.search)}%`
      conditions.push(or(...config.searchColumns.map((c) => ilike(c, term))))
    }
    const sortMap = config.sortable ?? config.columns
    return {
      where: and(...conditions),
      orderBy: (parsed.sort ?? []).map((s) => {
        const column = columnFor(sortMap, s.field, 'sort')
        return s.direction === 'desc' ? desc(column) : asc(column)
      }),
      limit: parsed.pagination.limit,
      offset: parsed.pagination.offset,
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
  config: DrizzleQueryParamsConfig,
) {
  ctx.qs(config, STRICT)
  return ctx.paginate(fetcher, config)
}
