import type { ParsedQuery } from '@forinda/kickjs'

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
  build(parsed: ParsedQuery, config: { searchColumns?: string[] } = {}): PrismaQuery {
    const and: Record<string, unknown>[] = parsed.filters.map((f) =>
      filterClause(f.field, f.operator, f.value),
    )
    if (parsed.search && config.searchColumns?.length) {
      and.push({
        OR: config.searchColumns.map((c) => ({
          [c]: { contains: parsed.search, mode: 'insensitive' },
        })),
      })
    }
    const orderBy = parsed.sort.map((s) => ({ [s.field]: s.direction }))
    return {
      where: and.length === 0 ? undefined : and.length === 1 ? and[0] : { AND: and },
      orderBy: orderBy.length ? orderBy : undefined,
      skip: parsed.pagination.offset,
      take: parsed.pagination.limit,
    }
  },
}
