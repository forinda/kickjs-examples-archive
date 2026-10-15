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
import type { ColumnApiQueryParamsConfig, FilterItem, ParsedQuery } from '@forinda/kickjs'

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
      return ilike(column, `%${f.value}%`)
    case 'starts':
      return ilike(column, `${f.value}%`)
    case 'ends':
      return ilike(column, `%${f.value}`)
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
    const conditions: (SQL | undefined)[] = [config.baseCondition]
    for (const f of parsed.filters) {
      const column = config.columns[f.field]
      if (column) conditions.push(filterToSql(column, f))
    }
    if (parsed.search && config.searchColumns?.length) {
      conditions.push(or(...config.searchColumns.map((c) => ilike(c, `%${parsed.search}%`))))
    }
    const sortMap = config.sortable ?? config.columns
    return {
      where: and(...conditions),
      orderBy: parsed.sort
        .filter((s) => sortMap[s.field])
        .map((s) => (s.direction === 'desc' ? desc(sortMap[s.field]) : asc(sortMap[s.field]))),
      limit: parsed.pagination.limit,
      offset: parsed.pagination.offset,
    }
  },
}
