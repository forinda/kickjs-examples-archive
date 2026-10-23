import { Inject, Service } from '@forinda/kickjs'
import { APP_DB } from '@/adapters/db.adapter'
import type { AppDb } from '@/db/client'

@Service()
export class CategoriesService {
  @Inject(APP_DB) private db!: AppDb

  list(userId: number) {
    return this.db
      .selectFrom('categories')
      .leftJoin('tasks', 'tasks.categoryId', 'categories.id')
      .select(({ fn }) => [
        'categories.id',
        'categories.name',
        'categories.color',
        fn.count<number>('tasks.id').as('taskCount'),
      ])
      .where('categories.userId', '=', userId)
      .groupBy('categories.id')
      .orderBy('categories.name')
      .execute()
  }

  async exists(userId: number, name: string) {
    const row = await this.db
      .selectFrom('categories')
      .select('id')
      .where('userId', '=', userId)
      .where('name', '=', name)
      .executeTakeFirst()
    return !!row
  }

  async create(userId: number, input: { name: string; color: string }) {
    await this.db
      .insertInto('categories')
      .values({ userId, ...input })
      .execute()
  }

  async remove(userId: number, id: number) {
    const res = await this.db
      .deleteFrom('categories')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst()
    return Number(res.numDeletedRows) > 0
  }
}
