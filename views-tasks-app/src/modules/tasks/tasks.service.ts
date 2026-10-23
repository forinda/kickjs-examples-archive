import { Inject, Service } from '@forinda/kickjs'
import { APP_DB } from '@/adapters/db.adapter'
import type { AppDb } from '@/db/client'
import type { TaskInput } from './tasks.schemas'

export interface TaskFilter {
  /** A category id, `'none'` for uncategorised, or undefined for all. */
  category?: number | 'none'
  status: 'all' | 'open' | 'done'
}

@Service()
export class TasksService {
  @Inject(APP_DB) private db!: AppDb

  list(userId: number, filter: TaskFilter) {
    let q = this.db
      .selectFrom('tasks')
      .leftJoin('categories', 'categories.id', 'tasks.categoryId')
      .select([
        'tasks.id',
        'tasks.title',
        'tasks.notes',
        'tasks.done',
        'tasks.dueDate',
        'tasks.createdAt',
        'tasks.categoryId',
        'categories.name as categoryName',
        'categories.color as categoryColor',
      ])
      .where('tasks.userId', '=', userId)
    if (filter.category === 'none') q = q.where('tasks.categoryId', 'is', null)
    else if (filter.category) q = q.where('tasks.categoryId', '=', filter.category)
    if (filter.status !== 'all') q = q.where('tasks.done', '=', filter.status === 'done')
    return q.orderBy('tasks.done').orderBy('tasks.createdAt', 'desc').execute()
  }

  find(userId: number, id: number) {
    return this.db
      .selectFrom('tasks')
      .selectAll()
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst()
  }

  async create(userId: number, input: TaskInput) {
    await this.db
      .insertInto('tasks')
      .values({ userId, ...input, categoryId: await this.ownCategory(userId, input.categoryId) })
      .execute()
  }

  async update(userId: number, id: number, input: TaskInput) {
    const res = await this.db
      .updateTable('tasks')
      .set({ ...input, categoryId: await this.ownCategory(userId, input.categoryId) })
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst()
    return Number(res.numUpdatedRows) > 0
  }

  async toggle(userId: number, id: number) {
    const task = await this.find(userId, id)
    if (!task) return undefined
    await this.db.updateTable('tasks').set({ done: !task.done }).where('id', '=', id).execute()
    return !task.done
  }

  async remove(userId: number, id: number) {
    const res = await this.db
      .deleteFrom('tasks')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst()
    return Number(res.numDeletedRows) > 0
  }

  /** A category id only when it's this user's: another user's id is dropped. */
  private async ownCategory(userId: number, id: number | null) {
    if (!id) return null
    const row = await this.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst()
    return row?.id ?? null
  }
}
